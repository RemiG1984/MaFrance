
const db = require('../config/db');

class CacheService {
    constructor() {
        this.cache = new Map();
        
        // Preload critical data on startup
        this.initializeCache();
    }

    async initializeCache() {
        try {
            console.log('Initializing server-side cache...');
            
            // Preload all department data
            console.log('Starting department data preload...');
            await this.preloadDepartmentData();
            console.log('Department data preload completed');
            
            // Preload country data
            console.log('Starting country data preload...');
            await this.preloadCountryData();
            console.log('Country data preload completed');
            
            console.log('Server-side cache initialized successfully');
        } catch (error) {
            console.error('Error initializing cache:', error.message);
            console.error('Stack trace:', error.stack);
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
                        console.error(`Error caching data for department ${departement}:`, error.message);
                        // Don't throw - continue with other departments
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
            console.log('Caching country details...');
            await this.cacheCountryDetails('France');
            
            // Cache country crime history
            console.log('Caching country crime history...');
            await this.cacheCountryCrimeHistory('France');
            
            // Cache country names history
            console.log('Caching country names history...');
            await this.cacheCountryNamesHistory('France');
            
            // Cache current country crime data
            console.log('Caching current country crime data...');
            await this.cacheCountryCrime('France');
            
            // Cache current country names data
            console.log('Caching current country names data...');
            await this.cacheCountryNames('France');
            
            // Cache ministre data
            console.log('Caching ministre data...');
            await this.cacheMinistereData('France');
            
            // Cache department rankings
            console.log('Caching department rankings...');
            await this.cacheDepartmentRankings();
            
            console.log('Cached data for France');
        } catch (error) {
            console.error('Error caching country data:', error.message);
            console.error('Stack trace:', error.stack);
        }
    }

    set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key) || null;
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
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

    async cacheDepartmentRankings() {
        return new Promise((resolve, reject) => {
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
            ORDER BY d.departement
            `;
            
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                this.set('department_rankings', rows);
                console.log(`Cached department rankings data for ${rows.length} departments`);
                resolve(rows);
            });
        });
    }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
