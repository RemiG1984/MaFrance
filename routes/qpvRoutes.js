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
  SELECT COG, lib_com, codeQPV, lib_qp, insee_reg, lib_reg, insee_dep, lib_dep,
         siren_epci, lib_epci, popMuniQPV, indiceJeunesse, partPopEt, partPopImmi,
         partMenImmi, partMenEt, partMen1p, partMen2p, partMen3p, partMen45p,
         partMen6pp, nombre_menages, nombre_logements_sociaux, taux_logements_sociaux,
         taux_d_emploi, taux_pauvrete_60, personnes_couvertes_CAF, allocataires_CAF, RSA_socle
  FROM qpv_data
`;

// GET /api/qpv - Get all QPV data with optional filtering and pagination
router.get(
    "/",
    [validateDepartement, validateOptionalCOG, validateSearchQuery, validatePagination],
    (req, res) => {
        const { dept = "", cog = "", commune = "", cursor, limit = "20" } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100);
        const offset = cursor ? parseInt(cursor) : 0;

        // Prevent simultaneous dept and cog
        if (dept && cog) {
            return res
                .status(400)
                .json({ error: "Cannot specify both dept and cog" });
        }

        let sql = `${baseQpvSelect} LEFT JOIN (SELECT ROW_NUMBER() OVER (ORDER BY lib_com ASC, codeQPV ASC) as rowid, codeQPV as rn_code FROM qpv_data`;
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

        sql += `) rn ON qpv_data.codeQPV = rn.rn_code`;

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += ` ORDER BY lib_com ASC, codeQPV ASC LIMIT ? OFFSET ?`;
        params.push(pageLimit + 1);
        params.push(offset);

        db.all(sql, params, (err, rows) => {
            if (err) return handleDbError(err, res);

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