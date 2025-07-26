const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateSearchQuery,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// GET /api/search
router.get(
  "/search",
  [validateSearchQuery],
  (req, res) => {
    const { dept, q } = req.query;
    
    // If no department specified, use global search
    if (!dept) {
      const SearchService = require('../services/searchService');
      SearchService.searchCommunesGlobally(q, 15)
        .then(results => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.json(results);
        })
        .catch(err => handleDbError(err, res));
      return;
    }

    // Normalize the query for consistent accent handling
    const normalizedQuery = q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const sql = `
    SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct
    FROM locations 
    WHERE departement = ?
  `;

    db.all(sql, [dept], (err, rows) => {
      if (err) return handleDbError(res, err);

      const filteredCommunes = rows
        .filter((row) => {
          const normalizedName = row.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
          
          return normalizedName.includes(normalizedQuery);
        })
        .sort((a, b) => {
          const normA = a.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const normB = b.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          // 1. Prioritize exact matches
          const isExactA = normA === normalizedQuery;
          const isExactB = normB === normalizedQuery;
          if (isExactA && !isExactB) return -1;
          if (!isExactA && isExactB) return 1;

          // 2. Prioritize startsWith
          const startsA = normA.startsWith(normalizedQuery);
          const startsB = normB.startsWith(normalizedQuery);
          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;

          // 3. Sort alphabetically
          return a.commune.localeCompare(b.commune);
        })
        .slice(0, 10);

      res.json(filteredCommunes);
    });
  },
);

module.exports = router;
