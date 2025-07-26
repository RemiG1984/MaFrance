const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateSort,
  validateDirection,
  validatePagination,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (res, err) => {
  console.error('Database error:', err.message);
  res.status(500).json({ 
    error: "Erreur lors de la requête à la base de données",
    details: err.message 
  });
};

// GET /api/departements
router.get("/", (req, res) => {
  db.all("SELECT DISTINCT departement FROM departement", [], (err, rows) => {
    if (err) return handleDbError(res, err);
    rows.sort((a, b) =>
      a.departement
        .padStart(3, "0")
        .localeCompare(b.departement.padStart(3, "0")),
    );
    res.json(rows);
  });
});

// GET /api/departements/details
router.get("/details", validateDepartement, (req, res) => {
  const { dept } = req.query;
  const normalizedDept =
    /^\d+$/.test(dept) && dept.length < 2 ? dept.padStart(2, "0") : dept;

  const sql = `
    SELECT 
      d.departement, 
      d.population, 
      d.logements_sociaux_pct,
      d.insecurite_score, 
      d.immigration_score, 
      d.islamisation_score, 
      d.defrancisation_score, 
      d.wokisme_score, 
      d.number_of_mosques, 
      d.mosque_p100k,
      COALESCE(qpv_stats.total_qpv, 0) as total_qpv,
      COALESCE(qpv_stats.total_population_qpv, 0) as total_population_qpv,
      CASE 
        WHEN d.population > 0 THEN (COALESCE(qpv_stats.total_population_qpv, 0) * 100.0 / d.population)
        ELSE 0
      END as pop_in_qpv_pct
    FROM departement d
    LEFT JOIN (
      SELECT 
        insee_dep,
        COUNT(*) as total_qpv,
        SUM(popMuniQPV) as total_population_qpv
      FROM qpv_data 
      GROUP BY insee_dep
    ) qpv_stats ON qpv_stats.insee_dep = ?
    WHERE d.departement = ?
  `;

  db.get(sql, [normalizedDept, dept], (err, row) => {
    if (err) return handleDbError(res, err);
    if (!row) return res.status(404).json({ error: "Département non trouvé" });
    res.json(row);
  });
});

// GET /api/departements/names
router.get("/names", validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM department_names 
     WHERE dpt = ? AND annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)`,
    [dept, dept],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res.status(404).json({
          error: "Données de prénoms non trouvées pour la dernière année",
        });
      res.json(row);
    },
  );
});

// GET /api/departements/names_history
router.get("/names_history", validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM department_names 
     WHERE dpt = ? 
     ORDER BY annais ASC`,
    [dept],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/departements/crime
router.get("/crime", validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    `SELECT * 
     FROM department_crime 
     WHERE dep = ? AND annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)`,
    [dept, dept],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res.status(404).json({
          error: "Données criminelles non trouvées pour la dernière année",
        });
      res.json(row);
    },
  );
});

// GET /api/departements/crime_history
router.get("/crime_history", validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.all(
    `SELECT *
     FROM department_crime 
     WHERE dep = ? 
     ORDER BY annee ASC`,
    [dept],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/departements/prefet
router.get("/prefet", validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    "SELECT code, prenom, nom, date_poste FROM prefets WHERE code = ?",
    [dept],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Préfet non trouvé" });
      res.json(row);
    },
  );
});

module.exports = router;