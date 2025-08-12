const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { validateDepartementParam, validateCOGParam, validatePagination } = require('../middleware/validate');

// Centralized error handler for database queries
const handleDbError = (err, res) => {
    console.error("Database error:", err.message);
    res.status(500).json({
        error: "Erreur lors de la requête à la base de données",
        details: err.message,
    });
};

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Get migrant centers by commune COG
router.get('/commune/:cog', validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;
    const { cursor, limit = '20' } = req.query;
    const pageLimit = Math.min(parseInt(limit), 100);

    let query = `
        SELECT *, rowid
        FROM migrant_centers 
        WHERE COG = ?
    `;
    const params = [cog];

    if (cursor) {
        query += " AND rowid > ?";
        params.push(cursor);
    }

    query += " ORDER BY gestionnaire_centre, rowid ASC LIMIT ?";
    params.push(pageLimit + 1);

    db.all(query, params, (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const hasMore = rows.length > pageLimit;
        const centers = hasMore ? rows.slice(0, pageLimit) : rows;
        const nextCursor = hasMore && centers.length > 0 ? centers[centers.length - 1].rowid : null;

        const migrants = centers.map(({ rowid, ...row }) => ({
            type_centre: row.type_centre || row.typeCentre,
            gestionnaire_centre: row.gestionnaire_centre || row.gestionnaireCentre,
            adresse: row.adresse,
            places: row.places,
            COG: row.COG,
            //latitude: row.latitude,
            //longitude: row.longitude,
        }));

        res.json({
            list: migrants,
            pagination: {
                hasMore: hasMore,
                nextCursor: nextCursor,
                limit: pageLimit
            }
        });
    });
});

// Get migrant centers by department
router.get('/departement/:dept', [validateDepartementParam, validatePagination], (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;
    const { cursor, limit = '20' } = req.query;
    const pageLimit = Math.min(parseInt(limit), 100);

    let query = `
        SELECT *, rowid
        FROM migrant_centers 
        WHERE departement = ?
    `;
    const params = [dept];

    if (cursor) {
        query += " AND rowid > ?";
        params.push(cursor);
    }

    query += " ORDER BY COG, gestionnaire_centre, rowid ASC LIMIT ?";
    params.push(pageLimit + 1);

    db.all(query, params, (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const hasMore = rows.length > pageLimit;
        const centers = hasMore ? rows.slice(0, pageLimit) : rows;
        const nextCursor = hasMore && centers.length > 0 ? centers[centers.length - 1].rowid : null;

        const migrants = centers.map(({ rowid, ...row }) => ({
            type_centre: row.type_centre || row.typeCentre,
            gestionnaire_centre: row.gestionnaire_centre || row.gestionnaireCentre,
            adresse: row.adresse,
            places: row.places,
            COG: row.COG,
            //latitude: row.latitude,
            //longitude: row.longitude,
        }));

        res.json({
            list: migrants,
            pagination: {
                hasMore: hasMore,
                nextCursor: nextCursor,
                limit: pageLimit
            }
        });
    });
});

module.exports = router;