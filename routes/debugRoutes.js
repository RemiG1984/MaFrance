const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// GET /api/debug/tables - Check database tables and row counts
router.get("/tables", (req, res) => {
  const tables = [
    "locations",
    "articles",
    "commune_names",
    "commune_crime",
    "maires",
  ];
  const results = {};
  let completed = 0;

  function checkComplete() {
    completed++;
    if (completed === tables.length) {
      res.json(results);
    }
  }

  tables.forEach((table) => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
      results[table] = err ? { error: err.message } : { count: row.count };
      checkComplete();
    });
  });
});

// GET /api/debug/departments - Check available departments
router.get("/departments", (req, res) => {
  db.all(
    "SELECT DISTINCT departement FROM locations ORDER BY departement",
    [],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

module.exports = router;
