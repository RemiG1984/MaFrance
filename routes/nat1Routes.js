
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

// Function to compute percentage fields from raw NAT1 data
const computePercentageFields = (row) => {
  if (!row) return null;
  
  const ensemble = parseFloat(row.Ensemble) || 0;
  if (ensemble === 0) return null; // Avoid division by zero
  
  const etrangers = parseFloat(row.Etrangers) || 0;
  const francais_de_naissance = parseFloat(row.Francais_de_naissance) || 0;
  const francais_par_acquisition = parseFloat(row.Francais_par_acquisition) || 0;
  
  // European nationalities
  const portugais = parseFloat(row.Portugais) || 0;
  const italiens = parseFloat(row.Italiens) || 0;
  const espagnols = parseFloat(row.Espagnols) || 0;
  const autres_ue = parseFloat(row.Autres_nationalites_de_l_UE) || 0;
  const autres_europe = parseFloat(row.Autres_nationalites_d_Europe) || 0;
  
  // Maghreb and Turkey
  const algeriens = parseFloat(row.Algeriens) || 0;
  const marocains = parseFloat(row.Marocains) || 0;
  const tunisiens = parseFloat(row.Tunisiens) || 0;
  const turcs = parseFloat(row.Turcs) || 0;
  
  // Other African nationalities
  const autres_afrique = parseFloat(row.Autres_nationalites_d_Afrique) || 0;
  
  // Other nationalities
  const autres_nationalites = parseFloat(row.Autres_nationalites) || 0;
  
  // Calculate percentages and multiply by 100, round to 2 decimal places
  const result = {
    Code: row.Code,
    Type: row.Type,
    Ensemble: ensemble,
    etrangers_pct: parseFloat(((etrangers / ensemble) * 100).toFixed(2)),
    francais_de_naissance_pct: parseFloat(((francais_de_naissance / ensemble) * 100).toFixed(2)),
    naturalises_pct: parseFloat(((francais_par_acquisition / ensemble) * 100).toFixed(2)),
    europeens_pct: parseFloat((((portugais + italiens + espagnols + autres_ue + autres_europe) / ensemble) * 100).toFixed(2)),
    maghrebins_pct: parseFloat((((algeriens + marocains + tunisiens + turcs) / ensemble) * 100).toFixed(2)),
    africains_pct: parseFloat(((autres_afrique / ensemble) * 100).toFixed(2)),
    autres_nationalites_pct: parseFloat(((autres_nationalites / ensemble) * 100).toFixed(2)),
    non_europeens_pct: parseFloat((((algeriens + marocains + tunisiens + turcs + autres_afrique + autres_nationalites) / ensemble) * 100).toFixed(2))
  };
  
  return result;
};

// GET /api/nat1/country
router.get("/country", (req, res) => {
  // Try cache first
  const cachedData = cacheService.get(`nat1_country_france`);
  if (cachedData) {
    return res.json(cachedData);
  }

  db.all(
    `SELECT * FROM country_nat1 ORDER BY Code`,
    [],
    (err, rows) => {
      if (err) return handleDbError(err, res);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Données NAT1 non trouvées pour la France" });
      }
      
      const result = {
        metro: null,
        entiere: null
      };
      
      rows.forEach(row => {
        const computedData = computePercentageFields(row);
        if (computedData) {
          if (row.Code.toUpperCase().includes('METRO')) {
            result.metro = computedData;
          } else if (row.Code.toUpperCase().includes('ENTIERE')) {
            result.entiere = computedData;
          }
        }
      });
      
      // Cache the result
      cacheService.set(`nat1_country_france`, result);
      res.json(result);
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
      
      const computedData = computePercentageFields(row);
      if (!computedData) {
        return res.status(500).json({ error: "Erreur lors du calcul des pourcentages" });
      }
      
      // Cache the result
      cacheService.set(`nat1_dept_${dept}`, computedData);
      res.json(computedData);
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
      
      const computedData = computePercentageFields(row);
      if (!computedData) {
        return res.status(500).json({ error: "Erreur lors du calcul des pourcentages" });
      }
      
      // Cache the result
      cacheService.set(`nat1_commune_${cog}`, computedData);
      res.json(computedData);
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
