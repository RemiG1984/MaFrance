const express = require("express");
const router = express.Router();
const db = require("../config/db");
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

    // Handle dynamic population ranges
    if (population_range) {
      // Parse range patterns: "min-max", "min+", "0-max"
      const rangeMatch = population_range.match(/^(\d+)-(\d+)$/);
      const minOnlyMatch = population_range.match(/^(\d+)\+$/);
      const maxOnlyMatch = population_range.match(/^0-(\d+)$/);

      if (rangeMatch) {
        // Range: min-max
        const minPop = parseInt(rangeMatch[1], 10);
        const maxPop = parseInt(rangeMatch[2], 10);
        if (minPop >= 0 && maxPop > minPop && maxPop <= 10000000) {
          populationFilter = `AND l.population >= ${minPop} AND l.population <= ${maxPop}`;
        } else {
          return res.status(400).json({
            error: "Plage de population invalide. Format attendu: 'min-max' où min < max et max <= 10000000",
          });
        }
      } else if (minOnlyMatch) {
        // Minimum only: min+
        const minPop = parseInt(minOnlyMatch[1], 10);
        if (minPop >= 0 && minPop <= 10000000) {
          populationFilter = `AND l.population >= ${minPop}`;
        } else {
          return res.status(400).json({
            error: "Population minimum invalide. Doit être entre 0 et 10000000",
          });
        }
      } else if (maxOnlyMatch) {
        // Maximum only: 0-max
        const maxPop = parseInt(maxOnlyMatch[1], 10);
        if (maxPop > 0 && maxPop <= 10000000) {
          populationFilter = `AND l.population <= ${maxPop}`;
        } else {
          return res.status(400).json({
            error: "Population maximum invalide. Doit être entre 1 et 10000000",
          });
        }
      } else {
        return res.status(400).json({
          error: "Format de plage de population invalide. Formats attendus: 'min-max', 'min+', '0-max'",
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
      l.Total_places_migrants,
      l.places_migrants_p1k,
      (COALESCE(l.insecurite_score, 0) + COALESCE(l.immigration_score, 0) + COALESCE(l.islamisation_score, 0) + COALESCE(l.defrancisation_score, 0) + COALESCE(l.wokisme_score, 0)) / 5 AS total_score,
      cn.musulman_pct, 
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
      COALESCE(cs.total_subventions_parHab, 0) AS total_subventions_parHab,
      -- NAT1 computed percentage fields
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND((COALESCE(cnat1.Etrangers, 0) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS etrangers_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND((COALESCE(cnat1.Francais_de_naissance, 0) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS francais_de_naissance_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND((COALESCE(cnat1.Francais_par_acquisition, 0) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS naturalises_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND(((COALESCE(cnat1.Portugais, 0) + COALESCE(cnat1.Italiens, 0) + COALESCE(cnat1.Espagnols, 0) + COALESCE(cnat1.Autres_nationalites_de_l_UE, 0) + COALESCE(cnat1.Autres_nationalites_d_Europe, 0)) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS europeens_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND(((COALESCE(cnat1.Algeriens, 0) + COALESCE(cnat1.Marocains, 0) + COALESCE(cnat1.Tunisiens, 0) + COALESCE(cnat1.Turcs, 0)) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS maghrebins_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND((COALESCE(cnat1.Autres_nationalites_d_Afrique, 0) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS africains_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND((COALESCE(cnat1.Autres_nationalites, 0) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS autres_nationalites_pct,
      CASE WHEN cnat1.Ensemble > 0 THEN ROUND(((COALESCE(cnat1.Algeriens, 0) + COALESCE(cnat1.Marocains, 0) + COALESCE(cnat1.Tunisiens, 0) + COALESCE(cnat1.Turcs, 0) + COALESCE(cnat1.Autres_nationalites_d_Afrique, 0) + COALESCE(cnat1.Autres_nationalites, 0)) / cnat1.Ensemble) * 100, 2) ELSE 0 END AS non_europeens_pct
    FROM locations l
    LEFT JOIN LatestCommuneNames cn ON l.COG = cn.COG
    LEFT JOIN commune_crime cc ON l.COG = cc.COG 
      AND cc.annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = l.COG)
    LEFT JOIN commune_subventions cs ON l.COG = cs.COG
    LEFT JOIN commune_nat1 cnat1 ON l.COG = cnat1.Code
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

    // Try to get cached data first
    const cacheService = require('../services/cacheService');
    const cachedData = cacheService.get('department_rankings');

    if (cachedData) {
      // Sort the cached data
      const sortedData = [...cachedData].sort((a, b) => {
        const aValue = a[sort] || 0;
        const bValue = b[sort] || 0;

        if (direction === 'DESC') {
          if (bValue !== aValue) return bValue - aValue;
          // Secondary sort by departement code
          return b.departement.localeCompare(a.departement);
        } else {
          if (aValue !== bValue) return aValue - bValue;
          // Secondary sort by departement code
          return a.departement.localeCompare(b.departement);
        }
      });

      // Apply pagination
      const paginatedData = sortedData.slice(offset, offset + parseInt(limit));

      res.json({
        data: paginatedData,
        total_count: sortedData.length,
      });
      return;
    }

    // Fallback to database query if cache is empty
    const sql = `
    WITH LatestDepartmentNames AS (
      SELECT dpt, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
      FROM department_names dn
      WHERE dn.annais = (SELECT MAX(annais) FROM department_names WHERE dpt = dn.dpt)
      GROUP BY dpt
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
      d.Total_places_migrants,
      d.places_migrants_p1k,
      (COALESCE(d.insecurite_score, 0) + COALESCE(d.immigration_score, 0) + COALESCE(d.islamisation_score, 0) + COALESCE(d.defrancisation_score, 0) + COALESCE(d.wokisme_score, 0)) /5 AS total_score,
      dn.musulman_pct, 
      (COALESCE(dc.homicides_p100k, 0) + COALESCE(dc.tentatives_homicides_p100k, 0)) AS homicides_total_p100k,
      ROUND((COALESCE(dc.coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(dc.coups_et_blessures_volontaires_intrafamiliaux_p1k, 0) + 
       COALESCE(dc.autres_coups_et_blessures_volontaires_p1k, 0) + 
       COALESCE(dc.vols_avec_armes_p1k, 0) + 
       COALESCE(dc.vols_violents_sans_arme_p1k, 0)),2) AS violences_physiques_p1k,
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
      (COALESCE(dn.musulman_pct, 0) + COALESCE(dn.africain_pct, 0) + COALESCE(dn.asiatique_pct, 0)) AS extra_europeen_pct,
      (COALESCE(dn.traditionnel_pct, 0) + COALESCE(dn.moderne_pct, 0)) AS prenom_francais_pct,
      COALESCE(ds.total_subventions_parHab, 0) AS total_subventions_parHab,
      -- NAT1 computed percentage fields
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND((COALESCE(dnat1.Etrangers, 0) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS etrangers_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND((COALESCE(dnat1.Francais_de_naissance, 0) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS francais_de_naissance_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND((COALESCE(dnat1.Francais_par_acquisition, 0) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS naturalises_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND(((COALESCE(dnat1.Portugais, 0) + COALESCE(dnat1.Italiens, 0) + COALESCE(dnat1.Espagnols, 0) + COALESCE(dnat1.Autres_nationalites_de_l_UE, 0) + COALESCE(dnat1.Autres_nationalites_d_Europe, 0)) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS europeens_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND(((COALESCE(dnat1.Algeriens, 0) + COALESCE(dnat1.Marocains, 0) + COALESCE(dnat1.Tunisiens, 0) + COALESCE(dnat1.Turcs, 0)) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS maghrebins_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND((COALESCE(dnat1.Autres_nationalites_d_Afrique, 0) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS africains_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND((COALESCE(dnat1.Autres_nationalites, 0) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS autres_nationalites_pct,
      CASE WHEN dnat1.Ensemble > 0 THEN ROUND(((COALESCE(dnat1.Algeriens, 0) + COALESCE(dnat1.Marocains, 0) + COALESCE(dnat1.Tunisiens, 0) + COALESCE(dnat1.Turcs, 0) + COALESCE(dnat1.Autres_nationalites_d_Afrique, 0) + COALESCE(dnat1.Autres_nationalites, 0)) / dnat1.Ensemble) * 100, 2) ELSE 0 END AS non_europeens_pct
    FROM departements d
    LEFT JOIN LatestDepartmentNames dn ON d.departement = dn.dpt
    LEFT JOIN department_crime dc ON d.departement = dc.dep 
      AND dc.annee = (SELECT MAX(annee) FROM department_crime WHERE dep = d.departement)
    LEFT JOIN department_subventions ds ON d.departement = ds.dep
    LEFT JOIN department_nat1 dnat1 ON d.departement = dnat1.Code
    ORDER BY ${sort} ${direction}
    LIMIT ? OFFSET ?
  `;

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