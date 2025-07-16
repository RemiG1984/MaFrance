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
  
  const sql = `
    SELECT 
      d.departement, 
      d.population, 
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
    FROM departements d
    LEFT JOIN (
      SELECT 
        insee_dep,
        COUNT(*) as total_qpv,
        SUM(popMuniQPV) as total_population_qpv
      FROM qpv_data 
      GROUP BY insee_dep
    ) qpv_stats ON d.departement = qpv_stats.insee_dep
    WHERE d.departement = ?
  `;
  
  db.get(sql, [dept], (err, row) => {
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
  });
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

// GET /api/departements/details_all
router.get('/details_all', [validateSort, validateDirection, validatePagination], (req, res) => {
  const { limit = 101, offset = 0, sort = 'insecurite_score', direction = 'DESC' } = req.query;
  const validSortColumns = [
    'total_score', 'insecurite_score', 'immigration_score', 'islamisation_score',
    'defrancisation_score', 'wokisme_score', 'number_of_mosques', 'mosque_p100k',
    'musulman_pct', 'africain_pct', 'asiatique_pct', 'traditionnel_pct', 'moderne_pct',
    'homicides_p100k', 'violences_physiques_p1k', 'violences_sexuelles_p1k', 'vols_p1k',
    'destructions_p1k', 'stupefiants_p1k', 'escroqueries_p1k', 'extra_europeen_pct',
    'prenom_francais_pct',
  ];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'insecurite_score';
  const sortDirection = direction === 'ASC' ? 'ASC' : 'DESC';

  const sql = `
    WITH LatestDepartmentNames AS (
      SELECT dpt, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM department_names dn
      WHERE dn.annais = (SELECT MAX(annais) FROM department_names WHERE dpt = dn.dpt)
      GROUP BY dpt
    )
    SELECT 
      d.departement, d.population, d.insecurite_score, 
      d.immigration_score, d.islamisation_score, d.defrancisation_score, 
      d.wokisme_score, d.number_of_mosques, d.mosque_p100k,
      (COALESCE(d.insecurite_score, 0) + COALESCE(d.immigration_score, 0) + COALESCE(d.islamisation_score, 0) + COALESCE(d.defrancisation_score, 0) + COALESCE(d.wokisme_score, 0)) AS total_score,
      dn.musulman_pct, dn.africain_pct, dn.asiatique_pct, dn.traditionnel_pct, 
      dn.moderne_pct, dn.annais,
      (COALESCE(dc.homicides_p100k, 0) + COALESCE(dc.tentatives_homicides_p100k, 0)) AS homicides_p100k,
      (COALESCE(dc.coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(dc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
       COALESCE(dc.autres_coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(dc.vols_avec_armes_p1k, 0) + 
       COALESCE(dc.vols_violents_sans_arme_p1k, 0)) AS violences_physiques_p1k,
      COALESCE(dc.violences_sexuelles_p1k, 0) AS violences_sexuelles_p1k,
      (COALESCE(dc.vols_avec_armes_p1k, 0) + 
       COALESCE(dc.vols_violents_sans_arme_p1k, 0) + 
       COALESCE(dc.vols_sans_violence_contre_des_personnes_p1k, 0) + 
       COALESCE(dc.cambriolages_de_logement_p1k, 0) + 
       COALESCE(dc.vols_de_vehicules_p1k, 0) + 
       COALESCE(dc.vols_dans_les_vehicules_p1k, 0) + 
       COALESCE(dc.vols_d_accessoires_sur_vehicules_p1k, 0)) AS vols_p1k,
      COALESCE(dc.destructions_et_degradations_volontaires_p1k, 0) AS destructions_p1k,
      (COALESCE(dc.usage_de_stupefiants_p1k, 0) + 
       COALESCE(dc.usage_de_stupefiants_afd_p1k, 0) + 
       COALESCE(dc.trafic_de_stupefiants_p1k, 0)) AS stupefiants_p1k,
      COALESCE(dc.escroqueries_p1k, 0) AS escroqueries_p1k,
      ROUND(COALESCE(dn.musulman_pct, 0) + COALESCE(dn.africain_pct, 0) + COALESCE(dn.asiatique_pct, 0)) AS extra_europeen_pct,
      ROUND(COALESCE(dn.traditionnel_pct, 0) + COALESCE(dn.moderne_pct, 0)) AS prenom_francais_pct
    FROM departements d
    LEFT JOIN LatestDepartmentNames dn ON d.departement = dn.dpt
    LEFT JOIN department_crime dc ON d.departement = dc.dep 
      AND dc.annee = (SELECT MAX(annee) FROM department_crime WHERE dep = d.departement)
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ? OFFSET ?
  `;
  db.all(sql, [limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: 'Erreur lors de la requête à la base de données',
        details: err.message,
      });
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