const express = require("express");
const router = express.Router();
const {
  validateDepartement,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
} = require("../middleware/validate");

// Centralized error handler for database queries
const handleDbError = (err, res, next) => {
  const error = new Error("Erreur lors de la requête à la base de données");
  error.status = 500;
  error.details = err.message;
  console.error("Database error:", err.message);
  return next(error);
};

// GET /api/rankings/communes
router.get(
  "/communes",
  [
    validateDepartement,
    validateSort,
    validateDirection,
    validatePagination,
    validatePopulationRange,
  ],
  (req, res, next) => {
    const {
      dept = "",
      limit = 20,
      offset = 0,
      sort = "insecurite_score",
      direction = "DESC",
      population_range = "",
    } = req.query;

    let populationFilter = "";
    let queryParams = [dept, dept, limit, offset];

    // Handle predefined population ranges
    if (population_range) {
      switch (population_range) {
        case "0-1k":
          populationFilter = "AND l.population <= 1000";
          break;
        case "0-10k":
          populationFilter = "AND l.population <= 10000";
          break;
        case "0-100k":
          populationFilter = "AND l.population <= 100000";
          break;
        case "0+":
          populationFilter = ""; // No filter needed
          break;
        case "1-10k":
          populationFilter =
            "AND l.population >= 1000 AND l.population <= 10000";
          break;
        case "1-100k":
          populationFilter =
            "AND l.population >= 1000 AND l.population <= 100000";
          break;
        case "1k+":
          populationFilter = "AND l.population >= 1000";
          break;
        case "10-100k":
          populationFilter =
            "AND l.population >= 10000 AND l.population <= 100000";
          break;
        case "10k+":
          populationFilter = "AND l.population >= 10000";
          break;
        case "100k+":
          populationFilter = "AND l.population >= 100000";
          break;
        default:
          return res.status(400).json({
            error:
              "Plage de population invalide. Valeurs autorisées : 0-1k, 0-10k, 0-100k, 0+, 1-10k, 1-100k, 1k+, 10-100k, 10k+, 100k+",
          });
      }
    }

    // Set secondary sort direction based on primary sort direction
    const secondarySort = direction === "DESC" ? "l.COG DESC" : "l.COG ASC";

    const sql = `
    WITH LatestCommuneNames AS (
      SELECT COG, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM commune_names cn
      WHERE cn.annais = (SELECT MAX(annais) FROM commune_names WHERE COG = cn.COG)
      GROUP BY COG
    ),
    CommuneMigrantStats AS (
      SELECT 
        COG,
        SUM(COALESCE(places, 0)) AS Total_places_migrants,
        CASE 
          WHEN l.population > 0 THEN (SUM(COALESCE(places, 0)) * 1000.0) / l.population
          ELSE 0 
        END AS places_migrants_p1k
      FROM migrant_centers mc
      LEFT JOIN locations l ON mc.COG = l.COG
      GROUP BY mc.COG
    ),
    CommuneSubventionStats AS (
      SELECT 
        COG,
        COALESCE(SUM(
          COALESCE(cs.aide_exceptionnelle_etat_covid, 0) +
          COALESCE(cs.aide_exceptionnelle_etat_investissement, 0) +
          COALESCE(cs.fonds_national_amenagement_territoire, 0) +
          COALESCE(cs.dotation_equipement_territoires_ruraux, 0) +
          COALESCE(cs.dotation_soutien_investissement_local, 0) +
          COALESCE(cs.fonds_interministeriel_prevention_delinquance, 0) +
          COALESCE(cs.plan_france_relance, 0) +
          COALESCE(cs.autres_subventions, 0)
        ), 0) AS total_subventions,
        CASE 
          WHEN l.population > 0 THEN 
            COALESCE(SUM(
              COALESCE(cs.aide_exceptionnelle_etat_covid, 0) +
              COALESCE(cs.aide_exceptionnelle_etat_investissement, 0) +
              COALESCE(cs.fonds_national_amenagement_territoire, 0) +
              COALESCE(cs.dotation_equipement_territoires_ruraux, 0) +
              COALESCE(cs.dotation_soutien_investissement_local, 0) +
              COALESCE(cs.fonds_interministeriel_prevention_delinquance, 0) +
              COALESCE(cs.plan_france_relance, 0) +
              COALESCE(cs.autres_subventions, 0)
            ), 0) / l.population
          ELSE 0 
        END AS total_subventions_parHab
      FROM commune_subventions cs
      LEFT JOIN locations l ON cs.COG = l.COG
      GROUP BY cs.COG
    )
    SELECT 
      l.COG, 
      l.departement, 
      l.commune, 
      l.population, 
      l.logements_sociaux_pct,
      l.insecurite_score, 
      l.immigration_score, 
      l.islamisation_score, 
      l.defrancisation_score, 
      l.wokisme_score, 
      l.number_of_mosques, 
      l.mosque_p100k,
      l.total_qpv,
      l.pop_in_qpv_pct,
      (COALESCE(l.insecurite_score, 0) + COALESCE(l.immigration_score, 0) + COALESCE(l.islamisation_score, 0) + COALESCE(l.defrancisation_score, 0) + COALESCE(l.wokisme_score, 0)) / 5 AS total_score,
      cn.musulman_pct, 
      cn.africain_pct, 
      cn.asiatique_pct, 
      cn.traditionnel_pct, 
      cn.moderne_pct, 
      cn.annais,
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
      (COALESCE(cn.traditionnel_pct, 0) + COALESCE(cn.moderne_pct, 0)) AS prenom_francais_pct,
      COALESCE(css.total_subventions_parHab, 0) AS total_subventions_parHab,
      COALESCE(cms.Total_places_migrants, 0) AS Total_places_migrants,
      COALESCE(cms.places_migrants_p1k, 0) AS places_migrants_p1k
    FROM locations l
    LEFT JOIN LatestCommuneNames cn ON l.COG = cn.COG
    LEFT JOIN commune_crime cc ON l.COG = cc.COG 
      AND cc.annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = l.COG)
    LEFT JOIN CommuneMigrantStats cms ON l.COG = cms.COG
    LEFT JOIN CommuneSubventionStats css ON l.COG = css.COG
    WHERE (l.departement = ? OR ? = '')
    ${populationFilter}
    ORDER BY ${sort} ${direction}, ${secondarySort}
    LIMIT ? OFFSET ?
  `;

    const countSql = `
    SELECT COUNT(*) as total_count
    FROM locations l
    WHERE (l.departement = ? OR ? = '')
    ${populationFilter}
  `;

    // Adjust countSql parameters to match populationFilter
    const countParams = populationFilter
      ? queryParams.slice(0, queryParams.length - 2)
      : [dept, dept];

    const db = req.app.locals.db;
    db.all(sql, queryParams, (err, rows) => {
      if (err) return handleDbError(err, res, next);
      db.get(countSql, countParams, (countErr, countRow) => {
        if (countErr) return handleDbError(countErr, res, next);
        res.json({
          data: rows,
          total_count: countRow.total_count,
        });
      });
    });
  },
);

