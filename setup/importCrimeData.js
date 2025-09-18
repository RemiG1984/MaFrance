const fs = require('fs');
const csv = require('csv-parser');

function importCrimeData(db, callback) {
    const batchSize = 1000;

    // Import country crime data from crime_data_france.csv
    function importCountryCrime() {
        let countryRows = 0;
        let countryBatch = [];

        function readCountryCrime() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/crime_data_france.csv')) {
                    const error = new Error('setup/crime_data_france.csv does not exist in the current directory');
                    console.error(error.message);
                    reject(error);
                    return;
                }
        
                fs.createReadStream('setup/crime_data_france.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['country']) missingFields.push('country');
                        if (!row['annee']) missingFields.push('annee');
        
                        if (missingFields.length > 0) {
                            const error = new Error(`Missing required fields in crime_data_france.csv: ${missingFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        // List of crime fields to validate
                        const crimeFields = [
                            'Homicides_p100k',
                            'Tentatives_d_homicides_p100k',
                            'Coups_et_blessures_volontaires_p1k',
                            'Coups_et_blessures_volontaires_intrafamiliaux_p1k',
                            'Autres_coups_et_blessures_volontaires_p1k',
                            'Violences_sexuelles_p1k',
                            'Vols_avec_armes_p1k',
                            'Vols_violents_sans_arme_p1k',
                            'Vols_sans_violence_contre_des_personnes_p1k',
                            'Cambriolages_de_logement_p1k',
                            'Vols_de_véhicules_p1k',
                            'Vols_dans_les_véhicules_p1k',
                            'Vols_d_accessoires_sur_véhicules_p1k',
                            'Destructions_et_dégradations_volontaires_p1k',
                            'Usage_de_stupéfiants_p1k',
                            'Usage_de_stupéfiants_AFD_p1k',
                            'Trafic_de_stupéfiants_p1k',
                            'Escroqueries_p1k'
                        ];
        
                        const invalidFields = [];
                        const values = {};
        
                        // Validate each crime field
                        crimeFields.forEach(field => {
                            const value = row[field];
                            if (value === undefined || value === '' || isNaN(parseFloat(value))) {
                                invalidFields.push(field);
                            } else {
                                values[field] = parseFloat(value);
                            }
                        });
        
                        if (invalidFields.length > 0) {
                            const error = new Error(`Invalid or missing crime data in crime_data_france.csv: ${invalidFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        countryRows++;
                        countryBatch.push([
                            row['country'].toUpperCase(),
                            row['annee'],
                            ...crimeFields.map(field => values[field])
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de crime_data_france.csv terminée: ${countryRows} lignes`);
                        if (countryRows === 0) {
                            console.warn('Avertissement: crime_data_france.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture crime_data_france.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCountryCrime() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS country_crime (
                            country TEXT,
                            annee TEXT,
                            homicides_p100k REAL,
                            tentatives_homicides_p100k REAL,
                            coups_et_blessures_volontaires_p1k REAL,
                            coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                            autres_coups_et_blessures_volontaires_p1k REAL,
                            violences_sexuelles_p1k REAL,
                            vols_avec_armes_p1k REAL,
                            vols_violents_sans_arme_p1k REAL,
                            vols_sans_violence_contre_des_personnes_p1k REAL,
                            cambriolages_de_logement_p1k REAL,
                            vols_de_vehicules_p1k REAL,
                            vols_dans_les_vehicules_p1k REAL,
                            vols_d_accessoires_sur_vehicules_p1k REAL,
                            destructions_et_degradations_volontaires_p1k REAL,
                            usage_de_stupefiants_p1k REAL,
                            usage_de_stupefiants_afd_p1k REAL,
                            trafic_de_stupefiants_p1k REAL,
                            escroqueries_p1k REAL,
                            PRIMARY KEY (country, annee)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table country_crime:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_country_crime ON country_crime(country, annee)', (err) => {
                            if (err) {
                                console.error('Erreur création index country_crime:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction country_crime:', err.message);
                                    reject(err);
                                    return;
                                }

                                if (countryBatch.length > 0) {
                                    const placeholders = countryBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...countryBatch);
                                    db.run(
                                        `INSERT OR IGNORE INTO country_crime (
                                            country, annee, homicides_p100k, tentatives_homicides_p100k, coups_et_blessures_volontaires_p1k,
                                            coups_et_blessures_volontaires_intrafamiliaux_p1k, autres_coups_et_blessures_volontaires_p1k,
                                            violences_sexuelles_p1k, vols_avec_armes_p1k, vols_violents_sans_arme_p1k,
                                            vols_sans_violence_contre_des_personnes_p1k, cambriolages_de_logement_p1k,
                                            vols_de_vehicules_p1k, vols_dans_les_vehicules_p1k, vols_d_accessoires_sur_vehicules_p1k,
                                            destructions_et_degradations_volontaires_p1k, usage_de_stupefiants_p1k,
                                            usage_de_stupefiants_afd_p1k, trafic_de_stupefiants_p1k, escroqueries_p1k
                                        ) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch country_crime:', err.message);
                                                db.run('ROLLBACK');
                                                reject(err);
                                                return;
                                            }
                                            db.run('COMMIT', (err) => {
                                                if (err) {
                                                    console.error('Erreur commit country_crime:', err.message);
                                                    db.run('ROLLBACK');
                                                    reject(err);
                                                } else {
                                                    console.log(`Importation de ${countryRows} lignes dans country_crime terminée`);
                                                    resolve();
                                                }
                                            });
                                        }
                                    );
                                } else {
                                    db.run('COMMIT', () => {
                                        console.log('Aucune donnée à insérer dans country_crime');
                                        resolve();
                                    });
                                }
                            });
                        });
                    });
                });
            });
        }

        return readCountryCrime().then(insertCountryCrime);
    }

    // Import department crime data from crime_data_departement.csv
    function importDepartmentCrime() {
        let departmentRows = 0;
        let departmentBatch = [];

        function readDepartmentCrime() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/crime_data_departement.csv')) {
                    const error = new Error('setup/crime_data_departement.csv does not exist in the current directory');
                    console.error(error.message);
                    reject(error);
                    return;
                }
        
                fs.createReadStream('setup/crime_data_departement.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['DEP']) missingFields.push('DEP');
                        if (!row['annee']) missingFields.push('annee');
        
                        if (missingFields.length > 0) {
                            const error = new Error(`Missing required fields in crime_data_departement.csv: ${missingFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        // Normalize department code
                        let dep = row['DEP'].trim().toUpperCase();
                        if (/^\d+$/.test(dep)) {
                            dep = dep.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
                            const error = new Error(`Invalid department code in crime_data_departement.csv: ${dep}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        // List of crime fields to validate
                        const crimeFields = [
                            'Homicides_p100k',
                            'Tentatives_d_homicides_p100k',
                            'Coups_et_blessures_volontaires_p1k',
                            'Coups_et_blessures_volontaires_intrafamiliaux_p1k',
                            'Autres_coups_et_blessures_volontaires_p1k',
                            'Violences_sexuelles_p1k',
                            'Vols_avec_armes_p1k',
                            'Vols_violents_sans_arme_p1k',
                            'Vols_sans_violence_contre_des_personnes_p1k',
                            'Cambriolages_de_logement_p1k',
                            'Vols_de_véhicules_p1k',
                            'Vols_dans_les_véhicules_p1k',
                            'Vols_d_accessoires_sur_véhicules_p1k',
                            'Destructions_et_dégradations_volontaires_p1k',
                            'Usage_de_stupéfiants_p1k',
                            'Usage_de_stupéfiants_AFD_p1k',
                            'Trafic_de_stupéfiants_p1k',
                            'Escroqueries_p1k'
                        ];
        
                        const invalidFields = [];
                        const values = {};
        
                        // Validate each crime field
                        crimeFields.forEach(field => {
                            const value = row[field];
                            if (value === undefined || value === '' || isNaN(parseFloat(value))) {
                                invalidFields.push(field);
                            } else {
                                values[field] = parseFloat(value);
                            }
                        });
        
                        if (invalidFields.length > 0) {
                            const error = new Error(`Invalid or missing crime data in crime_data_departement.csv: ${invalidFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        departmentRows++;
                        departmentBatch.push([
                            dep,
                            row['annee'],
                            ...crimeFields.map(field => values[field])
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de crime_data_departement.csv terminée: ${departmentRows} lignes`);
                        if (departmentRows === 0) {
                            console.warn('Avertissement: crime_data_departement.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture crime_data_departement.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertDepartmentCrime() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS department_crime (
                            dep TEXT,
                            annee TEXT,
                            homicides_p100k REAL,
                            tentatives_homicides_p100k REAL,
                            coups_et_blessures_volontaires_p1k REAL,
                            coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                            autres_coups_et_blessures_volontaires_p1k REAL,
                            violences_sexuelles_p1k REAL,
                            vols_avec_armes_p1k REAL,
                            vols_violents_sans_arme_p1k REAL,
                            vols_sans_violence_contre_des_personnes_p1k REAL,
                            cambriolages_de_logement_p1k REAL,
                            vols_de_vehicules_p1k REAL,
                            vols_dans_les_vehicules_p1k REAL,
                            vols_d_accessoires_sur_vehicules_p1k REAL,
                            destructions_et_degradations_volontaires_p1k REAL,
                            usage_de_stupefiants_p1k REAL,
                            usage_de_stupefiants_afd_p1k REAL,
                            trafic_de_stupefiants_p1k REAL,
                            escroqueries_p1k REAL,
                            PRIMARY KEY (dep, annee)
                        )
                    `, err => {
                        if (err) {
                            console.error('Erreur création table department_crime:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_department_crime ON department_crime(dep, annee)', err => {
                            if (err) {
                                console.error('Erreur création index department_crime:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', err => {
                                if (err) {
                                    console.error('Erreur début transaction department_crime:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                    const batch = departmentBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...batch);
                                    db.run(
                                        `INSERT OR IGNORE INTO department_crime (
                                            dep, annee, homicides_p100k, tentatives_homicides_p100k, coups_et_blessures_volontaires_p1k,
                                            coups_et_blessures_volontaires_intrafamiliaux_p1k, autres_coups_et_blessures_volontaires_p1k,
                                            violences_sexuelles_p1k, vols_avec_armes_p1k, vols_violents_sans_arme_p1k,
                                            vols_sans_violence_contre_des_personnes_p1k, cambriolages_de_logement_p1k,
                                            vols_de_vehicules_p1k, vols_dans_les_vehicules_p1k, vols_d_accessoires_sur_vehicules_p1k,
                                            destructions_et_degradations_volontaires_p1k, usage_de_stupefiants_p1k,
                                            usage_de_stupefiants_afd_p1k, trafic_de_stupefiants_p1k, escroqueries_p1k
                                        ) VALUES ${placeholders}`,
                                        flatBatch,
                                        err => {
                                            if (err) {
                                                console.error('Erreur insertion batch department_crime:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', err => {
                                    if (err) {
                                        console.error('Erreur commit department_crime:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${departmentRows} lignes dans department_crime terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readDepartmentCrime().then(insertDepartmentCrime);
    }

    // Import commune crime data from crime_data_commune.csv
    function importCommuneCrime() {
        let communeRows = 0;
        let communeBatch = [];

        function processBatch() {
            return new Promise((resolve, reject) => {
                if (communeBatch.length === 0) {
                    resolve();
                    return;
                }

                db.run('BEGIN TRANSACTION', err => {
                    if (err) {
                        console.error('Erreur début transaction commune_crime:', err.message);
                        reject(err);
                        return;
                    }

                    const placeholders = communeBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                    const flatBatch = [].concat(...communeBatch);
                    db.run(
                        `INSERT OR IGNORE INTO commune_crime (
                            COG, annee, coups_et_blessures_volontaires_p1k,
                            coups_et_blessures_volontaires_intrafamiliaux_p1k, autres_coups_et_blessures_volontaires_p1k,
                            violences_sexuelles_p1k, vols_avec_armes_p1k, vols_violents_sans_arme_p1k,
                            vols_sans_violence_contre_des_personnes_p1k, cambriolages_de_logement_p1k,
                            vols_de_vehicules_p1k, vols_dans_les_vehicules_p1k, vols_d_accessoires_sur_vehicules_p1k,
                            destructions_et_degradations_volontaires_p1k, usage_de_stupefiants_p1k,
                            usage_de_stupefiants_afd_p1k, trafic_de_stupefiants_p1k, escroqueries_p1k
                        ) VALUES ${placeholders}`,
                        flatBatch,
                        err => {
                            if (err) {
                                console.error('Erreur insertion batch commune_crime:', err.message);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            db.run('COMMIT', err => {
                                if (err) {
                                    console.error('Erreur commit commune_crime:', err.message);
                                    db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    communeBatch = []; // Clear batch
                                    resolve();
                                }
                            });
                        }
                    );
                });
            });
        }

        function readCommuneCrime() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/crime_data_commune.csv')) {
                    const error = new Error('setup/crime_data_commune.csv does not exist in the current directory');
                    console.error(error.message);
                    reject(error);
                    return;
                }
        
                const stream = fs.createReadStream('setup/crime_data_commune.csv').pipe(csv());
        
                stream
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['COG']) missingFields.push('COG');
                        if (!row['annee']) missingFields.push('annee');
        
                        if (missingFields.length > 0) {
                            const error = new Error(`Missing required fields in crime_data_commune.csv: ${missingFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        // List of crime fields to validate
                        const crimeFields = [
                            'Coups_et_blessures_volontaires_p1k',
                            'Coups_et_blessures_volontaires_intrafamiliaux_p1k',
                            'Autres_coups_et_blessures_volontaires_p1k',
                            'Violences_sexuelles_p1k',
                            'Vols_avec_armes_p1k',
                            'Vols_violents_sans_arme_p1k',
                            'Vols_sans_violence_contre_des_personnes_p1k',
                            'Cambriolages_de_logement_p1k',
                            'Vols_de_véhicules_p1k',
                            'Vols_dans_les_véhicules_p1k',
                            'Vols_d_accessoires_sur_véhicules_p1k',
                            'Destructions_et_dégradations_volontaires_p1k',
                            'Usage_de_stupéfiants_p1k',
                            'Usage_de_stupéfiants_AFD_p1k',
                            'Trafic_de_stupéfiants_p1k',
                            'Escroqueries_p1k'
                        ];
        
                        const invalidFields = [];
                        const values = {};
        
                        // Validate each crime field
                        crimeFields.forEach(field => {
                            const value = row[field];
                            if (value === undefined || value === '' || isNaN(parseFloat(value))) {
                                invalidFields.push(field);
                            } else {
                                values[field] = parseFloat(value);
                            }
                        });
        
                        if (invalidFields.length > 0) {
                            const error = new Error(`Invalid or missing crime data in crime_data_commune.csv: ${invalidFields.join(', ')}`);
                            console.error(error.message, row);
                            reject(error);
                            return;
                        }
        
                        communeRows++;
                        communeBatch.push([
                            row['COG'],
                            row['annee'],
                            ...crimeFields.map(field => values[field])
                        ]);
        
                        if (communeBatch.length >= batchSize) {
                            stream.pause();
                            processBatch()
                                .then(() => {
                                    stream.resume();
                                })
                                .catch(err => {
                                    stream.destroy(err);
                                });
                        }
                    })
                    .on('end', () => {
                        console.log(`Lecture de crime_data_commune.csv terminée: ${communeRows} lignes`);
                        if (communeRows === 0) {
                            console.warn('Avertissement: crime_data_commune.csv est vide ou n\'a pas de données valides');
                        }
                        // Process any remaining rows
                        processBatch()
                            .then(resolve)
                            .catch(reject);
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture crime_data_commune.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCommuneCrime() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS commune_crime (
                            COG TEXT,
                            annee TEXT,
                            coups_et_blessures_volontaires_p1k REAL,
                            coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                            autres_coups_et_blessures_volontaires_p1k REAL,
                            violences_sexuelles_p1k REAL,
                            vols_avec_armes_p1k REAL,
                            vols_violents_sans_arme_p1k REAL,
                            vols_sans_violence_contre_des_personnes_p1k REAL,
                            cambriolages_de_logement_p1k REAL,
                            vols_de_vehicules_p1k REAL,
                            vols_dans_les_vehicules_p1k REAL,
                            vols_d_accessoires_sur_vehicules_p1k REAL,
                            destructions_et_degradations_volontaires_p1k REAL,
                            usage_de_stupefiants_p1k REAL,
                            usage_de_stupefiants_afd_p1k REAL,
                            trafic_de_stupefiants_p1k REAL,
                            escroqueries_p1k REAL,
                            PRIMARY KEY (COG, annee)
                        )
                    `, err => {
                        if (err) {
                            console.error('Erreur création table commune_crime:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_commune_crime ON commune_crime(COG, annee)', err => {
                            if (err) {
                                console.error('Erreur création index commune_crime:', err.message);
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    });
                });
            });
        }

        return insertCommuneCrime().then(readCommuneCrime);
    }

    // Execute imports sequentially
    importCountryCrime()
        .then(importDepartmentCrime)
        .then(importCommuneCrime)
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des données criminelles:', err.message);
            callback(err);
        });
}

module.exports = { importCrimeData };