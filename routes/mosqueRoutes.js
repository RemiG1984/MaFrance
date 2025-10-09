
const express = require("express");
const router = express.Router();
const { createDbHandler } = require("../middleware/errorHandler");
const { cacheMiddleware } = require("../middleware/cache");
const {
    validateOptionalDepartement,
    validateOptionalCOG,
} = require("../middleware/validate");

// GET /api/mosques - Get all mosques with optional filtering
router.get(
    "/",
    [validateOptionalDepartement, validateOptionalCOG, cacheMiddleware((req) => `mosques:${req.query.dept || 'all'}:${req.query.cog || 'all'}:${req.query.cursor || 0}:${req.query.limit || 20}`)],
    (req, res, next) => {
        const db = req.app.locals.db;
        const dbHandler = createDbHandler(res);
        const { dept, cog, cursor, limit = "20" } = req.query;
        const pageLimit = Math.min(parseInt(limit), 2000);
        const offset = cursor ? parseInt(cursor) : 0;

        // Prevent simultaneous dept and cog
        if (dept && cog) {
            return res
                .status(400)
                .json({ error: "Cannot specify both dept and cog" });
        }

    let dataSql = `
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
        dataSql += " WHERE " + conditions.join(" AND ");
    }

    dataSql += " ORDER BY name ASC, id ASC LIMIT ? OFFSET ?";
    params.push(pageLimit + 1);
    params.push(offset);

    db.all(dataSql, params, (err, rows) => {
        dbHandler(err);
        if (err) return;

        const hasMore = rows.length > pageLimit;
        const mosques = hasMore ? rows.slice(0, pageLimit) : rows;
        const nextCursor =
            hasMore && mosques.length > 0
                ? mosques[mosques.length - 1].id
                : null;

        res.json({
            list: mosques,
            pagination: {
                hasMore: hasMore,
                nextCursor: nextCursor,
                limit: pageLimit,
            },
        });
    });
});

// GET /api/mosques/closest - Get closest mosques to coordinates
router.get('/closest', cacheMiddleware((req) => `mosques:closest:${req.query.lat}:${req.query.lng}:${req.query.limit || 5}`), (req, res, next) => {
    const db = req.app.locals.db;
    const dbHandler = createDbHandler(res);
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
        dbHandler(err);
        if (err) return;

        const results = rows.map(row => ({
            ...row,
            distance_km: Math.round(row.distance_km * 100) / 100
        }));

        res.json({ list: results });
    });
});


module.exports = router;
