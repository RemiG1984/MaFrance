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
  [validateDepartement, validateSearchQuery],
  (req, res) => {
    const { dept, q } = req.query;

    const sql = `
    SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct
    FROM locations 
    WHERE departement = ? AND LOWER(commune) LIKE LOWER(?) 
    LIMIT 10
  `;

    db.all(sql, [dept, `%${q.trim()}%`], (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    });
  },
);

module.exports = router;
