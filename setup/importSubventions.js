
const fs = require('fs');
const csv = require('csv-parser');

function importSubventions(db, callback) {
    const batchSize = 1000;

    // Import country subventions from france_subventions.csv
    function importCountrySubventions() {
        let countryRows = 0;
        let countryBatch = [];

        function readCountrySubventions() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/france_subventions.csv')) {
                    console.error('Erreur: setup/france_subventions.csv n\'existe pas dans le répertoire courant');
                    resolve();
                    return;
                }

                fs.createReadStream('setup/france_subventions.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        if (!row['country']) {
                            console.warn(`Ligne ignorée dans france_subventions.csv (champ country manquant):`, row);
                            return;
                        }

                        // Extract subvention fields (exclude non-subvention fields)
                        const excludedFields = ['country', 'commune', 'population', 'total_subventions'];
                        const subventionFields = Object.keys(row).filter(key => 
                            !excludedFields.includes(key)
                        );

                        const values = {};
                        const invalidFields = [];

                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values[field] = parseFloat(value);
                            } else if (value === '' || value === undefined) {
                                values[field] = null;
                            } else {
                                invalidFields.push(field);
                            }
                        });

                        if (invalidFields.length > 0) {
                            console.warn(`Champs de subvention invalides dans france_subventions.csv: ${invalidFields.join(', ')}`, row);
                        }

                        countryRows++;
                        countryBatch.push([
                            row['country'],
                            JSON.stringify(values)
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de france_subventions.csv terminée: ${countryRows} lignes`);
                        if (countryRows === 0) {
                            console.warn('Avertissement: france_subventions.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture france_subventions.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCountrySubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS country_subventions (
                            country TEXT PRIMARY KEY,
                            subventions_data TEXT
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table country_subventions:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_country_subventions ON country_subventions(country)', (err) => {
                            if (err) {
                                console.error('Erreur création index country_subventions:', err.message);
                                reject(err);
                                return;
                            }

                            if (countryBatch.length === 0) {
                                console.log('Aucune donnée à insérer dans country_subventions');
                                resolve();
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction country_subventions:', err.message);
                                    reject(err);
                                    return;
                                }

                                const placeholders = countryBatch.map(() => '(?, ?)').join(',');
                                const flatBatch = [].concat(...countryBatch);
                                db.run(
                                    `INSERT OR REPLACE INTO country_subventions (country, subventions_data) VALUES ${placeholders}`,
                                    flatBatch,
                                    (err) => {
                                        if (err) {
                                            console.error('Erreur insertion batch country_subventions:', err.message);
                                            db.run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                console.error('Erreur commit country_subventions:', err.message);
                                                db.run('ROLLBACK');
                                                reject(err);
                                            } else {
                                                console.log(`Importation de ${countryRows} lignes dans country_subventions terminée`);
                                                resolve();
                                            }
                                        });
                                    }
                                );
                            });
                        });
                    });
                });
            });
        }

        return readCountrySubventions().then(insertCountrySubventions);
    }

    // Import department subventions from departement_subventions.csv
    function importDepartmentSubventions() {
        let departmentRows = 0;
        let departmentBatch = [];

        function readDepartmentSubventions() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/departement_subventions.csv')) {
                    console.error('Erreur: setup/departement_subventions.csv n\'existe pas dans le répertoire courant');
                    resolve();
                    return;
                }

                fs.createReadStream('setup/departement_subventions.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        if (!row['DEP']) {
                            console.warn(`Ligne ignorée dans departement_subventions.csv (champ DEP manquant):`, row);
                            return;
                        }

                        // Normalize department code
                        let dep = row['DEP'].trim().toUpperCase();
                        if (/^\d+$/.test(dep)) {
                            dep = dep.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
                            console.warn(`Code département invalide ignoré dans departement_subventions.csv: ${dep}`, row);
                            return;
                        }

                        // Extract subvention fields (exclude non-subvention fields)
                        const excludedFields = ['DEP', 'commune', 'population', 'total_subventions'];
                        const subventionFields = Object.keys(row).filter(key => 
                            !excludedFields.includes(key)
                        );

                        const values = {};
                        const invalidFields = [];

                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values[field] = parseFloat(value);
                            } else if (value === '' || value === undefined) {
                                values[field] = null;
                            } else {
                                invalidFields.push(field);
                            }
                        });

                        if (invalidFields.length > 0) {
                            console.warn(`Champs de subvention invalides dans departement_subventions.csv: ${invalidFields.join(', ')}`, row);
                        }

                        departmentRows++;
                        departmentBatch.push([
                            dep,
                            JSON.stringify(values)
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de departement_subventions.csv terminée: ${departmentRows} lignes`);
                        if (departmentRows === 0) {
                            console.warn('Avertissement: departement_subventions.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture departement_subventions.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertDepartmentSubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS department_subventions (
                            dep TEXT PRIMARY KEY,
                            subventions_data TEXT
                        )
                    `, err => {
                        if (err) {
                            console.error('Erreur création table department_subventions:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_department_subventions ON department_subventions(dep)', err => {
                            if (err) {
                                console.error('Erreur création index department_subventions:', err.message);
                                reject(err);
                                return;
                            }

                            if (departmentBatch.length === 0) {
                                console.log('Aucune donnée à insérer dans department_subventions');
                                resolve();
                                return;
                            }

                            db.run('BEGIN TRANSACTION', err => {
                                if (err) {
                                    console.error('Erreur début transaction department_subventions:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                    const batch = departmentBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?)').join(',');
                                    const flatBatch = [].concat(...batch);
                                    db.run(
                                        `INSERT OR REPLACE INTO department_subventions (dep, subventions_data) VALUES ${placeholders}`,
                                        flatBatch,
                                        err => {
                                            if (err) {
                                                console.error('Erreur insertion batch department_subventions:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', err => {
                                    if (err) {
                                        console.error('Erreur commit department_subventions:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${departmentRows} lignes dans department_subventions terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readDepartmentSubventions().then(insertDepartmentSubventions);
    }

    // Import commune subventions from commune_subventions.csv
    function importCommuneSubventions() {
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
                        console.error('Erreur début transaction commune_subventions:', err.message);
                        reject(err);
                        return;
                    }

                    const placeholders = communeBatch.map(() => '(?, ?)').join(',');
                    const flatBatch = [].concat(...communeBatch);
                    db.run(
                        `INSERT OR REPLACE INTO commune_subventions (COG, subventions_data) VALUES ${placeholders}`,
                        flatBatch,
                        err => {
                            if (err) {
                                console.error('Erreur insertion batch commune_subventions:', err.message);
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            db.run('COMMIT', err => {
                                if (err) {
                                    console.error('Erreur commit commune_subventions:', err.message);
                                    db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    communeBatch = [];
                                    resolve();
                                }
                            });
                        }
                    );
                });
            });
        }

        function readCommuneSubventions() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/commune_subventions.csv')) {
                    console.error('Erreur: setup/commune_subventions.csv n\'existe pas dans le répertoire courant');
                    resolve();
                    return;
                }

                const stream = fs.createReadStream('setup/commune_subventions.csv').pipe(csv());

                stream
                    .on('data', (row) => {
                        if (!row['COG']) {
                            console.warn(`Ligne ignorée dans commune_subventions.csv (champ COG manquant):`, row);
                            return;
                        }

                        // Extract subvention fields (exclude non-subvention fields)
                        const excludedFields = ['COG', 'commune', 'population', 'total_subventions'];
                        const subventionFields = Object.keys(row).filter(key => 
                            !excludedFields.includes(key)
                        );

                        const values = {};
                        const invalidFields = [];

                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values[field] = parseFloat(value);
                            } else if (value === '' || value === undefined) {
                                values[field] = null;
                            } else {
                                invalidFields.push(field);
                            }
                        });

                        if (invalidFields.length > 0) {
                            console.warn(`Champs de subvention invalides dans commune_subventions.csv: ${invalidFields.join(', ')}`, row);
                        }

                        communeRows++;
                        communeBatch.push([
                            row['COG'],
                            JSON.stringify(values)
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
                        console.log(`Lecture de commune_subventions.csv terminée: ${communeRows} lignes`);
                        if (communeRows === 0) {
                            console.warn('Avertissement: commune_subventions.csv est vide ou n\'a pas de données valides');
                        }
                        processBatch()
                            .then(resolve)
                            .catch(reject);
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture commune_subventions.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCommuneSubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS commune_subventions (
                            COG TEXT PRIMARY KEY,
                            subventions_data TEXT
                        )
                    `, err => {
                        if (err) {
                            console.error('Erreur création table commune_subventions:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_commune_subventions ON commune_subventions(COG)', err => {
                            if (err) {
                                console.error('Erreur création index commune_subventions:', err.message);
                                reject(err);
                                return;
                            }
                            resolve();
                        });
                    });
                });
            });
        }

        return insertCommuneSubventions().then(readCommuneSubventions);
    }

    // Execute imports sequentially
    importCountrySubventions()
        .then(importDepartmentSubventions)
        .then(importCommuneSubventions)
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des données de subventions:', err.message);
            callback(err);
        });
}

module.exports = { importSubventions };
