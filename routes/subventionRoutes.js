const express = require("express");
const router = express.Router();
const { param, validationResult } = require("express-validator");
// Centralized error handler for database queries
const handleDbError = (err, res) => {
  console.error("Database error:", err.message);
  res.status(500).json({
    error: "Erreur lors de la requête à la base de données",
    details: err.message,
  });
};
const {
    validateDepartementParam,
    validateCOGParam,
    validatePagination,
} = require("../middleware/validate");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Get country subventions
router.get("/country", (req, res) => {
    const db = req.app.locals.db;

    db.all(
        `SELECT country, etat_central, autres_organismes_publics, total_subv_commune, total_subv_EPCI, total_subv_dept, total_subv_region, total_subventions_parHab
         FROM country_subventions 
         ORDER BY country`,
        [],
        (err, rows) => {
            if (err) {
                return handleDbError(err, res);
            }

            if (!rows || rows.length === 0) {
                return res.status(404).json({
                    error: "Données de subventions non trouvées",
                });
            }

            res.json(rows);
        }
    );
});

// Get department subventions
router.get("/departement/:dept", validateDepartementParam, (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;

    const query = `
        SELECT subvention_region_distributed, subvention_departement, total_subventions_parHab
        FROM department_subventions 
        WHERE dep = ?
    `;

    db.get(query, [dept], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }

        if (!row) {
            return res
                .status(404)
                .json({
                    error: "Données de subventions non trouvées pour ce département",
                });
        }

        res.json({
            subvention_region_distributed: row.subvention_region_distributed,
            subvention_departement: row.subvention_departement,
            total_subventions_parHab: row.total_subventions_parHab
        });
    });
});

// Get commune subventions
router.get("/commune/:cog", validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;

    const query = `
        SELECT subvention_EPCI_distributed, subvention_commune, total_subventions_parHab
        FROM commune_subventions 
        WHERE COG = ?
    `;

    db.get(query, [cog], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }

        if (!row) {
            return res
                .status(404)
                .json({
                    error: "Données de subventions non trouvées pour cette commune",
                });
        }

        res.json({
            subvention_EPCI_distributed: row.subvention_EPCI_distributed,
            subvention_commune: row.subvention_commune,
            total_subventions_parHab: row.total_subventions_parHab
        });
    });
});

module.exports = router;
