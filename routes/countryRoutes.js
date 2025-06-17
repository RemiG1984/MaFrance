const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { validateCountry } = require("../middleware/validate");

// GET /api/country/details
router.get("/details", (req, res) => {
  db.get(
    "SELECT country, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM country WHERE country = ?",
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
     WHERE UPPER(country) = ? AND date_mandat = (SELECT MAX(date_mandat) FROM ministre_interieur WHERE UPPER(country) = ?)`,
    ["FRANCE", "FRANCE"],
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
