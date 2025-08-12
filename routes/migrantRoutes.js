const express = require("express");
const router = express.Router();
const {
    validateOptionalDepartement,
    validateOptionalCOG,
    validatePagination,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, res) => {
    console.error("Database error:", err.message);
    res.status(500).json({
        error: "Erreur lors de la requête à la base de données",
        details: err.message,
    });
};

// Single endpoint for all migrant centers
router.get(
    "/",
    [validateOptionalDepartement, validateOptionalCOG, validatePagination],
    (req, res) => {
        const db = req.app.locals.db;
        const { dept, cog, cursor, limit = "20" } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100);

        // Prevent simultaneous dept and cog
        if (dept && cog) {
            return res
                .status(400)
                .json({ error: "Cannot specify both dept and cog" });
        }

        let query = `
        SELECT mc.*, l.commune AS commune_name, mc.rowid
        FROM migrant_centers mc
        LEFT JOIN locations l ON mc.COG = l.COG
    `;
        const params = [];

        if (cog) {
            query += " WHERE mc.COG = ?";
            params.push(cog);
        } else if (dept) {
            query += " WHERE mc.departement = ?";
            params.push(dept);
        }

        if (cursor) {
            query += params.length ? " AND" : " WHERE";
            query += " mc.rowid > ?";
            params.push(cursor);
        }

        query +=
            " ORDER BY mc.places DESC, mc.departement, mc.COG, mc.gestionnaire_centre, mc.rowid ASC LIMIT ?";
        params.push(pageLimit + 1);

        db.all(query, params, (err, rows) => {
            if (err) {
                return handleDbError(err, res);
            }

            const hasMore = rows.length > pageLimit;
            const centers = hasMore ? rows.slice(0, pageLimit) : rows;
            const nextCursor =
                hasMore && centers.length > 0
                    ? centers[centers.length - 1].rowid
                    : null;

            const migrants = centers.map(({ rowid, commune_name, ...row }) => ({
                type_centre: row.type_centre || row.typeCentre,
                gestionnaire_centre:
                    row.gestionnaire_centre || row.gestionnaireCentre,
                adresse: row.adresse,
                places: row.places,
                COG: row.COG,
                departement: row.departement,
                commune: commune_name,
            }));

            res.json({
                list: migrants,
                pagination: {
                    hasMore: hasMore,
                    nextCursor: nextCursor,
                    limit: pageLimit,
                },
            });
        });
    },
);

module.exports = router;