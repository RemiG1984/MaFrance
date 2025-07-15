const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateDepartement, validateSearchQuery } = require('../middleware/validate');

// GET /api/search
router.get('/search', [validateDepartement, validateSearchQuery], (req, res) => {
  const { dept, q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const sql = `
    SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct
    FROM locations 
    WHERE departement = ? AND LOWER(commune) LIKE LOWER(?) 
    LIMIT 10
  `;

  db.all(sql, [dept, `%${q.trim()}%`], (err, rows) => {
    if (err) {
      console.error('Database error in /api/search:', err);
      return res.status(500).json({ 
        error: 'Database error', 
        details: err.message 
      });
    }
    res.json(rows);
  });
});

module.exports = router;