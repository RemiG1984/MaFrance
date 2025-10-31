const SearchService = require("../services/searchService");
const BaseRoute = require("./base/BaseRoute");
const { NotFoundError } = require("../middleware/errorHandler");

/**
 * Nuance mapping for political parties
 */
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

/**
 * Commune routes using the BaseRoute factory
 */
class CommuneRoute extends BaseRoute {
  constructor() {
    super({
      enableCache: true,
      cachePrefix: 'communes'
    });

    this.setupRoutes();
  }

  setupRoutes() {
    const validate = this.getMiddleware('validate');

    // GET /api/communes - Search communes by department
    this.get('/', this.handleSearch.bind(this), {
      validators: [validate.validateDepartement, validate.validateSearchQuery]
    });

    // GET /api/communes/suggestions - Autocomplete suggestions
    this.get('/suggestions', this.handleSuggestions.bind(this), {
      validators: [validate.validateDepartement, validate.validateSearchQuery]
    });

    // GET /api/communes/search - Global search
    this.get('/search', this.handleGlobalSearch.bind(this), {
      validators: [validate.validateSearchQuery]
    });

    // GET /api/communes/all - All communes
    this.get('/all', this.handleGetAll.bind(this), {
      cacheKey: () => 'communes:all'
    });

    // GET /api/communes/names - Latest names data
    this.get('/names', this.handleGetNames.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:names:${req.query.cog}`
    });

    // GET /api/communes/names_history - Names history
    this.get('/names_history', this.handleGetNamesHistory.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:names_history:${req.query.cog}`
    });

    // GET /api/communes/crime - Latest crime data
    this.get('/crime', this.handleGetCrime.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:crime:${req.query.cog}`
    });

    // GET /api/communes/crime_history - Crime history
    this.get('/crime_history', this.handleGetCrimeHistory.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:crime_history:${req.query.cog}`
    });

    // GET /api/communes/details - Commune details
    this.get('/details', this.handleGetDetails.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:details:${req.query.cog}`
    });

    // GET /api/communes/maire - Mayor information
    this.get('/maire', this.handleGetMayor.bind(this), {
      validators: [validate.validateCOG],
      cacheKey: (req) => `communes:maire:${req.query.cog}`
    });
  }

  // Route handlers
  async handleSearch(req) {
    const { dept, q = "" } = req.query;
    return await SearchService.searchCommunes(dept, q, 10);
  }

  async handleSuggestions(req) {
    const { dept, q = "" } = req.query;
    return await SearchService.getCommuneSuggestions(dept, q, 5);
  }

  async handleGlobalSearch(req) {
    const { q = "" } = req.query;

    if (!q || q.length < 3) {
      return [];
    }

    return await SearchService.searchCommunesGlobally(q, 15);
  }

  async handleGetAll(req) {
    return await this.createDbHandler(() => ({
      sql: "SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations",
      params: []
    }))(req);
  }

  async handleGetNames(req) {
    const { cog } = req.query;
    return await this.createDbHandler(
      () => ({
        sql: `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
              FROM commune_names
              WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
        params: [cog, cog]
      }),
      {
        useGet: true,
        requireResults: true,
        notFoundMessage: "Données de prénoms non trouvées pour la dernière année"
      }
    )(req);
  }

  async handleGetNamesHistory(req) {
    const { cog } = req.query;
    return await this.createDbHandler(() => ({
      sql: `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
            FROM commune_names
            WHERE COG = ?
            ORDER BY annais ASC`,
      params: [cog]
    }))(req);
  }

  async handleGetCrime(req) {
    const { cog } = req.query;
    return await this.createDbHandler(
      () => ({
        sql: `SELECT *
              FROM commune_crime
              WHERE COG = ? AND annee = (SELECT MAX(annee) FROM commune_crime WHERE COG = ?)`,
        params: [cog, cog]
      }),
      {
        useGet: true,
        requireResults: true,
        notFoundMessage: "Données criminelles non trouvées pour la dernière année"
      }
    )(req);
  }

  async handleGetCrimeHistory(req) {
    const { cog } = req.query;
    return await this.createDbHandler(() => ({
      sql: `SELECT *
            FROM commune_crime
            WHERE COG = ?
            ORDER BY annee ASC`,
      params: [cog]
    }))(req);
  }

  async handleGetDetails(req) {
    const { cog } = req.query;
    return await this.createDbHandler(
      () => ({
        sql: 'SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations WHERE COG = ?',
        params: [cog]
      }),
      {
        useGet: true,
        requireResults: true,
        notFoundMessage: "Commune non trouvée"
      }
    )(req);
  }

  async handleGetMayor(req) {
    const { cog } = req.query;

    // Custom handler for mayor data with political nuance mapping
    const row = await this.createDbHandler(
      () => ({
        sql: "SELECT cog, prenom, nom, date_mandat, famille_nuance, nuance_politique FROM maires WHERE cog = ?",
        params: [cog]
      }),
      {
        useGet: true,
        requireResults: true,
        notFoundMessage: "Maire non trouvé"
      }
    )(req);

    return {
      ...row,
      nuance_politique: nuanceMap[row.nuance_politique] ?? row.nuance_politique,
    };
  }
}

// Create and export the router
const communeRoute = new CommuneRoute();
module.exports = communeRoute.getRouter();