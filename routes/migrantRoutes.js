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
        const offset = cursor ? parseInt(cursor) : 0;

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

        query +=
            " ORDER BY mc.places DESC, mc.departement, mc.COG, mc.gestionnaire_centre, mc.rowid ASC LIMIT ? OFFSET ?";
        params.push(pageLimit + 1);
        params.push(offset);

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

router.get('/departement/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { cursor, limit = 20 } = req.query;

    let query;
    let params;
    let countQuery;
    let countParams;

    if (code === 'all') {
      // Country level - get all migrants
      countQuery = 'SELECT COUNT(*) as total FROM centres_migrants';
      countParams = [];

      if (cursor) {
        query = `
          SELECT * FROM centres_migrants 
          WHERE id > ? 
          ORDER BY id 
          LIMIT ?
        `;
        params = [cursor, parseInt(limit) + 1];
      } else {
        query = `
          SELECT * FROM centres_migrants 
          ORDER BY id 
          LIMIT ?
        `;
        params = [parseInt(limit) + 1];
      }
    } else {
      // Department level
      countQuery = 'SELECT COUNT(*) as total FROM centres_migrants WHERE departement_code = ?';
      countParams = [code];

      if (cursor) {
        query = `
          SELECT * FROM centres_migrants 
          WHERE departement_code = ? AND id > ? 
          ORDER BY id 
          LIMIT ?
        `;
        params = [code, cursor, parseInt(limit) + 1];
      } else {
        query = `
          SELECT * FROM centres_migrants 
          WHERE departement_code = ? 
          ORDER BY id 
          LIMIT ?
        `;
        params = [code, parseInt(limit) + 1];
      }
    }

    // Get total count
    const totalCount = await new Promise((resolve, reject) => {
      req.app.locals.db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    const results = await new Promise((resolve, reject) => {
      req.app.locals.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    res.json({
      list: data,
      total: totalCount,
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching migrant centers:', error);
    res.status(500).json({ error: 'Failed to fetch migrant centers' });
  }
});

router.get('/commune/:cog', async (req, res) => {
  try {
    const { cog } = req.params;
    const { cursor, limit = 20 } = req.query;

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM centres_migrants WHERE COG = ?';
    const totalCount = await new Promise((resolve, reject) => {
      req.app.locals.db.get(countQuery, [cog], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    let query;
    let params;

    if (cursor) {
      query = `
        SELECT * FROM centres_migrants 
        WHERE COG = ? AND id > ? 
        ORDER BY id 
        LIMIT ?
      `;
      params = [cog, cursor, parseInt(limit) + 1];
    } else {
      query = `
        SELECT * FROM centres_migrants 
        WHERE COG = ? 
        ORDER BY id 
        LIMIT ?
      `;
      params = [cog, parseInt(limit) + 1];
    }

    const results = await new Promise((resolve, reject) => {
      req.app.locals.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    res.json({
      list: data,
      total: totalCount,
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching migrant centers for commune:', error);
    res.status(500).json({ error: 'Failed to fetch migrant centers' });
  }
});

module.exports = router;