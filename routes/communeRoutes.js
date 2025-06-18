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

// GET /api/communes
router.get("/", [validateDepartement, validateSearchQuery], (req, res) => {
  const { dept, q = "" } = req.query;
  console.log("GET /api/communes - Request params:", { dept, q });

  if (!q || q.length < 2) {
    const sql = `SELECT DISTINCT commune, COG 
       FROM locations 
       WHERE departement = ? 
       ORDER BY commune ASC 
       LIMIT 10`;
    console.log("Executing SQL (no query):", sql, "with params:", [dept]);
    
    db.all(sql, [dept], (err, rows) => {
        if (err) {
          console.error("Database error in /api/communes:", err);
          return res.status(500).json({
            error: "Erreur lors de la requête à la base de données",
            details: err.message,
          });
        }
        console.log("Query result (no search):", rows?.length || 0, "rows");
        res.json(rows);
      },
    );
    return;
  }

  const normalizedQuery = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  console.log("Normalized search query:", normalizedQuery);

  const sql = `SELECT DISTINCT commune, COG 
     FROM locations 
     WHERE departement = ?`;
  console.log("Executing SQL (with search):", sql, "with params:", [dept]);

  db.all(sql, [dept], (err, rows) => {
      if (err) {
        console.error("Database error in /api/communes (search):", err);
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }

      console.log("Raw query result:", rows?.length || 0, "rows for dept", dept);

      const filteredCommunes = rows.filter((row) => {
        const normalizedCommune = row.commune
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return normalizedCommune.includes(normalizedQuery);
      });

      console.log("Filtered communes:", filteredCommunes.length, "matches for query:", q);

      filteredCommunes.sort((a, b) => {
        const normA = a.commune
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const normB = b.commune
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const aStartsWith = normA.startsWith(normalizedQuery) ? -1 : 0;
        const bStartsWith = normB.startsWith(normalizedQuery) ? -1 : 0;
        return aStartsWith !== bStartsWith
          ? aStartsWith - bStartsWith
          : a.commune.localeCompare(b.commune);
      });

      const result = filteredCommunes.slice(0, 5);
      console.log("Final result:", result.length, "communes returned");
      res.json(result);
    },
  );
});

