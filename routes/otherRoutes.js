const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateSearchQuery,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, res) => {
  console.error("Database error:", err.message);
  res.status(500).json({
    error: "Erreur lors de la requête à la base de données",
    details: err.message,
  });
};

// GET /api/search
router.get(
  "/search",
  [validateDepartement, validateSearchQuery],
  (req, res) => {
    const { dept, q } = req.query;

    const normalizedQuery = q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const sql = `
    SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct
    FROM locations 
    WHERE departement = ?
  `;

    db.all(sql, [dept], (err, rows) => {
      if (err) return handleDbError(res, err);

      const filteredCommunes = rows
        .filter((row) =>
          row.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(normalizedQuery),
        )
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