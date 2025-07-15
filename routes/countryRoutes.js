const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { validateCountry } = require("../middleware/validate");

// GET /api/country/details
router.get("/details", (req, res) => {
  db.get(
    "SELECT country, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct FROM country WHERE country = ?",
    ["France"],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({ error: "Pays non trouvé" });
      }
      res.json(row);
    },
  );
});

// GET /api/country/names
router.get("/names", (req, res) => {
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM country_names 
     WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`,
    ["FRANCE", "FRANCE"],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({
          error: "Données de prénoms non trouvées pour la dernière année",
        });
      }
      res.json(row);
    },
  );
});

// GET /api/country/names_history
router.get("/names_history", validateCountry, (req, res) => {
  const country = req.query.country || "France";
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM country_names 
     WHERE UPPER(country) = ? 
     ORDER BY annais ASC`,
    [country.toUpperCase()],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      res.json(rows);
    },
  );
});

// GET /api/country/crime
router.get("/crime", (req, res) => {
  db.get(
    `SELECT * 
     FROM country_crime 
     WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`,
    ["FRANCE", "FRANCE"],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({
          error: "Données criminelles non trouvées pour la dernière année",
        });
      }
      res.json(row);
    },
  );
});

// GET /api/country/crime_history
router.get("/crime_history", validateCountry, (req, res) => {
  const country = req.query.country || "France";
  db.all(
    `SELECT *
     FROM country_crime 
     WHERE UPPER(country) = ? 
     ORDER BY annee ASC`,
    [country.toUpperCase()],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      res.json(rows);
    },
  );
});

// GET /api/country/ministre
router.get("/ministre", (req, res) => {
  db.get(
    `SELECT country, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique 
     FROM ministre_interieur 
     WHERE UPPER(country) = ? 
     ORDER BY date_mandat DESC LIMIT 1`,
    ["FRANCE"],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({ error: "Ministre non trouvé" });
      }
      res.json(row);
    },
  );
});

router.get('/search', (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Simplified query that focuses on the main country table first
  const sql = `
    SELECT 
      c.country, 
      c.population, 
      c.insecurite_score, 
      c.immigration_score, 
      c.islamisation_score, 
      c.defrancisation_score, 
      c.wokisme_score, 
      c.number_of_mosques, 
      c.mosque_p100k, 
      c.total_qpv, 
      c.pop_in_qpv_pct,
      (COALESCE(c.insecurite_score, 0) + COALESCE(c.immigration_score, 0) + COALESCE(c.islamisation_score, 0) + COALESCE(c.defrancisation_score, 0) + COALESCE(c.wokisme_score, 0)) AS total_score
    FROM country c
    WHERE LOWER(c.country) LIKE LOWER(?) 
    LIMIT 1
  `;

  db.get(sql, [`%${q.trim()}%`], (err, row) => {
    if (err) {
      console.error('Database error in country search:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json(row);
  });
});

module.exports = router;