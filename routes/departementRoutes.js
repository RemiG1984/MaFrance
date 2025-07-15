const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { validateDepartement, validateSort, validateDirection, validatePagination } = require('../middleware/validate');

// GET /api/departements
router.get('/', (req, res) => {
  db.all('SELECT DISTINCT departement FROM departements', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Erreur lors de la requête à la base de données',
        details: err.message,
      });
    }
    rows.sort((a, b) => {
      const deptA = a.departement.padStart(3, '0');
      const deptB = b.departement.padStart(3, '0');
      return deptA.localeCompare(deptB);
    });
    res.json(rows);
  });
});

// GET /api/departements/details
router.get('/details', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    'SELECT departement, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct FROM departements WHERE departement = ?',
    [dept],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({ error: 'Département non trouvé' });
      }
      res.json(row);
    },
  );
});

// GET /api/departements/names
router.get('/names', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM department_names 
     WHERE dpt = ? AND annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)`,
    [dept, dept],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({
          error: 'Données de prénoms non trouvées pour la dernière année',
        });
      }
      res.json(row);
    },
  );
});

// GET /api/departements/names_history
router.get('/names_history', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM department_names 
     WHERE dpt = ? 
     ORDER BY annais ASC`,
    [dept],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      res.json(rows);
    },
  );
});

// GET /api/departements/crime
router.get('/crime', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    `SELECT * 
     FROM department_crime 
     WHERE dep = ? AND annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)`,
    [dept, dept],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({
          error: 'Données criminelles non trouvées pour la dernière année',
        });
      }
      res.json(row);
    },
  );
});

// GET /api/departements/crime_history
router.get('/crime_history', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.all(
    `SELECT *
     FROM department_crime 
     WHERE dep = ? 
     ORDER BY annee ASC`,
    [dept],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      res.json(rows);
    },
  );
});

// GET /api/departements/details_all - Get detailed data for all departments with sorting
router.get('/details_all', (req, res) => {
    const { limit = 100, sort = 'total_score', direction = 'DESC' } = req.query;

    // Validate sort direction
    const sortDirection = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // List of allowed sort columns
    const allowedSorts = [
        'departement', 'population', 'insecurite_score', 'homicides_p100k',
        'violences_physiques_p1k', 'violences_sexuelles_p1k', 'vols_p1k',
        'destructions_p1k', 'stupefiants_p1k', 'escroqueries_p1k',
        'immigration_score', 'extra_europeen_pct', 'islamisation_score',
        'musulman_pct', 'number_of_mosques', 'mosque_p100k',
        'defrancisation_score', 'prenom_francais_pct', 'wokisme_score', 
        'total_qpv', 'pop_in_qpv_pct', 'total_score'
    ];

    if (!allowedSorts.includes(sort)) {
        return res.status(400).json({ error: 'Invalid sort column' });
    }

    const sql = `
        SELECT d.departement, d.population,
               d.insecurite_score, d.homicides_p100k, d.violences_physiques_p1k,
               d.violences_sexuelles_p1k, d.vols_p1k, d.destructions_p1k,
               d.stupefiants_p1k, d.escroqueries_p1k,
               d.immigration_score, d.extra_europeen_pct,
               d.islamisation_score, d.musulman_pct, d.number_of_mosques, d.mosque_p100k,
               d.defrancisation_score, d.prenom_francais_pct,
               d.wokisme_score, d.total_qpv, d.pop_in_qpv_pct, d.total_score
        FROM departements d
        ORDER BY d.${sort} ${sortDirection}
        LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET /api/departements/prefet
router.get('/prefet', validateDepartement, (req, res) => {
  const { dept } = req.query;
  db.get(
    'SELECT code, prenom, nom, date_poste FROM prefets WHERE code = ?',
    [dept],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: 'Erreur lors de la requête à la base de données',
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({ error: 'Préfet non trouvé' });
      }
      res.json(row);
    },
  );
});

module.exports = router;