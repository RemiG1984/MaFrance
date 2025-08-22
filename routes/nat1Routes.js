
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const cacheService = require("../services/cacheService");
const {
  validateDepartement,
  validateCOG,
  validateCountry,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, res) => {
  console.error("Database error:", err.message);
  res.status(500).json({
    error: "Erreur lors de la requête à la base de données",
    details: err.message,
  });
};

// GET /api/nat1/country
router.get("/country", validateCountry, (req, res) => {
  const country = req.query.country || "France";
  
  // Try cache first
  const cachedData = cacheService.get(`nat1_country_${country.toLowerCase()}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  db.get(
    `SELECT * FROM country_nat1 WHERE UPPER(Code) = ?`,
    [country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(err, res);
      if (!row) {
        return res.status(404).json({ error: "Données NAT1 non trouvées pour ce pays" });
      }
      
      // Cache the result
      cacheService.set(`nat1_country_${country.toLowerCase()}`, row);
      res.json(row);
    }
  );
});

// GET /api/nat1/departement
router.get("/departement", validateDepartement, (req, res) => {
  const { dept } = req.query;
  
  if (!dept) {
    return res.status(400).json({ error: "Paramètre dept requis" });
  }

  // Try cache first
  const cachedData = cacheService.get(`nat1_dept_${dept}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  // Normalize department code for consistency
  const normalizedDept = /^\d+$/.test(dept) && dept.length < 2 ? dept.padStart(2, "0") : dept;

  db.get(
    `SELECT * FROM department_nat1 WHERE Code = ?`,
    [normalizedDept],
    (err, row) => {
      if (err) return handleDbError(err, res);
      if (!row) {
        return res.status(404).json({ error: "Données NAT1 non trouvées pour ce département" });
      }
      
      // Cache the result
      cacheService.set(`nat1_dept_${dept}`, row);
      res.json(row);
    }
  );
});

// GET /api/nat1/commune
router.get("/commune", validateCOG, (req, res) => {
  const { cog } = req.query;
  
  // Try cache first
  const cachedData = cacheService.get(`nat1_commune_${cog}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  db.get(
    `SELECT * FROM commune_nat1 WHERE Code = ?`,
    [cog],
    (err, row) => {
      if (err) return handleDbError(err, res);
      if (!row) {
        return res.status(404).json({ error: "Données NAT1 non trouvées pour cette commune" });
      }
      
      // Cache the result
      cacheService.set(`nat1_commune_${cog}`, row);
      res.json(row);
    }
  );
});

// GET /api/nat1/all - Get all available NAT1 data types
router.get("/all", (req, res) => {
  // Try cache first
  const cachedData = cacheService.get("nat1_all_summary");
  if (cachedData) {
    return res.json(cachedData);
  }

  const queries = [
    { name: "country", query: "SELECT COUNT(*) as count FROM country_nat1" },
    { name: "departement", query: "SELECT COUNT(*) as count FROM department_nat1" },
    { name: "commune", query: "SELECT COUNT(*) as count FROM commune_nat1" }
  ];

  const results = {};
  let completed = 0;

  queries.forEach(({ name, query }) => {
    db.get(query, [], (err, row) => {
      if (err) {
        console.error(`Error querying ${name}:`, err.message);
        results[name] = { count: 0, error: err.message };
      } else {
        results[name] = { count: row.count };
      }
      
      completed++;
      if (completed === queries.length) {
        // Cache the result
        cacheService.set("nat1_all_summary", results);
        res.json(results);
      }
    });
  });
});

module.exports = router;
