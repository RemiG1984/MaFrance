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

    const query = `
        SELECT * 
        FROM migrant_centers 
        WHERE COG = ?
        ORDER BY gestionnaire_centre
    `;

    db.all(query, [cog], (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Aucun centre de migrants trouvé pour cette commune' });
        }

        res.json({
            COG: cog,
            centers: rows.map(row => ({
                type_centre: row.type_centre,
                gestionnaire_centre: row.gestionnaire_centre,
                adresse: row.adresse,
                places: row.places,
                //latitude: row.latitude,
                //longitude: row.longitude,
            }))
        });
    });
});

// Get migrant centers by department
router.get('/departement/:dept', [validateDepartementParam, validatePagination], (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT * 
        FROM migrant_centers 
        WHERE departement = ?
        ORDER BY COG, gestionnaire_centre
        LIMIT ? OFFSET ?
    `;

    db.all(query, [dept, parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const centers = rows.map(row => ({
            COG: row.COG,
            type_centre: row.type_centre,
            gestionnaire_centre: row.gestionnaire_centre,
            adresse: row.adresse,
            places: row.places,
            //latitude: row.latitude,
            //longitude: row.longitude,
        }));

        res.json({
            departement: dept,
            centers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: centers.length
            }
        });
    });
});

module.exports = router;