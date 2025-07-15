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

  const sql = `
    WITH LatestCountryNames AS (
      SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM country_names cn
      WHERE cn.annais = (SELECT MAX(annais) FROM country_names WHERE country = cn.country)
      GROUP BY country
    )
    SELECT 
      c.country, c.population, c.insecurite_score, 
      c.immigration_score, c.islamisation_score, c.defrancisation_score, 
      c.wokisme_score, c.number_of_mosques, c.mosque_p100k, c.total_qpv, c.pop_in_qpv_pct,
      (COALESCE(c.insecurite_score, 0) + COALESCE(c.immigration_score, 0) + COALESCE(c.islamisation_score, 0) + COALESCE(c.defrancisation_score, 0) + COALESCE(c.wokisme_score, 0)) AS total_score,
      cn.musulman_pct, cn.africain_pct, cn.asiatique_pct, cn.traditionnel_pct, 
      cn.moderne_pct, cn.annais,
      (COALESCE(cc.homicides_p100k, 0) + COALESCE(cc.tentatives_homicides_p100k, 0)) AS homicides_p100k,
      (COALESCE(cc.coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(cc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
       COALESCE(cc.autres_coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(cc.vols_avec_armes_p1k, 0) + 
       COALESCE(cc.vols_violents_sans_arme_p1k, 0)) AS violences_physiques_p1k,
      COALESCE(cc.violences_sexuelles_p1k, 0) AS violences_sexuelles_p1k,
      (COALESCE(cc.vols_avec_armes_p1k, 0) + 
       COALESCE(cc.vols_violents_sans_arme_p1k, 0) + 
       COALESCE(cc.vols_sans_violence_contre_personnes_p1k, 0) + 
       COALESCE(cc.cambriolages_p1k, 0) + 
       COALESCE(cc.vols_daccessoires_sur_vehicules_p1k, 0) + 
       COALESCE(cc.vols_dans_vehicules_p1k, 0) + 
       COALESCE(cc.vols_de_vehicules_p1k, 0)) AS vols_p1k,
      (COALESCE(cc.trafic_et_revente_stupefiants_p1k, 0) + 
       COALESCE(cc.usage_stupefiants_p1k, 0)) AS stupefiants_p1k,
      (COALESCE(cc.destructions_et_degradations_p1k, 0) + 
       COALESCE(cc.destructions_et_degradations_vehicules_p1k, 0)) AS destructions_p1k
    FROM country c
    LEFT JOIN LatestCountryNames cn ON c.country = cn.country
    LEFT JOIN country_crime cc ON c.country = cc.country
    WHERE LOWER(c.country) LIKE LOWER(?) 
    LIMIT 10
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