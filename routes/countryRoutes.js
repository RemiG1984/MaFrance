const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { validateCountry } = require("../middleware/validate");

// GET /api/country/details
router.get("/details", (req, res) => {
  db.get(
    "SELECT country, COALESCE(population, 0) as population, COALESCE(insecurite_score, 0) as insecurite_score, COALESCE(immigration_score, 0) as immigration_score, COALESCE(islamisation_score, 0) as islamisation_score, COALESCE(defrancisation_score, 0) as defrancisation_score, COALESCE(wokisme_score, 0) as wokisme_score, COALESCE(number_of_mosques, 0) as number_of_mosques, COALESCE(mosque_p100k, 0) as mosque_p100k, COALESCE(total_qpv, 0) as total_qpv, COALESCE(pop_in_qpv_pct, 0) as pop_in_qpv_pct FROM country WHERE country = ?",
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
    `SELECT COALESCE(musulman_pct, 0) as musulman_pct, COALESCE(africain_pct, 0) as africain_pct, COALESCE(asiatique_pct, 0) as asiatique_pct, COALESCE(traditionnel_pct, 0) as traditionnel_pct, COALESCE(moderne_pct, 0) as moderne_pct, annais
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

module.exports = router;
