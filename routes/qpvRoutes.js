const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
    validateDepartement,
    validateDepartementParam,
    validateCOG,
    validateCOGParam,
    validateSearchQuery,
    validatePagination,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
    const error = new Error("Erreur lors de la requête à la base de données");
    error.status = 500;
    error.details = err.message;
    return next(error);
};

// Base SQL select for QPV data
const baseQpvSelect = `
  SELECT COG, lib_com, codeQPV, lib_qp, insee_reg, lib_reg, insee_dep, lib_dep,
         siren_epci, lib_epci, popMuniQPV, indiceJeunesse, partPopEt, partPopImmi,
         partMenImmi, partMenEt, partMen1p, partMen2p, partMen3p, partMen45p,
         partMen6pp, nombre_menages, nombre_logements_sociaux, taux_logements_sociaux,
         taux_d_emploi, taux_pauvrete_60, personnes_couvertes_CAF, allocataires_CAF, RSA_socle
  FROM qpv_data
`;

// GET /api/qpv - Get all QPV data with optional filtering
router.get(
    "/",
    [validateDepartement, validateCOG, validatePagination],
    (req, res) => {
        const { dept = "", cog = "", commune = "", limit = 100 } = req.query;

        let sql = baseQpvSelect;
        const conditions = [];
        const params = [];

        if (dept) {
            conditions.push("insee_dep = ?");
            params.push(dept);
        }
        if (cog) {
            conditions.push("COG = ?");
            params.push(cog);
        }
        if (commune) {
            conditions.push("LOWER(lib_com) LIKE LOWER(?)");
            params.push(`%${commune}%`);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` ORDER BY lib_com ASC LIMIT ?`;
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return handleDbError(err, res);
            res.json(rows);
        });
    },
);

// GET /api/qpv/commune/:cog - Get QPV data for a specific commune
router.get("/commune/:cog", validateCOGParam, (req, res) => {
    const { cog } = req.params;

    const sql = `${baseQpvSelect} WHERE COG = ? ORDER BY codeQPV ASC`;

    db.all(sql, [cog], (err, rows) => {
        if (err) return handleDbError(err, res);
        res.json(rows);
    });
});

// GET /api/qpv/departement/:dept - Get QPV data for a specific department
router.get("/departement/:dept", validateDepartementParam, (req, res) => {
    const { dept } = req.params;

    const sql = `${baseQpvSelect} WHERE insee_dep = ? ORDER BY lib_com ASC, codeQPV ASC`;

    db.all(sql, [dept], (err, rows) => {
        if (err) return handleDbError(err, res);
        res.json(rows);
    });
});

// GET /api/qpv/stats/departement/:dept - Get QPV statistics for a department
router.get("/stats/departement/:dept", validateDepartementParam, (req, res) => {
    const { dept } = req.params;

    const sql = `
    SELECT 
      COUNT(*) as total_qpv,
      COUNT(DISTINCT COG) as communes_with_qpv,
      SUM(popMuniQPV) as total_population_qpv,
      AVG(indiceJeunesse) as avg_indice_jeunesse,
      AVG(partPopImmi) as avg_part_pop_immi,
      AVG(taux_pauvrete_60) as avg_taux_pauvrete,
      AVG(taux_d_emploi) as avg_taux_emploi,
      AVG(taux_logements_sociaux) as avg_taux_logements_sociaux
    FROM qpv_data
    WHERE insee_dep = ?
  `;

    db.get(sql, [dept], (err, row) => {
        if (err) return handleDbError(err, res);
        res.json(row);
    });
});

// GET /api/qpv/search - Search QPV by various criteria
router.get(
    "/search",
    [validateSearchQuery, validateDepartement, validatePagination],
    (req, res) => {
        const { q, dept = "", limit = 50 } = req.query;

        let sql = `
    SELECT COG, lib_com, codeQPV, lib_qp, insee_dep, lib_dep, popMuniQPV,
           taux_pauvrete_60, taux_d_emploi, partPopImmi
    FROM qpv_data
    WHERE (LOWER(lib_com) LIKE LOWER(?) OR LOWER(lib_qp) LIKE LOWER(?))
  `;
        const params = [`%${q.trim()}%`, `%${q.trim()}%`];

        if (dept) {
            sql += " AND insee_dep = ?";
            params.push(dept);
        }

        sql += " ORDER BY lib_com ASC, codeQPV ASC LIMIT ?";
        params.push(parseInt(limit));

        db.all(sql, params, (err, rows) => {
            if (err) return handleDbError(err, res);
            res.json(rows);
        });
    },
);

module.exports = router;