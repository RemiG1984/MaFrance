const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateOptionalDepartement,
  validateOptionalCOG,
  validatePagination,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// GET /api/francocides - Get all francocides with optional filtering
router.get(
  "/",
  [validateOptionalDepartement, validateOptionalCOG, validatePagination],
  (req, res, next) => {
    const { dept, cog, cursor, limit = '20', tag } = req.query;
    const pageLimit = Math.min(parseInt(limit), 100); // Cap at 100 items per page

    // Build base query
    let sql = `
      SELECT id, date_deces, cog, prenom, nom, sexe, age, photo, url_fdesouche, url_wikipedia, pays, tags
      FROM francocides 
      WHERE 1=1`;
    const params = [];

    // Add filters
    if (dept) {
      // For departement filtering, we need to extract dept code from COG
      sql += ` AND (
        SUBSTR(cog, 1, 2) = ? OR 
        (cog LIKE '2A%' AND ? = '2A') OR 
        (cog LIKE '2B%' AND ? = '2B') OR
        (cog LIKE '971%' AND ? = '971') OR
        (cog LIKE '972%' AND ? = '972') OR
        (cog LIKE '973%' AND ? = '973') OR
        (cog LIKE '974%' AND ? = '974') OR
        (cog LIKE '976%' AND ? = '976')
      )`;
      params.push(dept, dept, dept, dept, dept, dept, dept, dept);
    }

    if (cog) {
      sql += " AND cog = ?";
      params.push(cog);
    }

    if (tag) {
      sql += " AND (tags LIKE ? OR tags LIKE ? OR tags LIKE ? OR tags = ?)";
      params.push(`${tag},%`, `%, ${tag},%`, `%, ${tag}`, tag);
    }


    // Add cursor-based pagination
    if (cursor) {
      sql += " AND id > ?";
      params.push(cursor);
    }

    sql += " ORDER BY id ASC LIMIT ?";
    params.push(pageLimit + 1); // Get one extra to check if there are more

    db.all(sql, params, (err, rows) => {
      if (err) return handleDbError(err, next);

      const hasMore = rows.length > pageLimit;
      const francocides = hasMore ? rows.slice(0, pageLimit) : rows;
      const nextCursor = hasMore && francocides.length > 0 ? francocides[francocides.length - 1].id : null;

      res.json({
        list: francocides,
        pagination: {
          hasMore: hasMore,
          nextCursor: nextCursor,
          limit: pageLimit
        }
      });
    });
  }
);

// GET /api/francocides/stats - Get statistics about francocides
router.get(
  "/stats",
  [validateOptionalDepartement, validateOptionalCOG],
  (req, res, next) => {
    const { dept, cog, tag } = req.query;

    let sql = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN sexe = 'M' THEN 1 END) as male_count,
        COUNT(CASE WHEN sexe = 'F' THEN 1 END) as female_count,
        AVG(age) as average_age,
        MIN(age) as min_age,
        MAX(age) as max_age,
        COUNT(CASE WHEN photo IS NOT NULL THEN 1 END) as with_photo_count,
        COUNT(CASE WHEN url_wikipedia IS NOT NULL THEN 1 END) as with_wikipedia_count
      FROM francocides 
      WHERE 1=1`;
    const params = [];

    // Add filters
    if (dept) {
      sql += ` AND (
        SUBSTR(cog, 1, 2) = ? OR 
        (cog LIKE '2A%' AND ? = '2A') OR 
        (cog LIKE '2B%' AND ? = '2B') OR
        (cog LIKE '971%' AND ? = '971') OR
        (cog LIKE '972%' AND ? = '972') OR
        (cog LIKE '973%' AND ? = '973') OR
        (cog LIKE '974%' AND ? = '974') OR
        (cog LIKE '976%' AND ? = '976')
      )`;
      params.push(dept, dept, dept, dept, dept, dept, dept, dept);
    }

    if (cog) {
      sql += " AND cog = ?";
      params.push(cog);
    }

    if (tag) {
      sql += " AND (tags LIKE ? OR tags LIKE ? OR tags LIKE ? OR tags = ?)";
      params.push(`${tag},%`, `%, ${tag},%`, `%, ${tag}`, tag);
    }

    db.get(sql, params, (err, row) => {
      if (err) return handleDbError(err, next);

      const stats = {
        total: row?.total_count || 0,
        by_gender: {
          male: row?.male_count || 0,
          female: row?.female_count || 0
        },
        age_stats: {
          average: row?.average_age ? Math.round(row.average_age * 10) / 10 : 0,
          min: row?.min_age || 0,
          max: row?.max_age || 0
        },
        media: {
          with_photo: row?.with_photo_count || 0,
          with_wikipedia: row?.with_wikipedia_count || 0
        }
      };

      res.json(stats);
    });
  }
);

// Get unique tags with occurrence counts
router.get('/tags', (req, res) => {
  const sql = `
    SELECT tags
    FROM francocides 
    WHERE tags IS NOT NULL AND tags != ''
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ 
        error: 'Erreur lors de la requête à la base de données',
        details: err.message 
      });
    }

    // Count tag occurrences
    const tagCounts = new Map();
    rows.forEach(row => {
      if (row.tags) {
        const individualTags = row.tags.split(',').map(tag => tag.trim());
        individualTags.forEach(tag => {
          if (tag) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        });
      }
    });

    // Convert to array and sort by count (descending)
    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ tags });
  });
});

// GET /api/francocides/:id - Get specific francocide by ID
router.get(
  "/:id",
  (req, res, next) => {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "ID invalide" });
    }

    const sql = `
      SELECT id, date_deces, cog, prenom, nom, sexe, age, photo, url_fdesouche, url_wikipedia, pays, tags
      FROM francocides 
      WHERE id = ?`;

    db.get(sql, [id], (err, row) => {
      if (err) return handleDbError(err, next);

      if (!row) {
        return res.status(404).json({ error: "Francocide non trouvé" });
      }

      res.json(row);
    });
  }
);

module.exports = router;