// GET /api/communes/all
router.get("/all", (req, res) => {
  db.all(
    "SELECT COG, departement, commune, population, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k FROM locations",
    [],
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

// GET /api/communes/details_all
router.get(
  "/details_all",
  [
    validateDepartement,
    validateSort,
    validateDirection,
    validatePagination,
    validatePopulationRange,
  ],
  (req, res) => {
    const {
      dept = "",
      limit = 20,
      offset = 0,
      sort = "insecurite_score",
      direction = "DESC",
      population_range = "",
    } = req.query;

    const validSortColumns = [
      "total_score",
      "population",
      "insecurite_score",
      "immigration_score",
      "islamisation_score",
      "defrancisation_score",
      "wokisme_score",
      "number_of_mosques",
      "mosque_p100k",
      "musulman_pct",
      "africain_pct",
      "asiatique_pct",
      "traditionnel_pct",
      "moderne_pct",
      "violences_physiques_p1k",
      "violences_sexuelles_p1k",
      "vols_p1k",
      "destructions_p1k",
      "stupefiants_p1k",
      "escroqueries_p1k",
      "extra_europeen_pct",
      "prenom_francais_pct",
    ];
    const sortColumn = validSortColumns.includes(sort)
      ? sort
      : "insecurite_score";
    const sortDirection = direction === "ASC" ? "ASC" : "DESC";

    let populationFilter = "";
    let queryParams = [dept, dept, limit, offset];
    if (population_range) {
      switch (population_range) {
        case "0-1000":
          populationFilter = "AND l.population < 1000";
          break;
        case "1000-10000":
          populationFilter =
            "AND l.population >= 1000 AND l.population < 10000";
          break;
        case "10000+":
          populationFilter = "AND l.population >= 10000";
          break;
      }
    }

    let sortExpression;
    switch (sortColumn) {
      case "total_score":
        sortExpression = `(COALESCE(l.insecurite_score, 0) + COALESCE(l.immigration_score, 0) + COALESCE(l.islamisation_score, 0) + COALESCE(l.defrancisation_score, 0) + COALESCE(l.wokisme_score, 0))`;
        break;
      case "violences_physiques_p1k":
        sortExpression = `(COALESCE(cc.coups_et_blessures_volontaires_p1k, 0) + COALESCE(cc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + COALESCE(cc.autres_coups_et_blessures_volontaires_p1k, 0) + COALESCE(cc.vols_avec_armes_p1k, 0) + COALESCE(cc.vols_violents_sans_arme_p1k, 0))`;
        break;
      case "violences_sexuelles_p1k":
        sortExpression = `COALESCE(cc.violences_sexuelles_p1k, 0)`;
        break;
      case "vols_p1k":
        sortExpression = `(COALESCE(cc.vols_avec_armes_p1k, 0) + COALESCE(cc.vols_violents_sans_arme_p1k, 0) + COALESCE(cc.vols_sans_violence_contre_des_personnes_p1k, 0) + COALESCE(cc.cambriolages_de_logement_p1k, 0) + COALESCE(cc.vols_de_vehicules_p1k, 0) + COALESCE(cc.vols_dans_les_vehicules_p1k, 0) + COALESCE(cc.vols_d_accessoires_sur_vehicules_p1k, 0))`;
        break;
      case "destructions_p1k":
        sortExpression = `COALESCE(cc.destructions_et_degradations_volontaires_p1k, 0)`;
        break;
      case "stupefiants_p1k":
        sortExpression = `(COALESCE(cc.usage_de_stupefiants_p1k, 0) + COALESCE(cc.usage_de_stupefiants_afd_p1k, 0) + COALESCE(cc.trafic_de_stupefiants_p1k, 0))`;
        break;
      case "escroqueries_p1k":
        sortExpression = `COALESCE(cc.escroqueries_p1k, 0)`;
        break;
      case "extra_europeen_pct":
        sortExpression = `(COALESCE(cn.musulman_pct, 0) + COALESCE(cn.africain_pct, 0) + COALESCE(cn.asiatique_pct, 0))`;
        break;
      case "prenom_francais_pct":
        sortExpression = `(COALESCE(cn.traditionnel_pct, 0) + COALESCE(cn.moderne_pct, 0))`;
        break;
      default:
        sortExpression = `l.${sortColumn}`;
    }

    const sql = `
    WITH LatestCommuneNames AS (
      SELECT COG, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM commune_names cn
      WHERE cn.annais = (SELECT MAX(annais) FROM commune_names WHERE COG = cn.COG)
      GROUP BY COG
    )
    SELECT 
      l.COG, l.departement, l.commune, l.population, l.insecurite_score, 
      l.immigration_score, l.islamisation_score, l.defrancisation_score, 
      l.wokisme_score, l.number_of_mosques, l.mosque_p100k,
      (COALESCE(l.insecurite_score, 0) + COALESCE(l.immigration_score, 0) + COALESCE(l.islamisation_score, 0) + COALESCE(l.defrancisation_score, 0) + COALESCE(l.wokisme_score, 0)) AS total_score,
      cn.musulman_pct, cn.africain_pct, cn.asiatique_pct, cn.traditionnel_pct, 
      cn.moderne_pct, cn.annais,
      (COALESCE(cc.coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(cc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
       COALESCE(cc.autres_coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(cc.vols_avec_armes_p1k, 0) + 
       COALESCE(cc.vols_violents_sans_arme_p1k, 0)) AS violences_physiques_p1k,
      COALESCE(cc.violences_sexuelles_p1k, 0) AS violences_sexuelles_p1k,
      (COALESCE(cc.vols_avec_armes_p1k, 0) + 
       COALESCE(cc.vols_violents_sans_arme_p1k, 0) + 
       COALESCE(cc.vols_sans_violence_contre_des_personnes_p1k, 0) + 
       COALESCE(cc.cambriolages_de_logement_p1k, 0) + 
       COALESCE(cc.vols_de_vehicules_p1k, 0) + 
       COALESCE(cc.vols_dans_les_vehicules_p1k, 0) + 
       COALESCE(cc.vols_d_accessoires_sur_vehicules_p1k, 0)) AS vols_p1k,
      COALESCE(cc.destructions_et_degradations_volontaires_p1k, 0) AS destructions_p1k,
      (COALESCE(cc.usage_de_stupefiants_p1k, 0) + 
       COALESCE(cc.usage_de_stupefiants_afd_p1k, 0) + 
       COALESCE(cc.trafic_de_stupefiants_p1k, 0)) AS stupefiants_p1k,
      COALESCE(cc.escroqueries_p1k, 0) AS escroqueries_p1k,
      (COALESCE(cn.musulman_pct, 0) + COALESCE(cn.africain_pct, 0) + COALESCE(cn.asiatique_pct, 0)) AS extra_europeen_pct,
      (COALESCE(cn.traditionnel_pct, 0) + COALESCE(cn.moderne_pct, 0)) AS prenom_francais_pct
    FROM locations l
    LEFT JOIN LatestCommuneNames cn ON l.COG = cn.COG
    LEFT JOIN commune_crime cc ON l.COG = cc.COG 
      AND cc.annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = l.COG)
    WHERE l.departement = ? OR ? = ''
    ${populationFilter}
    ORDER BY ${sortExpression} ${sortDirection}, l.COG ASC
    LIMIT ? OFFSET ?
  `;

    const countSql = `
    SELECT COUNT(*) as total_count
    FROM locations l
    WHERE l.departement = ? OR ? = ''
    ${populationFilter}
  `;

    db.all(sql, queryParams, (err, rows) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      db.get(countSql, [dept, dept], (countErr, countRow) => {
        if (countErr) {
          return res.status(500).json({
            error: "Erreur lors de la requête de comptage",
            details: countErr.message,
          });
        }
        res.json({
          data: rows,
          total_count: countRow.total_count,
        });
      });
    });
  },
);

// GET /api/communes/names
router.get("/names", validateDeptAndCOG, (req, res) => {
  const { dept, cog } = req.query;
  db.get(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
     FROM commune_names 
     WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
    [cog, cog],
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

// GET /api/communes/names_history
router.get("/names_history", validateDeptAndCOG, (req, res) => {
  const { cog } = req.query;
  db.all(
    `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
     FROM commune_names 
     WHERE COG = ? 
     ORDER BY annais ASC`,
    [cog],
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

// GET /api/communes/crime
router.get("/crime", validateDeptAndCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    `SELECT * 
     FROM commune_crime 
     WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
    [cog, cog],
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

// GET /api/communes/crime_history
router.get("/crime_history", validateDeptAndCOG, (req, res) => {
  const { cog } = req.query;
  db.all(
    `SELECT *
     FROM commune_crime 
     WHERE COG = ? 
     ORDER BY annee ASC`,
    [cog],
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

// GET /api/communes/maire
router.get("/maire", validateCOG, (req, res) => {
  const { cog } = req.query;
  db.get(
    "SELECT cog, commune, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique FROM maires WHERE cog = ?",
    [cog],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: "Erreur lors de la requête à la base de données",
          details: err.message,
        });
      }
      if (!row) {
        return res.status(404).json({ error: "Maire non trouvé" });
      }
      res.json(row);
    },
  );
});

module.exports = router;
