const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { createDbHandler } = require('../middleware/errorHandler');
const {
  validateDepartement,
  validateSearchQuery
} = require('../middleware/validate');

// GET /api/health - Health check endpoint
router.get('/health', (req, res) => {
  // Check database connectivity
  db.get('SELECT 1', (err) => {
    if (err) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }

    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });
});

// GET /api/search
router.get(
  '/search',
  [validateDepartement, validateSearchQuery],
  (req, res) => {
    const { dept, q } = req.query;
    const dbHandler = createDbHandler(res);

    const normalizedQuery = q
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const sql = `
    SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct
    FROM locations
    WHERE departement = ?
  `;

    db.all(sql, [dept], (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
        return;
      }

      const filteredCommunes = rows
        .filter((row) =>
          row.commune
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .includes(normalizedQuery)
        )
        .sort((a, b) => {
          const normA = a.commune
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          const normB = b.commune
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          // 1. Prioritize exact matches
          const isExactA = normA === normalizedQuery;
          const isExactB = normB === normalizedQuery;
          if (isExactA && !isExactB) {
            return -1;
          }
          if (!isExactA && isExactB) {
            return 1;
          }

          // 2. Prioritize startsWith
          const startsA = normA.startsWith(normalizedQuery);
          const startsB = normB.startsWith(normalizedQuery);
          if (startsA && !startsB) {
            return -1;
          }
          if (!startsA && startsB) {
            return 1;
          }

          // 3. Sort alphabetically
          return a.commune.localeCompare(b.commune);
        })
        .slice(0, 10);

      res.json(filteredCommunes);
    });
  }
);

module.exports = router;