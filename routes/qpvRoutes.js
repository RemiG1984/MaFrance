const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
    validateDepartement,
    validateOptionalCOG,
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
  SELECT rowid, COG, lib_com, codeQPV, lib_qp, popMuniQPV, indiceJeunesse, partPopEt, partPopImmi,
         nombre_logements_sociaux, taux_logements_sociaux,
         taux_d_emploi, taux_pauvrete_60, personnes_couvertes_CAF, allocataires_CAF, RSA_socle
  FROM qpv_data
`;

// GET /api/qpv - Get all QPV data with optional filtering and pagination
router.get(
    "/",
    [validateDepartement, validateOptionalCOG, validateSearchQuery, validatePagination],
    (req, res, next) => {
        const { dept = "", cog = "", commune = "", cursor, limit = "20" } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100);

        // Prevent simultaneous dept and cog
        if (dept && cog) {
            return res
                .status(400)
                .json({ error: "Cannot specify both dept and cog" });
        }

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

        // Add cursor condition for pagination (only for country-level requests without filters)
        if (cursor && !dept && !cog && !commune) {
            conditions.push("rowid > ?");
            params.push(parseInt(cursor));
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` ORDER BY rowid ASC LIMIT ?`;
        params.push(pageLimit + 1);

        db.all(sql, params, (err, rows) => {
            if (err) return handleDbError(err, next);

            const hasMore = rows.length > pageLimit;
            const qpvs = hasMore ? rows.slice(0, pageLimit) : rows;
            const nextCursor =
                hasMore && qpvs.length > 0
                    ? qpvs[qpvs.length - 1].rowid
                    : null;

            // If we have filters (dept, cog, commune), return simple array for backward compatibility
            if (dept || cog || commune) {
                res.json(qpvs.map(({ rowid, ...row }) => row));
            } else {
                // For country-level requests, return paginated format
                res.json({
                    list: qpvs.map(({ rowid, ...row }) => row),
                    pagination: {
                        hasMore: hasMore,
                        nextCursor: nextCursor,
                        limit: pageLimit,
                    },
                });
            }
        });
    },
);

module.exports = router;