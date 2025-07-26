const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { validateCountry } = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (res, err) => {
  console.error('Database error:', err.message);
  return res.status(500).json({ 
    error: "Erreur lors de la requête à la base de données",
    details: err.message 
  });
};

// GET /api/country/details
router.get("/details", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  db.get(
    `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct 
     FROM country 
     WHERE UPPER(country) = ?`,
    [country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Pays non trouvé" });
      res.json(row);
    },
  );
});

// GET /api/country/names
router.get("/names", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM country_names 
     WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`,
    [country.toUpperCase(), country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res
          .status(404)
          .json({
            error: "Données de prénoms non trouvées pour la dernière année",
          });
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
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/country/crime
router.get("/crime", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  db.get(
    `SELECT * 
     FROM country_crime 
     WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`,
    [country.toUpperCase(), country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res
          .status(404)
          .json({
            error: "Données criminelles non trouvées pour la dernière année",
          });
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
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/country/ministre
router.get("/ministre", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  db.get(
    `SELECT country, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique 
     FROM ministre_interieur 
     WHERE UPPER(country) = ? 
     ORDER BY date_mandat DESC LIMIT 1`,
    [country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Ministre non trouvé" });
      res.json(row);
    },
  );
});

module.exports = router;