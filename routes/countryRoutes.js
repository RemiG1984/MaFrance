const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { createDbHandler } = require("../middleware/errorHandler");
const { cacheMiddleware } = require("../middleware/cache");
const { validateCountry } = require("../middleware/validate");

// GET /api/country/details
router.get("/details", validateCountry, cacheMiddleware((req) => {
  const country = req.query.country;
  return country ? `country_details_${country.toLowerCase()}` : "country_details_all";
}), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const country = req.query.country;

  let sql = `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k
             FROM country`;
  let params = [];

  if (country) {
    sql += ` WHERE UPPER(country) = ?`;
    params = [country.toUpperCase()];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ error: "Données pays non trouvées" });

    res.json(rows);
  });
});

// GET /api/country/names
router.get("/names", validateCountry, cacheMiddleware((req) => {
  const country = req.query.country;
  return country ? `country_names_${country.toLowerCase()}` : "country_names_all";
}), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const country = req.query.country;

  let sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
             FROM country_names`;
  let params = [];

  if (country) {
    sql += ` WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`;
    params = [country.toUpperCase(), country.toUpperCase()];
  } else {
    sql += ` WHERE annais = (SELECT MAX(annais) FROM country_names)`;
  }

  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({
        error: "Données de prénoms non trouvées pour la dernière année",
      });

    res.json(rows);
  });
});


// GET /api/country/names_history
router.get("/names_history", validateCountry, cacheMiddleware((req) => {
  const country = req.query.country;
  return country ? `country_names_history_${country.toLowerCase().replace(' ', '_')}` : "country_names_history_all";
}), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const country = req.query.country;

  let sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
             FROM country_names
             ORDER BY country, annais ASC`;
  let params = [];

  if (country) {
    sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
           FROM country_names
           WHERE country = ?
           ORDER BY annais ASC`;
    params = [country];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(err);

    res.json(rows);
  });
});

// GET /api/country/crime
router.get("/crime", cacheMiddleware((req) => {
  const country = req.query.country;
  return country ? `country_crime_${country.toLowerCase()}` : "country_crime_all";
}), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const country = req.query.country;

  let sql = `SELECT *
             FROM country_crime`;
  let params = [];

  if (country) {
    sql += ` WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`;
    params = [country.toUpperCase(), country.toUpperCase()];
  } else {
    sql += ` WHERE annee = (SELECT MAX(annee) FROM country_crime)`;
  }


  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({
        error: "Données criminelles non trouvées pour la dernière année",
      });

    res.json(rows);
  });
});

// GET /api/country/crime_history
router.get("/crime_history", validateCountry, cacheMiddleware((req) => {
  const country = req.query.country;
  return country ? `country_crime_history_${country.toLowerCase().replace(' ', '_')}` : "country_crime_history_all";
}), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const country = req.query.country;

  let sql = `SELECT *
             FROM country_crime
             ORDER BY country, annee ASC`;
  let params = [];

  if (country) {
    sql = `SELECT *
           FROM country_crime
           WHERE country = ?
           ORDER BY annee ASC`;
    params = [country];
  }

  db.all(sql, params, (err, rows) => {
    if (err) return handleDbError(err);

    res.json(rows);
  });
});

// GET /api/country/ministre
router.get("/ministre", cacheMiddleware(() => "ministre_france"), (req, res, next) => {
  const handleDbError = createDbHandler(res, next);

  const sql = `SELECT country, prenom, nom, date_mandat, famille_nuance, nuance_politique
               FROM ministre_interieur
               WHERE UPPER(country) = 'FRANCE'
               ORDER BY date_mandat DESC LIMIT 1`;

  db.get(sql, [], (err, row) => {
    if (err) return handleDbError(err);
    if (!row) return res.status(404).json({ error: "Ministre non trouvé" });

    res.json(row);
  });
});

module.exports = router;