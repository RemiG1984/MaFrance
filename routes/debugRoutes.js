
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET /api/debug/tables - Check database tables and row counts
router.get("/tables", (req, res) => {
  console.log("GET /api/debug/tables - Checking database health");
  
  const tables = ['locations', 'articles', 'commune_names', 'commune_crime', 'maires'];
  const results = {};
  let completed = 0;
  
  function checkComplete() {
    completed++;
    if (completed === tables.length) {
      console.log("Database health check results:", results);
      res.json(results);
    }
  }
  
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
      if (err) {
        console.error(`Error checking table ${table}:`, err);
        results[table] = { error: err.message };
      } else {
        results[table] = { count: row.count };
      }
      checkComplete();
    });
  });
});

// GET /api/debug/departments - Check available departments
router.get("/departments", (req, res) => {
  console.log("GET /api/debug/departments - Checking available departments");
  
  db.all("SELECT DISTINCT departement FROM locations ORDER BY departement", [], (err, rows) => {
    if (err) {
      console.error("Error fetching departments:", err);
      return res.status(500).json({ error: err.message });
    }
    console.log("Available departments:", rows.length);
    res.json(rows);
  });
});

module.exports = router;
