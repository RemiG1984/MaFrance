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

// Validate country parameter
const validateCountryParam = [
    param("country")
        .notEmpty()
        .withMessage("Pays requis")
        .isIn(["france", "France", "FRANCE"])
        .withMessage("Pays doit être France"),
    handleValidationErrors,
];

// Get country subventions
router.get("/country/:country", validateCountryParam, (req, res) => {
    const db = req.app.locals.db;
    const { country } = req.params;

    const query = `
        SELECT etat_central, autres_organismes_publics
        FROM country_subventions 
        WHERE country = ?
    `;

    db.get(query, [country], (err, row) => {
        if (err) {
            return handleDbError(err, res);
        }

        if (!row) {
            return res
                .status(404)
                .json({
                    error: "Données de subventions non trouvées pour ce pays",
                });
        }

        res.json({
            etat_central: row.etat_central,
            autres_organismes_publics: row.autres_organismes_publics
        });
    });
});

// Get department subventions
router.get("/departement/:dept", validateDepartementParam, (req, res) => {
    const db = req.app.locals.db;
    const { dept } = req.params;

    const query = `
        SELECT subvention_region_distributed, subvention_departement
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
            subvention_departement: row.subvention_departement
        });
    });
});

// Get commune subventions
router.get("/commune/:cog", validateCOGParam, (req, res) => {
    const db = req.app.locals.db;
    const { cog } = req.params;

    const query = `
        SELECT subvention_EPCI_distributed, subvention_commune
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
            subvention_commune: row.subvention_commune
        });
    });
});

module.exports = router;
