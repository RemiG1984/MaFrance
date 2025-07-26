const fs = require('fs');
const csv = require('csv-parser');

function importScores(db, callback) {
    const batchSize = 1000;

    // Import country from france_scores.csv
    function importCountry() {
        let countryRows = 0;
        let countryBatch = [];

        function readCountryScores() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/france_scores.csv')) {
                    console.error('Erreur: setup/france_scores.csv n\'existe pas dans le répertoire courant');
                    resolve(); // Continue with empty data
                    return;
                }

                fs.createReadStream('setup/france_scores.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['country']) missingFields.push('country');
                        if (!row['population']) missingFields.push('population');
                        if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') missingFields.push('Mosque_p100k');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans france_scores.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        const population = parseInt(row['population'].replace(/\s/g, '')) || 0;
                        const logements_sociaux_pct = parseFloat(row['logements_sociaux_pct']) || 0;
                        const insecurite_score = parseInt(row['Insécurité_Score']) || 0;
                        const immigration_score = parseInt(row['Immigration_Score']) || 0;
                        const islamisation_score = parseInt(row['Islamisation_Score']) || 0;
                        const defrancisation_score = parseInt(row['Défrancisation_Score']) || 0;
                        const wokisme_score = parseInt(row['Wokisme_Score']) || 0;
                        const number_of_mosques = parseInt(row['Number_of_Mosques']) || 0;
                        const mosque_p100k = parseFloat(row['Mosque_p100k']) || 0;
                        const total_qpv = parseInt(row['Total_QPV']) || 0;
                        const pop_in_qpv_pct = parseFloat(row['Pop_in_QPV_pct']) || 0;

                        countryRows++;
                        countryBatch.push([
                            row['country'],
                            population,
                            logements_sociaux_pct,
                            insecurite_score,
                            immigration_score,
                            islamisation_score,
                            defrancisation_score,
                            wokisme_score,
                            number_of_mosques,
                            mosque_p100k,
                            total_qpv,
                            pop_in_qpv_pct
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de france_scores.csv terminée: ${countryRows} lignes`);
                        if (countryRows === 0) {
                            console.warn('Avertissement: france_scores.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture france_scores.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCountry() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS country (
                            country TEXT PRIMARY KEY,
                            population INTEGER,
                            logements_sociaux_pct REAL,
                            insecurite_score INTEGER,
                            immigration_score INTEGER,
                            islamisation_score INTEGER,
                            defrancisation_score INTEGER,
                            wokisme_score INTEGER,
                            number_of_mosques INTEGER,
                            mosque_p100k REAL,
                            total_qpv INTEGER,
                            pop_in_qpv_pct REAL
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table country:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_country ON country(country)', (err) => {
                            if (err) {
                                console.error('Erreur création index country:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction country:', err.message);
                                    reject(err);
                                    return;
                                }

                                if (countryBatch.length > 0) {
                                    const placeholders = countryBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...countryBatch);
                                    db.run(
                                        `INSERT OR IGNORE INTO country (country, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch country:', err.message);
                                                db.run('ROLLBACK');
                                                reject(err);
                                                return;
                                            }
                                            db.run('COMMIT', (err) => {
                                                if (err) {
                                                    console.error('Erreur commit country:', err.message);
                                                    db.run('ROLLBACK');
                                                    reject(err);
                                                } else {
                                                    console.log(`Importation de ${countryRows} lignes dans country terminée`);
                                                    resolve();
                                                }
                                            });
                                        }
                                    );
                                } else {
                                    db.run('COMMIT', () => {
                                        console.log('Aucune donnée à insérer dans country');
                                        resolve();
                                    });
                                }
                            });
                        });
                    });
                });
            });
        }

        return readCountryScores().then(insertCountry);
    }

    // Import departments from departement_scores.csv
    function importDepartments() {
        let departmentRows = 0;
        let departmentBatch = [];

        function readDepartmentScores() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/departement_scores.csv')) {
                    console.error('Erreur: setup/departement_scores.csv n\'existe pas dans le répertoire courant');
                    reject(new Error('Fichier setup/departement_scores.csv manquant'));
                    return;
                }

                fs.createReadStream('setup/departement_scores.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['departement']) missingFields.push('departement');
                        if (!row['population']) missingFields.push('population');
                        if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') missingFields.push('Mosque_p100k');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans departement_scores.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        let departement = row['departement'].trim().toUpperCase();
                        if (/^\d+$/.test(departement)) {
                            departement = departement.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)) {
                            console.warn(`Code département invalide ignoré: ${departement}`, row);
                            return;
                        }

                        const population = parseInt(row['population'].replace(/\s/g, '')) || 0;
                        const logements_sociaux_pct = parseFloat(row['logements_sociaux_pct']) || 0;
                        const insecurite_score = parseInt(row['Insécurité_Score']) || 0;
                        const immigration_score = parseInt(row['Immigration_Score']) || 0;
                        const islamisation_score = parseInt(row['Islamisation_Score']) || 0;
                        const defrancisation_score = parseInt(row['Défrancisation_Score']) || 0;
                        const wokisme_score = parseInt(row['Wokisme_Score']) || 0;
                        const number_of_mosques = parseInt(row['Number_of_Mosques']) || 0;
                        const mosque_p100k = parseFloat(row['Mosque_p100k']) || 0;
                        const total_qpv = parseInt(row['Total_QPV']) || 0;
                        const pop_in_qpv_pct = parseFloat(row['Pop_in_QPV_pct']) || 0;

                        departmentRows++;
                        departmentBatch.push([
                            departement,
                            population,
                            logements_sociaux_pct,
                            insecurite_score,
                            immigration_score,
                            islamisation_score,
                            defrancisation_score,
                            wokisme_score,
                            number_of_mosques,
                            mosque_p100k,
                            total_qpv,
                            pop_in_qpv_pct
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de departement_scores.csv terminée: ${departmentRows} lignes`);
                        if (departmentRows === 0) {
                            console.warn('Avertissement: departement_scores.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture departement_scores.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertDepartments() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS departement (
                            departement TEXT PRIMARY KEY,
                            population INTEGER,
                            logements_sociaux_pct REAL,
                            insecurite_score INTEGER,
                            immigration_score INTEGER,
                            islamisation_score INTEGER,
                            defrancisation_score INTEGER,
                            wokisme_score INTEGER,
                            number_of_mosques INTEGER,
                            mosque_p100k REAL,
                            total_qpv INTEGER,
                            pop_in_qpv_pct REAL
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table departement:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_departement ON departement(departement)', (err) => {
                            if (err) {
                                console.error('Erreur création index departement:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction departements:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                    const batch = departmentBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...batch);
                                    db.run(
                                        `INSERT OR IGNORE INTO departement (departement, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch departements:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit departement:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${departmentRows} lignes dans departement terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readDepartmentScores().then(insertDepartments);
    }

    // Import locations from commune_scores.csv
    function importLocations() {
        let locationsMap = new Map();
        let locationRows = 0;

        function readCommuneScores() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/commune_scores.csv')) {
                    console.error('Erreur: setup/commune_scores.csv n\'existe pas dans le répertoire courant');
                    reject(new Error('Fichier setup/commune_scores.csv manquant'));
                    return;
                }

                fs.createReadStream('setup/commune_scores.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['COG']) missingFields.push('COG');
                        if (!row['commune']) missingFields.push('commune');
                        if (!row['departement']) missingFields.push('departement');
                        if (!row['population']) missingFields.push('population');
                        if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') missingFields.push('Mosque_p100k');
                        if (!row['logements_sociaux_pct'] && row['logements_sociaux_pct'] !== '0') missingFields.push('logements_sociaux_pct');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans commune_scores.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        let departement = row['departement'].trim().toUpperCase();
                        if (/^\d+$/.test(departement)) {
                            departement = departement.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)) {
                            console.warn(`Code département invalide ignoré: ${departement}`, row);
                            return;
                        }

                        const population = parseInt(row['population'].replace(/\s/g, '')) || 0;
                        const logements_sociaux_pct = parseFloat(row['logements_sociaux_pct']) || 0;
                        const insecurite_score = parseInt(row['Insécurité_Score']) || 0;
                        const immigration_score = parseInt(row['Immigration_Score']) || 0;
                        const islamisation_score = parseInt(row['Islamisation_Score']) || 0;
                        const defrancisation_score = parseInt(row['Défrancisation_Score']) || 0;
                        const wokisme_score = parseInt(row['Wokisme_Score']) || 0;
                        const number_of_mosques = parseInt(row['Number_of_Mosques']) || 0;
                        const mosque_p100k = parseFloat(row['Mosque_p100k']) || 0;
                        const total_qpv = parseInt(row['Total_QPV']) || 0;
                        const pop_in_qpv_pct = parseFloat(row['Pop_in_QPV_pct']) || 0;

                        locationsMap.set(row['COG'], {
                            code: row['COG'],
                            departement: departement,
                            commune: row['commune'],
                            population: population,
                            logements_sociaux_pct: logements_sociaux_pct,
                            insecurite_score,
                            immigration_score,
                            islamisation_score,
                            defrancisation_score,
                            wokisme_score,
                            number_of_mosques,
                            mosque_p100k,
                            total_qpv,
                            pop_in_qpv_pct
                        });
                    })
                    .on('end', () => {
                        console.log(`Lecture de commune_scores.csv terminée: ${locationsMap.size} lignes`);
                        if (locationsMap.size === 0) {
                            console.warn('Avertissement: commune_scores.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture commune_scores.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertLocations() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS locations (
                            COG TEXT,
                            departement TEXT,
                            commune TEXT,
                            population INTEGER,
                            logements_sociaux_pct REAL,
                            insecurite_score INTEGER,
                            immigration_score INTEGER,
                            islamisation_score INTEGER,
                            defrancisation_score INTEGER,
                            wokisme_score INTEGER,
                            number_of_mosques INTEGER,
                            mosque_p100k REAL,
                            total_qpv INTEGER,
                            pop_in_qpv_pct REAL,
                            UNIQUE(COG, commune)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table locations:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_locations_dept_commune ON locations(departement, commune)', (err) => {
                            if (err) {
                                console.error('Erreur création index locations:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction locations:', err.message);
                                    reject(err);
                                    return;
                                }

                                let locationBatch = [];
                                for (const loc of locationsMap.values()) {
                                    locationBatch.push([
                                        loc.code,
                                        loc.departement,
                                        loc.commune,
                                        loc.population,
                                        loc.logements_sociaux_pct,
                                        loc.insecurite_score,
                                        loc.immigration_score,
                                        loc.islamisation_score,
                                        loc.defrancisation_score,
                                        loc.wokisme_score,
                                        loc.number_of_mosques,
                                        loc.mosque_p100k,
                                        loc.total_qpv,
                                        loc.pop_in_qpv_pct
                                    ]);

                                    locationRows++;

                                    if (locationBatch.length >= batchSize) {
                                        const placeholders = locationBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                        const flatBatch = [].concat(...locationBatch);
                                        db.run(
                                            `INSERT OR IGNORE INTO locations (COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct) VALUES ${placeholders}`,
                                            flatBatch,
                                            (err) => {
                                                if (err) {
                                                    console.error('Erreur insertion batch locations:', err.message);
                                                }
                                            }
                                        );
                                        locationBatch = [];
                                    }
                                }

                                if (locationBatch.length > 0) {
                                    const placeholders = locationBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...locationBatch);
                                    db.run(
                                        `INSERT OR IGNORE INTO locations (COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch final locations:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit locations:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${locationRows} lignes dans locations terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readCommuneScores().then(insertLocations);
    }

    // Execute imports sequentially
    importCountry()
        .then(importDepartments)
        .then(importLocations)
        .then(() => callback(null))
        .catch((err) => {
            console.error('Échec de l\'importation des scores:', err.message);
            callback(err);
        });
}

module.exports = { importScores };