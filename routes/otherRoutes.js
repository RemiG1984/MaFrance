const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateDepartement, validateSearchQuery } = require('../middleware/validate');

// GET /api/search
router.get('/search', [validateDepartement, validateSearchQuery], (req, res) => {
  const { dept, q = '' } = req.query;
  if (!dept) {
    db.all(
      'SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations WHERE departement LIKE ? OR commune LIKE ? LIMIT 50',
      [`%${q}%`, `%${q}%`],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            error: 'Erreur lors de la requête à la base de données',
            details: err.message,
          });
        }
        res.json(rows);
      },
    );
  } else {
    db.all(
      'SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations WHERE departement = ? AND commune = ? LIMIT 1',
      [dept, q],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            error: 'Erreur lors de la requête à la base de données',
            details: err.message,
          });
        }
        res.json(rows);
      },
    );
  }
});

module.exports = router;