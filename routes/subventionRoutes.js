
const express = require('express');
const router = express.Router();
const { param, validationResult } = require('express-validator');
const { handleDbError } = require('../middleware/errorHandler');
const { validateDepartementParam, validateCOGParam, validatePagination } = require('../middleware/validate');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Validate country parameter
const validateCountryParam = [
    param('country')
        .notEmpty()
        .withMessage('Pays requis')
        .isIn(['france', 'France', 'FRANCE'])
        .withMessage('Pays doit être France'),
    handleValidationErrors,
];

// Get country subventions
router.get('/country/:country', validateCountryParam, (req, res) => {
    const db = req.app.locals.db;
    const { country } = req.params;

    const query = `
        SELECT subventions_data 
        FROM country_subventions 
        WHERE country = ?
    `;

    db.get(query, [country], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Données de subventions non trouvées pour ce pays' });
        }

        try {
            const subventions = JSON.parse(row.subventions_data);
            res.json({
                country,
                subventions
            });
        } catch (parseErr) {
            console.error('Erreur parsing JSON subventions pays:', parseErr);
            res.status(500).json({ error: 'Erreur de format des données de subventions' });
        }
    });
});

// Get department subventions
router.get('/departement/:dept', validateDepartementParam, (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;

    const query = `
        SELECT subventions_data 
        FROM department_subventions 
        WHERE dep = ?
    `;

    db.get(query, [dept], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Données de subventions non trouvées pour ce département' });
        }

        try {
            const subventions = JSON.parse(row.subventions_data);
            res.json({
                departement: dept,
                subventions
            });
        } catch (parseErr) {
            console.error('Erreur parsing JSON subventions département:', parseErr);
            res.status(500).json({ error: 'Erreur de format des données de subventions' });
        }
    });
});

// Get commune subventions
router.get('/commune/:cog', validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;

    const query = `
        SELECT subventions_data 
        FROM commune_subventions 
        WHERE COG = ?
    `;

    db.get(query, [cog], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Données de subventions non trouvées pour cette commune' });
        }

        try {
            const subventions = JSON.parse(row.subventions_data);
            res.json({
                commune: cog,
                subventions
            });
        } catch (parseErr) {
            console.error('Erreur parsing JSON subventions commune:', parseErr);
            res.status(500).json({ error: 'Erreur de format des données de subventions' });
        }
    });
});

module.exports = router;
