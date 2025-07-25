const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
  validateDepartement,
  validateCOG,
  validateSearchQuery,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
  validateDeptAndCOG,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  return next(error);
};

// GET /api/communes
router.get("/", [validateDepartement, validateSearchQuery], (req, res) => {
  const { dept, q = "" } = req.query;

  if (!q) {
    db.all(
      `SELECT DISTINCT commune, COG 
       FROM locations 
       WHERE departement = ? 
       ORDER BY commune ASC 
       LIMIT 10`,
      [dept],
      (err, rows) => {
        if (err) return handleDbError(res, err);
        res.json(rows);
      },
    );
    return;
  }

  const normalizedQuery = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  db.all(
    `SELECT DISTINCT commune, COG 
     FROM locations 
     WHERE departement = ?`,
    [dept],
    (err, rows) => {
      if (err) return handleDbError(res, err);

      const filteredCommunes = rows
        .filter((row) =>
          row.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .includes(normalizedQuery),
        )
        .sort((a, b) => {
          const normA = a.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const normB = b.commune
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          // 1. Prioritize exact matches
          const isExactA = normA === normalizedQuery;
          const isExactB = normB === normalizedQuery;
          if (isExactA && !isExactB) return -1;
          if (!isExactA && isExactB) return 1;

          // 2. Prioritize startsWith
          const startsA = normA.startsWith(normalizedQuery);
          const startsB = normB.startsWith(normalizedQuery);
          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;

          // 3. Sort alphabetically
          return a.commune.localeCompare(b.commune);
        })
        .slice(0, 5);

      res.json(filteredCommunes);
    },
  );
});

// GET /api/communes/all
router.get("/all", (req, res) => {
  db.all(
    "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct FROM locations",
    [],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/communes/names
router.get("/names", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM commune_names 
     WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res.status(404).json({
          error: "Données de prénoms non trouvées pour la dernière année",
        });
      res.json(row);
    },
  );
});

// GET /api/communes/names_history
router.get("/names_history", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM commune_names 
     WHERE COG = ? 
     ORDER BY annais ASC`,
    [cog],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/communes/crime
router.get("/crime", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    `SELECT * 
     FROM commune_crime 
     WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
    [cog, cog],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row)
        return res.status(404).json({
          error: "Données criminelles non trouvées pour la dernière année",
        });
      res.json(row);
    },
  );
});

// GET /api/communes/crime_history
router.get("/crime_history", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.all(
    `SELECT *
     FROM commune_crime 
     WHERE COG = ? 
     ORDER BY annee ASC`,
    [cog],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    },
  );
});

// GET /api/communes/details
router.get("/details", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct FROM locations WHERE COG = ?",
    [cog],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Commune non trouvée" });
      res.json(row);
    },
  );
});

const nuanceMap = {
  LEXG: "Extrême gauche",
  LCOM: "Parti Communiste",
  LFI: "France Insoumise",
  LSOC: "Parti Socialiste",
  LRDG: "Parti radical de gauche",
  LDVG: "Divers gauche",
  LUG: "Liste d'Union de la gauche",
  LVEC: "Europe Ecologie",
  LECO: "Liste autre écologiste",
  LDIV: "Liste divers",
  LREG: "Liste régionaliste",
  LGJ: "Liste gilets jaunes",
  LREM: "La République en marche",
  LMDM: "Modem",
  LUDI: "UDI",
  LUC: "Liste union du centre",
  LDVC: "Liste divers centre",
  LLR: "Les Républicains",
  LUD: "Liste union de la droite",
  LDVD: "Liste divers droite",
  LDLF: "Debout la France",
  LRN: "Rassemblement National",
  LEXD: "Liste d'extrême droite",
  NC: "",
};

// GET /api/communes/maire
router.get("/maire", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    "SELECT cog, commune, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique FROM maires WHERE cog = ?",
    [cog],
    (err, row) => {
      if (err) return handleDbError(res, err);
      if (!row) return res.status(404).json({ error: "Maire non trouvé" });

      // Map the nuance_politique code to its full description
      const response = {
        ...row,
        nuance_politique:
          nuanceMap[row.nuance_politique] || row.nuance_politique,
      };

      res.json(response);
    },
  );
});

module.exports = router;
