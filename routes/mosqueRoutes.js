
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { createDbHandler } = require("../middleware/errorHandler");
const { cacheMiddleware } = require("../middleware/cache");
const { validateOptionalCOG, validateOptionalDepartement } = require("../middleware/validate");

// GET /api/mosques - Get all mosques with optional filtering
router.get("/", validateOptionalDepartement, validateOptionalCOG, cacheMiddleware((req) => `mosques:${req.query.dept || 'all'}:${req.query.cog || 'all'}:${req.query.limit || '5000'}`), (req, res, next) => {
    const { dept, cog, limit = "5000" } = req.query;
    const queryLimit = Math.min(parseInt(limit), 5000);

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
    if (cog) {
        conditions.push("cog = ?");
        params.push(cog);
    }
    
    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += ` ORDER BY name ASC LIMIT ?`;
    params.push(queryLimit);
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            createDbHandler(res, next)(err);
            return;
        }

        res.json({
            list: rows,
            total: rows.length
        });
    });
});

// GET /api/mosques/closest - Get closest mosques to coordinates
router.get('/closest', cacheMiddleware((req) => `mosques:closest:${req.query.lat}:${req.query.lng}:${req.query.limit || 5}`), (req, res, next) => {
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
        if (err) {
            createDbHandler(res, next)(err);
            return;
        }

        const results = rows.map(row => ({
            ...row,
            distance_km: Math.round(row.distance_km * 100) / 100
        }));

        res.json({ list: results });
    });
});


module.exports = router;
