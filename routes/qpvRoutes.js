const express = require("express");
const router = express.Router();
const db = require("../config/db");
const fs = require('fs');
const path = require('path');
const {
    validateDepartement,
    validateOptionalCOG,
    validateSearchQuery,
    validatePagination,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
    const error = new Error("Erreur lors de la requête à la base de données");
    error.status = 500;
    error.details = err.message;
    return next(error);
};

// Base SQL select for QPV data
const baseQpvSelect = `
  SELECT rowid, COG, lib_com, codeQPV, lib_qp, popMuniQPV, indiceJeunesse, partPopEt, partPopImmi,
         nombre_logements_sociaux, taux_logements_sociaux,
         taux_d_emploi, taux_pauvrete_60, personnes_couvertes_CAF, allocataires_CAF, RSA_socle
  FROM qpv_data
`;

// GET /api/qpv - Get all QPV data with optional filtering and pagination
router.get(
    "/",
    [validateDepartement, validateOptionalCOG, validateSearchQuery, validatePagination],
    (req, res, next) => {
        const { dept = "", cog = "", commune = "", cursor, limit = "20" } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100);

        // Prevent simultaneous dept and cog
        if (dept && cog) {
            return res
                .status(400)
                .json({ error: "Cannot specify both dept and cog" });
        }

        let sql = baseQpvSelect;
        const conditions = [];
        const params = [];

        if (dept) {
            conditions.push("insee_dep = ?");
            params.push(dept);
        }
        if (cog) {
            conditions.push("COG = ?");
            params.push(cog);
        }
        if (commune) {
            conditions.push("LOWER(lib_com) LIKE LOWER(?)");
            params.push(`%${commune}%`);
        }

        // Add cursor condition for pagination (only for country-level requests without filters)
        if (cursor && !dept && !cog && !commune) {
            conditions.push("rowid > ?");
            params.push(parseInt(cursor));
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` ORDER BY rowid ASC LIMIT ?`;
        params.push(pageLimit + 1);

        db.all(sql, params, (err, rows) => {
            if (err) return handleDbError(err, next);

            const hasMore = rows.length > pageLimit;
            const qpvs = hasMore ? rows.slice(0, pageLimit) : rows;
            const nextCursor =
                hasMore && qpvs.length > 0
                    ? qpvs[qpvs.length - 1].rowid
                    : null;

            // If we have filters (dept, cog, commune), return simple array for backward compatibility
            if (dept || cog || commune) {
                res.json(qpvs.map(({ rowid, ...row }) => row));
            } else {
                // For country-level requests, return paginated format
                res.json({
                    list: qpvs.map(({ rowid, ...row }) => row),
                    pagination: {
                        hasMore: hasMore,
                        nextCursor: nextCursor,
                        limit: pageLimit,
                    },
                });
            }
        });
    },
);

// Get QPV GeoJSON data
router.get('/geojson', (req, res) => {
    try {
        const geoJsonPath = path.join(__dirname, '../setup/qpv2024_simplified.geojson');

        if (!fs.existsSync(geoJsonPath)) {
            return res.status(404).json({ error: 'QPV GeoJSON file not found' });
        }

        const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
        res.json({ geojson: geoJsonData });
    } catch (error) {
        console.error('Error reading QPV GeoJSON:', error);
        res.status(500).json({ error: 'Error reading QPV data' });
    }
});

// Get closest QPVs to coordinates
router.get('/closest', (req, res) => {
    const { lat, lng, limit = 5 } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const query = `
        SELECT 
            code_qp, lib_qp, insee_com, lib_com, insee_dep, lib_dep,
            latitude, longitude,
            ((latitude - ?) * (latitude - ?) + (longitude - ?) * (longitude - ?)) as distance_sq
        FROM qpv_coordinates 
        ORDER BY distance_sq ASC 
        LIMIT ?
    `;

    db.all(query, [lat, lat, lng, lng, parseInt(limit)], (err, rows) => {
        if (err) {
            console.error('Error fetching closest QPVs:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Calculate actual distance and format results
        const results = rows.map(row => ({
            ...row,
            distance: Math.sqrt(row.distance_sq) * 111.32 // Rough conversion to km
        }));

        res.json({ list: results });
    });
});

// GET /api/qpv/nearby - Get QPVs near coordinates
router.get("/nearby", (req, res, next) => {
    const { lat, lng, limit = "5" } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxResults = Math.min(parseInt(limit), 20);

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Calculate distance using Haversine formula in SQL
    const sql = `
        SELECT 
            qc.*,
            qd.popMuniQPV,
            qd.indiceJeunesse,
            qd.partPopEt,
            qd.partPopImmi,
            qd.taux_logements_sociaux,
            qd.taux_d_emploi,
            qd.taux_pauvrete_60,
            (
                6371 * 2 * ASIN(
                    SQRT(
                        POWER(SIN((? - qc.latitude) * PI() / 180 / 2), 2) +
                        COS(? * PI() / 180) * COS(qc.latitude * PI() / 180) *
                        POWER(SIN((? - qc.longitude) * PI() / 180 / 2), 2)
                    )
                )
            ) as distance_km
        FROM qpv_coordinates qc
        LEFT JOIN qpv_data qd ON qc.code_qp = qd.codeQPV
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.all(sql, [latitude, latitude, longitude, maxResults], (err, rows) => {
        if (err) return handleDbError(err, next);

        const qpvs = rows.map(row => ({
            code_qp: row.code_qp,
            lib_qp: row.lib_qp,
            commune: row.lib_com,
            departement: row.lib_dep,
            latitude: row.latitude,
            longitude: row.longitude,
            distance_km: Math.round(row.distance_km * 100) / 100,
            population: row.popMuniQPV,
            indice_jeunesse: row.indiceJeunesse,
            part_pop_etrangere: row.partPopEt,
            part_pop_immigree: row.partPopImmi,
            taux_logements_sociaux: row.taux_logements_sociaux,
            taux_emploi: row.taux_d_emploi,
            taux_pauvrete: row.taux_pauvrete_60
        }));

        res.json(qpvs);
    });
});


module.exports = router;