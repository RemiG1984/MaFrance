
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
        SELECT * 
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

        // Extract all fields except the country identifier
        const { country: countryField, ...subventions } = row;
        
        // Calculate total if needed
        const total_subventions_parHab = Object.values(subventions)
            .filter(val => typeof val === 'number' && !isNaN(val))
            .reduce((sum, val) => sum + val, 0);

        res.json({
            country,
            subventions: {
                ...subventions,
                total_subventions_parHab
            }
        });
    });
});

// Get department subventions
router.get('/departement/:dept', validateDepartementParam, (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;

    const query = `
        SELECT * 
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

        // Extract all fields except the department identifier
        const { dep: deptField, ...subventions } = row;
        
        // Calculate total if needed
        const total_subventions_parHab = Object.values(subventions)
            .filter(val => typeof val === 'number' && !isNaN(val))
            .reduce((sum, val) => sum + val, 0);

        res.json({
            departement: dept,
            subventions: {
                ...subventions,
                total_subventions_parHab
            }
        });
    });
});

// Get commune subventions
router.get('/commune/:cog', validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;

    const query = `
        SELECT * 
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

        // Extract all fields except the commune identifier
        const { COG: cogField, ...subventions } = row;
        
        // Calculate total if needed
        const total_subventions_parHab = Object.values(subventions)
            .filter(val => typeof val === 'number' && !isNaN(val))
            .reduce((sum, val) => sum + val, 0);

        res.json({
            commune: cog,
            subventions: {
                ...subventions,
                total_subventions_parHab
            }
        });
    });
});

module.exports = router;
