const express = require('express');
const router = express.Router();
const { createDbHandler } = require('../middleware/errorHandler');
const { cacheMiddleware } = require('../middleware/cache');
const {
  validateOptionalDepartement,
  validateOptionalCOG,
  validatePagination
} = require('../middleware/validate');
const {
  DEFAULT_LIMIT,
  MAX_PAGINATION_LIMIT,
  HTTP_BAD_REQUEST
} = require('../constants');

// Single endpoint for all migrant centers
router.get(
  '/',
  [validateOptionalDepartement, validateOptionalCOG, validatePagination, cacheMiddleware((req) => `migrants:${req.query.dept || 'all'}:${req.query.cog || 'all'}:${req.query.cursor || 0}:${req.query.limit || DEFAULT_LIMIT}`)],
  (req, res) => {
    const db = req.app.locals.db;
    const dbHandler = createDbHandler(res);
    const { dept, cog, cursor, limit = DEFAULT_LIMIT } = req.query;
    const pageLimit = Math.min(parseInt(limit), MAX_PAGINATION_LIMIT);
    const offset = cursor ? parseInt(cursor) : 0;

    // Prevent simultaneous dept and cog
    if (dept && cog) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: 'Cannot specify both dept and cog' });
    }

    let query = `
        SELECT mc.*, l.commune AS commune_name, mc.rowid
        FROM migrant_centers mc
        LEFT JOIN locations l ON mc.COG = l.COG
    `;
    const params = [];

    if (cog) {
      query += ' WHERE mc.COG = ?';
      params.push(cog);
    } else if (dept) {
      query += ' WHERE mc.departement = ?';
      params.push(dept);
    }

    query +=
            ' ORDER BY mc.places DESC, mc.departement, mc.COG, mc.gestionnaire, mc.rowid ASC LIMIT ? OFFSET ?';
    params.push(pageLimit + 1);
    params.push(offset);

    db.all(query, params, (err, rows) => {
      dbHandler(err);
      if (err) {
        return;
      }

      const hasMore = rows.length > pageLimit;
      const centers = hasMore ? rows.slice(0, pageLimit) : rows;
      const nextCursor =
                hasMore && centers.length > 0
                  ? centers[centers.length - 1].rowid
                  : null;

      const migrants = centers.map(row => {
        const commune_name = row.commune_name;
        delete row.rowid;
        return {
          type: row.type || row.type,
          gestionnaire: row.gestionnaire || row.gestionnaire,
          adresse: row.adresse,
          places: row.places,
          COG: row.COG,
          departement: row.departement,
          commune: commune_name,
          latitude: row.latitude,
          longitude: row.longitude
        };
      });

      res.json({
        list: migrants,
        pagination: {
          hasMore: hasMore,
          nextCursor: nextCursor,
          limit: pageLimit
        }
      });
    });
  }
);

module.exports = router;