// GET /api/rankings/departements
router.get(
  "/departements",
  [validateSort, validateDirection, validatePagination],
  (req, res, next) => {
    const {
      limit = 101,
      offset = 0,
      sort = "insecurite_score",
      direction = "DESC",
    } = req.query;

    const sql = `
    WITH LatestDepartmentNames AS (
      SELECT dpt, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM department_names dn
      WHERE dn.annais = (SELECT MAX(annais) FROM department_names WHERE dpt = dn.dpt)
      GROUP BY dpt
    ),
    DepartmentMigrantStats AS (
      SELECT 
        departement,
        SUM(COALESCE(places, 0)) AS Total_places_migrants,
        CASE 
          WHEN d.population > 0 THEN (SUM(COALESCE(places, 0)) * 1000.0) / d.population
          ELSE 0 
        END AS places_migrants_p1k
      FROM migrant_centers mc
      LEFT JOIN departements d ON mc.departement = d.departement
      GROUP BY mc.departement
    ),
    DepartmentSubventionStats AS (
      SELECT 
        dep,
        COALESCE(SUM(
          COALESCE(ds.aide_exceptionnelle_etat_covid, 0) +
          COALESCE(ds.aide_exceptionnelle_etat_investissement, 0) +
          COALESCE(ds.fonds_national_amenagement_territoire, 0) +
          COALESCE(ds.dotation_equipement_territoires_ruraux, 0) +
          COALESCE(ds.dotation_soutien_investissement_local, 0) +
          COALESCE(ds.fonds_interministeriel_prevention_delinquance, 0) +
          COALESCE(ds.plan_france_relance, 0) +
          COALESCE(ds.autres_subventions, 0)
        ), 0) AS total_subventions,
        CASE 
          WHEN d.population > 0 THEN 
            COALESCE(SUM(
              COALESCE(ds.aide_exceptionnelle_etat_covid, 0) +
              COALESCE(ds.aide_exceptionnelle_etat_investissement, 0) +
              COALESCE(ds.fonds_national_amenagement_territoire, 0) +
              COALESCE(ds.dotation_equipement_territoires_ruraux, 0) +
              COALESCE(ds.dotation_soutien_investissement_local, 0) +
              COALESCE(ds.fonds_interministeriel_prevention_delinquance, 0) +
              COALESCE(ds.plan_france_relance, 0) +
              COALESCE(ds.autres_subventions, 0)
            ), 0) / d.population
          ELSE 0 
        END AS total_subventions_parHab
      FROM department_subventions ds
      LEFT JOIN departements d ON ds.dep = d.departement
      GROUP BY ds.dep
    )
    SELECT 
      d.departement, 
      d.population, 
      d.logements_sociaux_pct,
      d.insecurite_score, 
      d.immigration_score, 
      d.islamisation_score, 
      d.defrancisation_score, 
      d.wokisme_score, 
      d.number_of_mosques, 
      d.mosque_p100k,
      d.total_qpv,
      d.pop_in_qpv_pct,
      (COALESCE(d.insecurite_score, 0) + COALESCE(d.immigration_score, 0) + COALESCE(d.islamisation_score, 0) + COALESCE(d.defrancisation_score, 0) + COALESCE(d.wokisme_score, 0)) /5 AS total_score,
      dn.musulman_pct, 
      dn.africain_pct, 
      dn.asiatique_pct, 
      dn.traditionnel_pct, 
      dn.moderne_pct, 
      dn.annais,
      (COALESCE(dc.homicides_p100k, 0) + COALESCE(dc.tentatives_homicides_p100k, 0)) AS homicides_total_p100k,
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
      ROUND(COALESCE(dn.traditionnel_pct, 0) + COALESCE(dn.moderne_pct, 0)) AS prenom_francais_pct,
      COALESCE(dss.total_subventions_parHab, 0) AS total_subventions_parHab,
      COALESCE(dms.Total_places_migrants, 0) AS Total_places_migrants,
      COALESCE(dms.places_migrants_p1k, 0) AS places_migrants_p1k
    FROM departements d
    LEFT JOIN LatestDepartmentNames dn ON d.departement = dn.dpt
    LEFT JOIN department_crime dc ON d.departement = dc.dep 
      AND dc.annee = (SELECT MAX(annee) FROM department_crime WHERE dep = d.departement)
    LEFT JOIN DepartmentMigrantStats dms ON d.departement = dms.departement
    LEFT JOIN DepartmentSubventionStats dss ON d.departement = dss.dep
    ORDER BY ${sort} ${direction}
    LIMIT ? OFFSET ?
  `;

    const db = req.app.locals.db;
    db.all(sql, [limit, offset], (err, rows) => {
      if (err) return handleDbError(err, res, next);
      res.json({
        data: rows,
        total_count: rows.length,
      });
    });
  },
);

module.exports = router;
