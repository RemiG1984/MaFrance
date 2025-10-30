const express = require('express');
const router = express.Router();
const db = require('../config/db');
const SearchService = require('../services/searchService');
const { createDbHandler } = require('../middleware/errorHandler');
const { cacheMiddleware } = require('../middleware/cache');
const {
  validateDepartement,
  validateCOG,
  validateSearchQuery
} = require('../middleware/validate');

// GET /api/communes
router.get('/', [validateDepartement, validateSearchQuery], async(req, res) => {
  const { dept, q = '' } = req.query;

  try {
    const results = await SearchService.searchCommunes(dept, q, 10);
    res.json(results);
  } catch (error) {
    const dbHandler = createDbHandler(res);
    dbHandler(error);
  }
});

// GET /api/communes/suggestions - New endpoint for autocomplete
router.get('/suggestions', [validateDepartement, validateSearchQuery], async(req, res) => {
  const { dept, q = '' } = req.query;

  try {
    const suggestions = await SearchService.getCommuneSuggestions(dept, q, 5);
    res.json(suggestions);
  } catch (error) {
    const dbHandler = createDbHandler(res);
    dbHandler(error);
  }
});

// GET /api/communes/search - Global commune search endpoint
router.get('/search', [validateSearchQuery], async(req, res) => {
  const { q = '' } = req.query;

  if (!q || q.length < 3) {
    return res.json([]);
  }

  try {
    const results = await SearchService.searchCommunesGlobally(q, 15);
    res.json(results);
  } catch (error) {
    const dbHandler = createDbHandler(res);
    dbHandler(error);
  }
});

// GET /api/communes/all
router.get('/all', cacheMiddleware(() => 'communes:all'), (req, res) => {
  const dbHandler = createDbHandler(res);
  db.all(
    'SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations',
    [],
    (err, rows) => {
      dbHandler(err);
      if (err) {
        return;
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/names
router.get('/names', validateCOG, cacheMiddleware((req) => `communes:names:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM commune_names
     WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      dbHandler(err);
      if (err) {
        return;
      }
      if (!row) {
        return res.status(404).json({
          error: 'Données de prénoms non trouvées pour la dernière année'
        });
      }
      res.json(row);
    }
  );
});

// GET /api/communes/names_history
router.get('/names_history', validateCOG, cacheMiddleware((req) => `communes:names_history:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM commune_names
     WHERE COG = ?
     ORDER BY annais ASC`,
    [cog],
    (err, rows) => {
      dbHandler(err);
      if (err) {
        return;
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/crime
router.get('/crime', validateCOG, cacheMiddleware((req) => `communes:crime:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.get(
    `SELECT *
     FROM commune_crime
     WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      dbHandler(err);
      if (err) {
        return;
      }
      if (!row) {
        return res.status(404).json({
          error: 'Données criminelles non trouvées pour la dernière année'
        });
      }
      res.json(row);
    }
  );
});

// GET /api/communes/crime_history
router.get('/crime_history', validateCOG, cacheMiddleware((req) => `communes:crime_history:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.all(
    `SELECT *
     FROM commune_crime
     WHERE COG = ?
     ORDER BY annee ASC`,
    [cog],
    (err, rows) => {
      dbHandler(err);
      if (err) {
        return;
      }
      res.json(rows);
    }
  );
});

// GET /api/communes/details
router.get('/details', validateCOG, cacheMiddleware((req) => `communes:details:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.get(
    'SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations WHERE COG = ?',
    [cog],
    (err, row) => {
      dbHandler(err);
      if (err) {
        return;
      }
      if (!row) {
        return res.status(404).json({ error: 'Commune non trouvée' });
      }
      res.json(row);
    }
  );
});

const nuanceMap = {
  LEXG: 'Extrême gauche',
  LCOM: 'Parti Communiste',
  LFI: 'France Insoumise',
  LSOC: 'Parti Socialiste',
  LRDG: 'Parti radical de gauche',
  LDVG: 'Divers gauche',
  LUG: 'Liste d\'Union de la gauche',
  LVEC: 'Europe Ecologie',
  LECO: 'Liste autre écologiste',
  LDIV: 'Liste divers',
  LREG: 'Liste régionaliste',
  LGJ: 'Liste gilets jaunes',
  LREM: 'La République en marche',
  LMDM: 'Modem',
  LUDI: 'UDI',
  LUC: 'Liste union du centre',
  LDVC: 'Liste divers centre',
  LLR: 'Les Républicains',
  LUD: 'Liste union de la droite',
  LDVD: 'Liste divers droite',
  LDLF: 'Debout la France',
  LRN: 'Rassemblement National',
  LEXD: 'Liste d\'extrême droite',
  NC: ''
};

// GET /api/communes/maire
router.get('/maire', validateCOG, cacheMiddleware((req) => `communes:maire:${req.query.cog}`), (req, res) => {
  const { cog } = req.query;
  const dbHandler = createDbHandler(res);
  db.get(
    'SELECT cog, prenom, nom, date_mandat, famille_nuance, nuance_politique FROM maires WHERE cog = ?',
    [cog],
    (err, row) => {
      dbHandler(err);
      if (err) {
        return;
      }
      if (!row) {
        return res.status(404).json({ error: 'Maire non trouvé' });
      }

      // Map the nuance_politique code to its full description
      const response = {
        ...row,
        nuance_politique:
          nuanceMap[row.nuance_politique] || row.nuance_politique
      };

      res.json(response);
    }
  );
});

module.exports = router;