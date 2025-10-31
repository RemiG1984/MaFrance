const BaseRoute = require("./base/BaseRoute");
const { validateCountry } = require("../middleware/validate");

/**
 * Country routes using the BaseRoute factory
 */
class CountryRoute extends BaseRoute {
  constructor() {
    super({
      enableCache: true,
      cachePrefix: 'country'
    });

    this.setupRoutes();
  }

  setupRoutes() {
    const validate = this.getMiddleware('validate');

    // GET /api/country/details
    this.get('/details', this.handleGetDetails.bind(this), {
      validators: [validateCountry],
      cacheKey: (req) => {
        const country = req.query.country;
        return country ? `country_details_${country.toLowerCase()}` : "country_details_all";
      }
    });

    // GET /api/country/names
    this.get('/names', this.handleGetNames.bind(this), {
      validators: [validateCountry],
      cacheKey: (req) => {
        const country = req.query.country;
        return country ? `country_names_${country.toLowerCase()}` : "country_names_all";
      }
    });

    // GET /api/country/names_history
    this.get('/names_history', this.handleGetNamesHistory.bind(this), {
      validators: [validateCountry],
      cacheKey: (req) => {
        const country = req.query.country;
        return country ? `country_names_history_${country.toLowerCase().replace(' ', '_')}` : "country_names_history_all";
      }
    });

    // GET /api/country/crime
    this.get('/crime', this.handleGetCrime.bind(this), {
      cacheKey: (req) => {
        const country = req.query.country;
        return country ? `country_crime_${country.toLowerCase()}` : "country_crime_all";
      }
    });

    // GET /api/country/crime_history
    this.get('/crime_history', this.handleGetCrimeHistory.bind(this), {
      validators: [validateCountry],
      cacheKey: (req) => {
        const country = req.query.country;
        return country ? `country_crime_history_${country.toLowerCase().replace(' ', '_')}` : "country_crime_history_all";
      }
    });

    // GET /api/country/ministre
    this.get('/ministre', this.handleGetMinistre.bind(this), {
      cacheKey: () => "ministre_france"
    });
  }

  // Route handlers
  async handleGetDetails(req) {
    const { country } = req.query;

    let sql = `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k
               FROM country`;
    let params = [];

    if (country) {
      sql += ` WHERE UPPER(country) = ?`;
      params = [country.toUpperCase()];
    }

    return await this.createDbHandler(() => ({ sql, params }), {
      requireResults: true,
      notFoundMessage: "Données pays non trouvées"
    })(req);
  }

  async handleGetNames(req) {
    const { country } = req.query;

    let sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
               FROM country_names`;
    let params = [];

    if (country) {
      sql += ` WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`;
      params = [country.toUpperCase(), country.toUpperCase()];
    } else {
      sql += ` WHERE annais = (SELECT MAX(annais) FROM country_names)`;
    }

    return await this.createDbHandler(() => ({ sql, params }), {
      requireResults: true,
      notFoundMessage: "Données de prénoms non trouvées pour la dernière année"
    })(req);
  }

  async handleGetNamesHistory(req) {
    const { country } = req.query;

    let sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
               FROM country_names
               ORDER BY country, annais ASC`;
    let params = [];

    if (country) {
      sql = `SELECT country, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
             FROM country_names
             WHERE country = ?
             ORDER BY annais ASC`;
      params = [country];
    }

    return await this.createDbHandler(() => ({ sql, params }))(req);
  }

  async handleGetCrime(req) {
    const { country } = req.query;

    let sql = `SELECT *
               FROM country_crime`;
    let params = [];

    if (country) {
      sql += ` WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`;
      params = [country.toUpperCase(), country.toUpperCase()];
    } else {
      sql += ` WHERE annee = (SELECT MAX(annee) FROM country_crime)`;
    }

    return await this.createDbHandler(() => ({ sql, params }), {
      requireResults: true,
      notFoundMessage: "Données criminelles non trouvées pour la dernière année"
    })(req);
  }

  async handleGetCrimeHistory(req) {
    const { country } = req.query;

    let sql = `SELECT *
               FROM country_crime
               ORDER BY country, annee ASC`;
    let params = [];

    if (country) {
      sql = `SELECT *
             FROM country_crime
             WHERE country = ?
             ORDER BY annee ASC`;
      params = [country];
    }

    return await this.createDbHandler(() => ({ sql, params }))(req);
  }

  async handleGetMinistre(req) {
    const sql = `SELECT country, prenom, nom, date_mandat, famille_nuance, nuance_politique
                 FROM ministre_interieur
                 WHERE UPPER(country) = 'FRANCE'
                 ORDER BY date_mandat DESC LIMIT 1`;

    return await this.createDbHandler(() => ({ sql, params: [] }), {
      useGet: true,
      requireResults: true,
      notFoundMessage: "Ministre non trouvé"
    })(req);
  }
}

// Create and export the router
const countryRoute = new CountryRoute();
module.exports = countryRoute.getRouter();

// Also export the class for testing
module.exports.CountryRoute = CountryRoute;