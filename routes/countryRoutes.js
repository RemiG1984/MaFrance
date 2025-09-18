const express = require("express");
const router = express.Router();
const db = require("../config/db");
const cacheService = require("../services/cacheService");
const { validateCountry, validateCountryHistory } = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// GET /api/country/details
router.get("/details", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  // Try cache first
  const cachedData = cacheService.get(
    `country_details_${country.toLowerCase()}`,
  );
  if (cachedData) {
    return res.json(cachedData);
  }

  // For France, get both metro and entiere data
  if (country.toLowerCase() === "france") {
    db.all(
      `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k 
       FROM country 
       WHERE UPPER(country) LIKE 'FRANCE%'
       ORDER BY country`,
      [],
      (err, rows) => {
        if (err) return handleDbError(err, next);
        if (!rows || rows.length === 0)
          return res.status(404).json({ error: "Données France non trouvées" });

        const result = {
          metro:
            rows.find((row) => row.country.toUpperCase().includes("METRO")) ||
            null,
          entiere:
            rows.find((row) => row.country.toUpperCase().includes("ENTIERE")) ||
            null,
        };

        // Cache the result
        cacheService.set(`country_details_${country.toLowerCase()}`, result);
        res.json(result);
      },
    );
  } else {
    db.get(
      `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k 
       FROM country 
       WHERE UPPER(country) = ?`,
      [country.toUpperCase()],
      (err, row) => {
        if (err) return handleDbError(err, next);
        if (!row) return res.status(404).json({ error: "Pays non trouvé" });

        // Cache the result
        cacheService.set(`country_details_${country.toLowerCase()}`, row);
        res.json(row);
      },
    );
  }
});

// GET /api/country/names
router.get("/names", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  // Try cache first
  const cachedData = cacheService.get(`country_names_${country.toLowerCase()}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  // For France, get both metro and entiere data
  if (country.toLowerCase() === "france") {
    db.all(
      `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
       FROM country_names 
       WHERE UPPER(country) LIKE 'FRANCE%'
       AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) LIKE 'FRANCE%')
       ORDER BY country`,
      [],
      (err, rows) => {
        if (err) return handleDbError(err, next);
        if (!rows || rows.length === 0)
          return res.status(404).json({
            error: "Données de prénoms non trouvées pour la dernière année",
          });

        const result = {
          metro:
            rows.find((row) => row.country.toUpperCase().includes("METRO")) ||
            null,
          entiere:
            rows.find((row) => row.country.toUpperCase().includes("ENTIERE")) ||
            null,
        };

        // Cache the result
        cacheService.set(`country_names_${country.toLowerCase()}`, result);
        res.json(result);
      },
    );
  } else {
    db.get(
      `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
       FROM country_names 
       WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`,
      [country.toUpperCase(), country.toUpperCase()],
      (err, row) => {
        if (err) return handleDbError(err, next);
        if (!row)
          return res.status(404).json({
            error: "Données de prénoms non trouvées pour la dernière année",
          });

        // Cache the result
        cacheService.set(`country_names_${country.toLowerCase()}`, row);
        res.json(row);
      },
    );
  }
});

// GET /api/country/names_history
router.get("/names_history", validateCountryHistory, (req, res) => {
  const country = req.query.country;

  // Try cache first
  const cacheKey = country ? `country_names_history_${country.toLowerCase().replace(' ', '_')}` : "country_names_history_all";
  const cachedData = cacheService.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

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
    if (err) return handleDbError(err, next);

    // Cache the result
    cacheService.set(cacheKey, rows);
    res.json(rows);
  });
});

// GET /api/country/crime
router.get("/crime", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  // Try cache first
  const cachedData = cacheService.get(`country_crime_${country.toLowerCase()}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  // For France, get both metro and entiere data
  if (country.toLowerCase() === "france") {
    db.all(
      `SELECT * 
       FROM country_crime 
       WHERE UPPER(country) LIKE 'FRANCE%'
       AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) LIKE 'FRANCE%')
       ORDER BY country`,
      [],
      (err, rows) => {
        if (err) return handleDbError(err, next);
        if (!rows || rows.length === 0)
          return res.status(404).json({
            error: "Données criminelles non trouvées pour la dernière année",
          });

        const result = {
          metro:
            rows.find((row) => row.country.toUpperCase().includes("METRO")) ||
            null,
          entiere:
            rows.find((row) => row.country.toUpperCase().includes("ENTIERE")) ||
            null,
        };

        // Cache the result
        cacheService.set(`country_crime_${country.toLowerCase()}`, result);
        res.json(result);
      },
    );
  } else {
    db.get(
      `SELECT * 
       FROM country_crime 
       WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`,
      [country.toUpperCase(), country.toUpperCase()],
      (err, row) => {
        if (err) return handleDbError(err, next);
        if (!row)
          return res.status(404).json({
            error: "Données criminelles non trouvées pour la dernière année",
          });

        // Cache the result
        cacheService.set(`country_crime_${country.toLowerCase()}`, row);
        res.json(row);
      },
    );
  }
});

// GET /api/country/crime_history
router.get("/crime_history", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  // Try cache first
  const cachedData = cacheService.get(
    `country_crime_history_${country.toLowerCase()}`,
  );
  if (cachedData) {
    return res.json(cachedData);
  }

  // For France, get both metro and entiere data
  if (country.toLowerCase() === "france") {
    db.all(
      `SELECT *
       FROM country_crime 
       WHERE UPPER(country) LIKE 'FRANCE%'
       ORDER BY country, annee ASC`,
      [],
      (err, rows) => {
        if (err) return handleDbError(err, next);

        const result = {
          metro: rows.filter((row) =>
            row.country.toUpperCase().includes("METRO"),
          ),
          entiere: rows.filter((row) =>
            row.country.toUpperCase().includes("ENTIERE"),
          ),
        };

        // Cache the result
        cacheService.set(
          `country_crime_history_${country.toLowerCase()}`,
          result,
        );
        res.json(result);
      },
    );
  } else {
    db.all(
      `SELECT *
       FROM country_crime 
       WHERE UPPER(country) = ? 
       ORDER BY annee ASC`,
      [country.toUpperCase()],
      (err, rows) => {
        if (err) return handleDbError(err, next);

        // Cache the result
        cacheService.set(
          `country_crime_history_${country.toLowerCase()}`,
          rows,
        );
        res.json(rows);
      },
    );
  }
});

// GET /api/country/ministre
router.get("/ministre", validateCountry, (req, res) => {
  const country = req.query.country || "France";

  // Try cache first
  const cachedData = cacheService.get(`ministre_${country.toLowerCase()}`);
  if (cachedData) {
    return res.json(cachedData);
  }

  db.get(
    `SELECT prenom, nom, date_mandat, famille_nuance, nuance_politique 
     FROM ministre_interieur 
     WHERE UPPER(country) = ? 
     ORDER BY date_mandat DESC LIMIT 1`,
    [country.toUpperCase()],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Ministre non trouvé" });

      // Cache the result
      cacheService.set(`ministre_${country.toLowerCase()}`, row);
      res.json(row);
    },
  );
});

module.exports = router;