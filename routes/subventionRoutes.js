
const express = require('express');
const router = express.Router();
const { handleDbError } = require('../middleware/errorHandler');
const { validateDepartement, validateCOG, validateCountry } = require('../middleware/validate');

// Get country subventions
router.get('/country/:country', validateCountry, (req, res) => {
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
router.get('/departement/:dep', validateDepartement, (req, res) => {
    const db = req.app.locals.db;
    const { dep } = req.params;

    const query = `
        SELECT subventions_data 
        FROM department_subventions 
        WHERE dep = ?
    `;

    db.get(query, [dep], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Données de subventions non trouvées pour ce département' });
        }

        try {
            const subventions = JSON.parse(row.subventions_data);
            res.json({
                departement: dep,
                subventions
            });
        } catch (parseErr) {
            console.error('Erreur parsing JSON subventions département:', parseErr);
            res.status(500).json({ error: 'Erreur de format des données de subventions' });
        }
    });
});

// Get commune subventions
router.get('/commune/:cog', validateCOG, (req, res) => {
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

// Get all departments with subventions (for listing/overview)
router.get('/departements', (req, res) => {
    const db = req.app.locals.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT dep, subventions_data 
        FROM department_subventions 
        ORDER BY dep
        LIMIT ? OFFSET ?
    `;

    db.all(query, [parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const departments = rows.map(row => {
            try {
                const subventions = JSON.parse(row.subventions_data);
                // Calculate total subventions
                const total = Object.values(subventions).reduce((sum, value) => {
                    return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                
                return {
                    departement: row.dep,
                    total_subventions: total,
                    subventions
                };
            } catch (parseErr) {
                console.error(`Erreur parsing JSON département ${row.dep}:`, parseErr);
                return {
                    departement: row.dep,
                    total_subventions: 0,
                    subventions: {}
                };
            }
        });

        res.json({
            departments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: departments.length
            }
        });
    });
});

// Get communes with subventions by department
router.get('/communes/departement/:dep', validateDepartement, (req, res) => {
    const db = req.app.locals.db;
    const { dep } = req.params;
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT cs.COG, cs.subventions_data, c.commune
        FROM commune_subventions cs
        LEFT JOIN communes c ON cs.COG = c.COG
        WHERE cs.COG LIKE ?
        ORDER BY cs.COG
        LIMIT ? OFFSET ?
    `;

    // Department code pattern for COG codes
    const depPattern = dep + '%';

    db.all(query, [depPattern, parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const communes = rows.map(row => {
            try {
                const subventions = JSON.parse(row.subventions_data);
                // Calculate total subventions
                const total = Object.values(subventions).reduce((sum, value) => {
                    return sum + (typeof value === 'number' ? value : 0);
                }, 0);
                
                return {
                    COG: row.COG,
                    commune: row.commune || 'Nom inconnu',
                    total_subventions: total,
                    subventions
                };
            } catch (parseErr) {
                console.error(`Erreur parsing JSON commune ${row.COG}:`, parseErr);
                return {
                    COG: row.COG,
                    commune: row.commune || 'Nom inconnu',
                    total_subventions: 0,
                    subventions: {}
                };
            }
        });

        res.json({
            departement: dep,
            communes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: communes.length
            }
        });
    });
});

// Get subvention statistics
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;

    const queries = {
        country: 'SELECT COUNT(*) as count FROM country_subventions',
        departments: 'SELECT COUNT(*) as count FROM department_subventions',
        communes: 'SELECT COUNT(*) as count FROM commune_subventions'
    };

    let results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], (err, row) => {
            if (err) {
                console.error(`Erreur stats ${key}:`, err);
                results[key] = 0;
            } else {
                results[key] = row.count;
            }
            
            completed++;
            if (completed === total) {
                res.json({
                    statistics: results,
                    total_entities: results.country + results.departments + results.communes
                });
            }
        });
    });
});

module.exports = router;
