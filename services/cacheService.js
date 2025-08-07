
const db = require('../config/db');

class CacheService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Preload critical data on startup
        this.initializeCache();
    }

    async initializeCache() {
        try {
            console.log('Initializing server-side cache...');
            
            // Preload all department data
            await this.preloadDepartmentData();
            
            // Preload country data
            await this.preloadCountryData();
            
            console.log('Server-side cache initialized successfully');
        } catch (error) {
            console.error('Error initializing cache:', error);
        }
    }

    async preloadDepartmentData() {
        return new Promise((resolve, reject) => {
            // Get all departments
            db.all("SELECT DISTINCT departement FROM departements ORDER BY departement", [], async (err, depts) => {
                if (err) return reject(err);
                
                const promises = depts.map(async ({ departement }) => {
                    try {
                        // Cache department details
                        await this.cacheDepartmentDetails(departement);
                        
                        // Cache crime history
                        await this.cacheDepartmentCrimeHistory(departement);
                        
                        // Cache names history
                        await this.cacheDepartmentNamesHistory(departement);
                        
                        // Cache current crime data
                        await this.cacheDepartmentCrime(departement);
                        
                        // Cache current names data
                        await this.cacheDepartmentNames(departement);
                        
                        // Cache prefet data
                        await this.cachePrefetData(departement);
                        
                    } catch (error) {
                        console.error(`Error caching data for department ${departement}:`, error);
                    }
                });
                
                await Promise.all(promises);
                console.log(`Cached data for ${depts.length} departments`);
                resolve();
            });
        });
    }

    async preloadCountryData() {
        try {
            // Cache country details
            await this.cacheCountryDetails('France');
            
            // Cache country crime history
            await this.cacheCountryCrimeHistory('France');
            
            // Cache country names history
            await this.cacheCountryNamesHistory('France');
            
            // Cache current country crime data
            await this.cacheCountryCrime('France');
            
            // Cache current country names data
            await this.cacheCountryNames('France');
            
            // Cache ministre data
            await this.cacheMinistereData('France');
            
            console.log('Cached data for France');
        } catch (error) {
            console.error('Error caching country data:', error);
        }
    }

    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + ttl);
    }

    get(key) {
        const expiry = this.cacheExpiry.get(key);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }
        return this.cache.get(key) || null;
    }

    has(key) {
        const expiry = this.cacheExpiry.get(key);
        if (expiry && Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
    }

    clear() {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    // Department caching methods
    async cacheDepartmentDetails(dept) {
        return new Promise((resolve, reject) => {
            const normalizedDept = /^\d+$/.test(dept) && dept.length < 2 ? dept.padStart(2, "0") : dept;
            
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
            
            db.get(sql, [normalizedDept, dept], (err, row) => {
                if (err) return reject(err);
                if (row) {
                    this.set(`dept_details_${dept}`, row);
                }
                resolve(row);
            });
        });
    }

    async cacheDepartmentCrimeHistory(dept) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM department_crime WHERE dep = ? ORDER BY annee ASC`,
                [dept],
                (err, rows) => {
                    if (err) return reject(err);
                    this.set(`dept_crime_history_${dept}`, rows);
                    resolve(rows);
                }
            );
        });
    }

    async cacheDepartmentNamesHistory(dept) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
                 FROM department_names WHERE dpt = ? ORDER BY annais ASC`,
                [dept],
                (err, rows) => {
                    if (err) return reject(err);
                    this.set(`dept_names_history_${dept}`, rows);
                    resolve(rows);
                }
            );
        });
    }

    async cacheDepartmentCrime(dept) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM department_crime 
                 WHERE dep = ? AND annee = (SELECT MAX(annee) FROM department_crime WHERE dep = ?)`,
                [dept, dept],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`dept_crime_${dept}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    async cacheDepartmentNames(dept) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
                 FROM department_names 
                 WHERE dpt = ? AND annais = (SELECT MAX(annais) FROM department_names WHERE dpt = ?)`,
                [dept, dept],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`dept_names_${dept}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    async cachePrefetData(dept) {
        return new Promise((resolve, reject) => {
            db.get(
                "SELECT code, prenom, nom, date_poste FROM prefets WHERE code = ?",
                [dept],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`prefet_${dept}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    // Country caching methods
    async cacheCountryDetails(country) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k 
                 FROM country WHERE UPPER(country) = ?`,
                [country.toUpperCase()],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`country_details_${country.toLowerCase()}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    async cacheCountryCrimeHistory(country) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM country_crime WHERE UPPER(country) = ? ORDER BY annee ASC`,
                [country.toUpperCase()],
                (err, rows) => {
                    if (err) return reject(err);
                    this.set(`country_crime_history_${country.toLowerCase()}`, rows);
                    resolve(rows);
                }
            );
        });
    }

    async cacheCountryNamesHistory(country) {
        return new Promise((resolve, reject) => {
            db.all(
                `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct, annais
                 FROM country_names WHERE UPPER(country) = ? ORDER BY annais ASC`,
                [country.toUpperCase()],
                (err, rows) => {
                    if (err) return reject(err);
                    this.set(`country_names_history_${country.toLowerCase()}`, rows);
                    resolve(rows);
                }
            );
        });
    }

    async cacheCountryCrime(country) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM country_crime 
                 WHERE UPPER(country) = ? AND annee = (SELECT MAX(annee) FROM country_crime WHERE UPPER(country) = ?)`,
                [country.toUpperCase(), country.toUpperCase()],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`country_crime_${country.toLowerCase()}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    async cacheCountryNames(country) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
                 FROM country_names 
                 WHERE UPPER(country) = ? AND annais = (SELECT MAX(annais) FROM country_names WHERE UPPER(country) = ?)`,
                [country.toUpperCase(), country.toUpperCase()],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`country_names_${country.toLowerCase()}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }

    async cacheMinistereData(country) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT country, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique 
                 FROM ministre_interieur 
                 WHERE UPPER(country) = ? 
                 ORDER BY date_mandat DESC LIMIT 1`,
                [country.toUpperCase()],
                (err, row) => {
                    if (err) return reject(err);
                    if (row) {
                        this.set(`ministre_${country.toLowerCase()}`, row);
                    }
                    resolve(row);
                }
            );
        });
    }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
