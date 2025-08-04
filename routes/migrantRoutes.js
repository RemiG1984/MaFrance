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

// Get migrant centers by commune COG
router.get('/commune/:cog', validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;

    const query = `
        SELECT mc.*, c.commune as commune_name 
        FROM migrant_centers mc
        LEFT JOIN communes c ON mc.COG = c.COG
        WHERE mc.COG = ?
        ORDER BY mc.nom_centre
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
            commune: rows[0].commune_name || 'Nom inconnu',
            centers: rows.map(row => ({
                type_centre: row.type_centre,
                nom_centre: row.nom_centre,
                adresse: row.adresse,
                latitude: row.latitude,
                longitude: row.longitude,
                capacite: row.capacite,
                date_ouverture: row.date_ouverture,
                date_fermeture: row.date_fermeture,
                statut: row.statut,
                gestionnaire: row.gestionnaire,
                population_cible: row.population_cible,
                services_proposes: row.services_proposes,
                contact_telephone: row.contact_telephone,
                contact_email: row.contact_email,
                site_web: row.site_web,
                notes: row.notes,
                derniere_maj: row.derniere_maj
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
        SELECT mc.*, c.commune as commune_name 
        FROM migrant_centers mc
        LEFT JOIN communes c ON mc.COG = c.COG
        WHERE mc.departement = ?
        ORDER BY mc.COG, mc.nom_centre
        LIMIT ? OFFSET ?
    `;

    db.all(query, [dept, parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) {
            return handleDbError(err, res);
        }

        const centers = rows.map(row => ({
            COG: row.COG,
            commune: row.commune_name || 'Nom inconnu',
            type_centre: row.type_centre,
            nom_centre: row.nom_centre,
            adresse: row.adresse,
            latitude: row.latitude,
            longitude: row.longitude,
            capacite: row.capacite,
            date_ouverture: row.date_ouverture,
            date_fermeture: row.date_fermeture,
            statut: row.statut,
            gestionnaire: row.gestionnaire,
            population_cible: row.population_cible,
            services_proposes: row.services_proposes,
            contact_telephone: row.contact_telephone,
            contact_email: row.contact_email,
            site_web: row.site_web,
            notes: row.notes,
            derniere_maj: row.derniere_maj
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

// Get migrant centers statistics
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;

    const queries = {
        total_centers: 'SELECT COUNT(*) as count FROM migrant_centers',
        by_department: `SELECT departement, COUNT(*) as count 
                       FROM migrant_centers 
                       GROUP BY departement 
                       ORDER BY count DESC`,
        by_type: `SELECT type_centre, COUNT(*) as count 
                 FROM migrant_centers 
                 WHERE type_centre IS NOT NULL 
                 GROUP BY type_centre 
                 ORDER BY count DESC`,
        total_capacity: 'SELECT SUM(capacite) as total FROM migrant_centers WHERE capacite IS NOT NULL'
    };

    let results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
        if (key === 'by_department' || key === 'by_type') {
            db.all(queries[key], (err, rows) => {
                if (err) {
                    console.error(`Erreur stats ${key}:`, err);
                    results[key] = [];
                } else {
                    results[key] = rows;
                }
                completed++;
                if (completed === total) {
                    res.json({ statistics: results });
                }
            });
        } else {
            db.get(queries[key], (err, row) => {
                if (err) {
                    console.error(`Erreur stats ${key}:`, err);
                    results[key] = 0;
                } else {
                    results[key] = key === 'total_capacity' ? (row.total || 0) : row.count;
                }
                completed++;
                if (completed === total) {
                    res.json({ statistics: results });
                }
            });
        }
    });
});

module.exports = router;