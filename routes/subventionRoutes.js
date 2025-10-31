const express = require('express');
const router = express.Router();
const { createDbHandler } = require('../middleware/errorHandler');
const { validateDepartementParam, validateCOGParam } = require('../middleware/validate');
const { HTTP_NOT_FOUND } = require('../constants');

// Get country subventions
router.get('/country', (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const db = req.app.locals.db;

  db.all(
    `SELECT country, etat_central, autres_organismes_publics, total_subv_commune, total_subv_EPCI, total_subv_dept, total_subv_region, total_subventions_parHab
         FROM country_subventions
         ORDER BY country`,
    [],
    (err, rows) => {
      if (err) {
        return handleDbError(err);
      }

      if (!rows || rows.length === 0) {
        return res.status(HTTP_NOT_FOUND).json({
          error: 'Données de subventions non trouvées'
        });
      }

      res.json(rows);
    }
  );
});

// Get department subventions
router.get('/departement/:dept', validateDepartementParam, (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const db = req.app.locals.db;
  const { dept } = req.params;

  const query = `
        SELECT subvention_region_distributed, subvention_departement, total_subventions_parHab
        FROM department_subventions
        WHERE dep = ?
    `;

  db.get(query, [dept], (err, row) => {
    if (err) {
      return handleDbError(err);
    }

    if (!row) {
      return res
        .status(HTTP_NOT_FOUND)
        .json({
          error: 'Données de subventions non trouvées pour ce département'
        });
    }

    res.json({
      subvention_region_distributed: row.subvention_region_distributed,
      subvention_departement: row.subvention_departement,
      total_subventions_parHab: row.total_subventions_parHab
    });
  });
});

// Get commune subventions
router.get('/commune/:cog', validateCOGParam, (req, res, next) => {
  const handleDbError = createDbHandler(res, next);
  const db = req.app.locals.db;
  const { cog } = req.params;

  const query = `
        SELECT subvention_EPCI_distributed, subvention_commune, total_subventions_parHab
        FROM commune_subventions
        WHERE COG = ?
    `;

  db.get(query, [cog], (err, row) => {
    if (err) {
      return handleDbError(err);
    }

    if (!row) {
      return res
        .status(HTTP_NOT_FOUND)
        .json({
          error: 'Données de subventions non trouvées pour cette commune'
        });
    }

    res.json({
      subvention_EPCI_distributed: row.subvention_EPCI_distributed,
      subvention_commune: row.subvention_commune,
      total_subventions_parHab: row.total_subventions_parHab
    });
  });
});

router.get('/subventions', validateDepartementParam, (_req, res) => {
  res.json({ message: 'Subventions endpoint' });
});

module.exports = router;
