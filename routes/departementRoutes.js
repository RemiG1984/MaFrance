const BaseRoute = require("./base/BaseRoute");
const {
  validateDepartement,
  validateSort,
  validateDirection,
  validatePagination,
} = require("../middleware/validate");

/**
 * Department routes using the BaseRoute factory
 */
class DepartementRoute extends BaseRoute {
  constructor() {
    super({
      enableCache: true,
      cachePrefix: 'departements'
    });

    this.setupRoutes();
  }

  setupRoutes() {
    // GET /api/departements
    this.get('/', this.handleGetAll.bind(this));

    // GET /api/departements/details
    this.get('/details', this.handleGetDetails.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `dept_details_${req.query.dept}`
    });

    // GET /api/departements/names
    this.get('/names', this.handleGetNames.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `dept_names_${req.query.dept}`
    });

    // GET /api/departements/names_history
    this.get('/names_history', this.handleGetNamesHistory.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `dept_names_history_${req.query.dept}`
    });

    // GET /api/departements/crime
    this.get('/crime', this.handleGetCrime.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `dept_crime_${req.query.dept}`
    });

    // GET /api/departements/crime_history
    this.get('/crime_history', this.handleGetCrimeHistory.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `dept_crime_history_${req.query.dept}`
    });

    // GET /api/departements/prefet
    this.get('/prefet', this.handleGetPrefet.bind(this), {
      validators: [validateDepartement],
      cacheKey: (req) => `prefet_${req.query.dept}`
    });
  }

  // Route handlers
  async handleGetAll(req) {
    return await this.createDbHandler(() => ({
      sql: "SELECT DISTINCT departement FROM departements",
      params: []
    }))(req).then(rows => {
      // Sort departments with proper padding
      return rows.sort((a, b) =>
        a.departement
          .padStart(3, "0")
          .localeCompare(b.departement.padStart(3, "0")),
      );
    });
  }

  async handleGetDetails(req) {
    const { dept } = req.query;

    const normalizedDept =
      /^\d+$/.test(dept) && dept.length < 2 ? dept.padStart(2, "0") : dept;

    const sql = `
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
        COALESCE(qpv_stats.total_qpv, 0) as total_qpv,
        COALESCE(qpv_stats.total_population_qpv, 0) as total_population_qpv,
        CASE
          WHEN d.population > 0 THEN (COALESCE(qpv_stats.total_population_qpv, 0) * 100.0 / d.population)
          ELSE 0
        END as pop_in_qpv_pct,
        d.total_places_migrants,
        d.places_migrants_p1k
      FROM departements d
      LEFT JOIN (
        SELECT
          insee_dep,
          COUNT(*) as total_qpv,
          SUM(popMuniQPV) as total_population_qpv
        FROM qpv_data
        GROUP BY insee_dep
      ) qpv_stats ON qpv_stats.insee_dep = ?
      WHERE d.departement = ?
    `;

    return await this.createDbHandler(() => ({ sql, params: [normalizedDept, dept] }), {
      useGet: true,
      requireResults: true,
      notFoundMessage: "Département non trouvé"
    })(req);
  }

  async handleGetNames(req) {
    const { dept } = req.query;

    const sql = `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
                 FROM department_names
                 WHERE dpt = ? AND annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)`;

    return await this.createDbHandler(() => ({ sql, params: [dept, dept] }), {
      useGet: true,
      requireResults: true,
      notFoundMessage: "Données de prénoms non trouvées pour la dernière année"
    })(req);
  }

  async handleGetNamesHistory(req) {
    const { dept } = req.query;

    const sql = `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
                 FROM department_names
                 WHERE dpt = ?
                 ORDER BY annais ASC`;

    return await this.createDbHandler(() => ({ sql, params: [dept] }))(req);
  }

  async handleGetCrime(req) {
    const { dept } = req.query;

    const sql = `SELECT *
                 FROM department_crime
                 WHERE dep = ? AND annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)`;

    return await this.createDbHandler(() => ({ sql, params: [dept, dept] }), {
      useGet: true,
      requireResults: true,
      notFoundMessage: "Données criminelles non trouvées pour la dernière année"
    })(req);
  }

  async handleGetCrimeHistory(req) {
    const { dept } = req.query;

    const sql = `SELECT *
                 FROM department_crime
                 WHERE dep = ?
                 ORDER BY annee ASC`;

    return await this.createDbHandler(() => ({ sql, params: [dept] }))(req);
  }

  async handleGetPrefet(req) {
    const { dept } = req.query;

    const sql = "SELECT prenom, nom, date_poste FROM prefets WHERE code = ?";

    return await this.createDbHandler(() => ({ sql, params: [dept] }), {
      useGet: true,
      requireResults: true,
      notFoundMessage: "Préfet non trouvé"
    })(req);
  }
}

// Create and export the router
const departementRoute = new DepartementRoute();
module.exports = departementRoute.getRouter();

// Also export the class for testing
module.exports.DepartementRoute = DepartementRoute;