
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
    const error = new Error("Erreur lors de la requête à la base de données");
    error.status = 500;
    error.details = err.message;
    return next(error);
};

// GET /api/mosques - Get all mosques with optional filtering
router.get("/", (req, res, next) => {
    const { dept, commune, limit = "1000" } = req.query;
    const queryLimit = Math.min(parseInt(limit), 2000);

    let sql = `
        SELECT id, name, address, latitude, longitude, commune, departement, cog
        FROM mosques
    `;
    const conditions = [];
    const params = [];

    if (dept) {
        conditions.push("departement = ?");
        params.push(dept);
    }
    if (commune) {
        conditions.push("LOWER(commune) LIKE LOWER(?)");
        params.push(`%${commune}%`);
    }

    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += ` ORDER BY name ASC LIMIT ?`;
    params.push(queryLimit);

    db.all(sql, params, (err, rows) => {
        if (err) return handleDbError(err, next);

        res.json({ 
            list: rows,
            total: rows.length
        });
    });
});

// GET /api/mosques/closest - Get closest mosques to coordinates
router.get('/closest', (req, res, next) => {
    const { lat, lng, limit = 5 } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const maxResults = Math.min(parseInt(limit), 20);

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Calculate distance using Haversine formula in SQL
    const sql = `
        SELECT 
            *,
            (
                6371 * 2 * ASIN(
                    SQRT(
                        POWER(SIN((? - latitude) * PI() / 180 / 2), 2) +
                        COS(? * PI() / 180) * COS(latitude * PI() / 180) *
                        POWER(SIN((? - longitude) * PI() / 180 / 2), 2)
                    )
                )
            ) as distance_km
        FROM mosques
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.all(sql, [latitude, latitude, longitude, maxResults], (err, rows) => {
        if (err) return handleDbError(err, next);

        const results = rows.map(row => ({
            ...row,
            distance_km: Math.round(row.distance_km * 100) / 100
        }));

        res.json({ list: results });
    });
});

// GET /api/mosques/departement/:dept - Get mosques by department
router.get("/departement/:dept", (req, res, next) => {
    const { dept } = req.params;
    const { limit = "100" } = req.query;
    const queryLimit = Math.min(parseInt(limit), 500);

    const sql = `
        SELECT id, name, address, latitude, longitude, commune, departement, cog
        FROM mosques
        WHERE departement = ?
        ORDER BY commune ASC, name ASC
        LIMIT ?
    `;

    db.all(sql, [dept, queryLimit], (err, rows) => {
        if (err) return handleDbError(err, next);

        res.json({ 
            list: rows,
            departement: dept,
            total: rows.length
        });
    });
});

// GET /api/mosques/commune/:cog - Get mosques by commune
router.get("/commune/:cog", (req, res, next) => {
    const { cog } = req.params;
    const { limit = "50" } = req.query;
    const queryLimit = Math.min(parseInt(limit), 200);

    const sql = `
        SELECT id, name, address, latitude, longitude, commune, departement, cog
        FROM mosques
        WHERE cog = ?
        ORDER BY name ASC
        LIMIT ?
    `;

    db.all(sql, [cog, queryLimit], (err, rows) => {
        if (err) return handleDbError(err, next);

        res.json({ 
            list: rows,
            commune_cog: cog,
            total: rows.length
        });
    });
});

module.exports = router;
