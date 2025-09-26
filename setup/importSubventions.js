
const fs = require('fs');
const csv = require('csv-parser');

function importSubventions(db, callback) {
    const batchSize = 1000;

    // Get all unique subvention field names from CSV files
    function getAllSubventionFields() {
        return new Promise((resolve, reject) => {
            const allFields = new Set();
            const files = [
                { path: 'setup/france_subventions.csv', excludedFields: ['country', 'commune', 'population', 'total_subventions'] },
                { path: 'setup/departement_subventions.csv', excludedFields: ['dept_code', 'commune', 'population', 'total_subventions'] },
                { path: 'setup/commune_subventions.csv', excludedFields: ['COG', 'commune', 'population', 'total_subventions'] }
            ];

            let processedFiles = 0;

            files.forEach(file => {
                if (!fs.existsSync(file.path)) {
                    processedFiles++;
                    if (processedFiles === files.length) resolve(Array.from(allFields));
                    return;
                }

                fs.createReadStream(file.path)
                    .pipe(csv())
                    .on('data', (row) => {
                        Object.keys(row).forEach(key => {
                            if (!file.excludedFields.includes(key)) {
                                allFields.add(key);
                            }
                        });
                    })
                    .on('end', () => {
                        processedFiles++;
                        if (processedFiles === files.length) {
                            resolve(Array.from(allFields));
                        }
                    })
                    .on('error', reject);
            });
        });
    }

    // Create dynamic table schema
    function createTableSchema(fields, tableName, keyField) {
        const columns = fields.map(field => `${field} REAL`).join(', ');
        return `
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${keyField} TEXT PRIMARY KEY,
                ${columns}
            )
        `;
    }

    // Import country subventions from france_subventions.csv
    function importCountrySubventions(subventionFields) {
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
                        const excludedFields = ['commune', 'population', 'total_subventions'];
                        
                        // Use the country field from the CSV, or default to 'FRANCE' if not present
                        const country = row['country'];
                        const values = [country];
                        
                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values.push(parseFloat(value));
                            } else {
                                values.push(null);
                            }
                        });

                        countryRows++;
                        countryBatch.push(values);
                    })
                    .on('end', () => {
                        console.log(`Lecture de france_subventions.csv terminée: ${countryRows} lignes`);
                        resolve();
                    })
                    .on('error', reject);
            });
        }

        function insertCountrySubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    const schema = createTableSchema(subventionFields, 'country_subventions', 'country');
                    
                    db.run(schema, (err) => {
                        if (err) {
                            console.error('Erreur création table country_subventions:', err.message);
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

                            const fieldsList = ['country'].concat(subventionFields).join(', ');
                            const placeholders = `(${Array(subventionFields.length + 1).fill('?').join(', ')})`;
                            const batchPlaceholders = countryBatch.map(() => placeholders).join(',');
                            const flatBatch = [].concat(...countryBatch);
                            
                            db.run(
                                `INSERT OR REPLACE INTO country_subventions (${fieldsList}) VALUES ${batchPlaceholders}`,
                                flatBatch,
                                (err) => {
                                    if (err) {
                                        console.error('Erreur insertion country_subventions:', err.message);
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
        }

        return readCountrySubventions().then(insertCountrySubventions);
    }

    // Import department subventions from departement_subventions.csv
    function importDepartmentSubventions(subventionFields) {
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
                        if (!row['dept_code']) {
                            console.warn(`Ligne ignorée dans departement_subventions.csv (champ dept_code manquant):`, row);
                            return;
                        }

                        let dep = row['dept_code'].trim().toUpperCase();
                        if (/^\d+$/.test(dep)) {
                            dep = dep.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
                            console.warn(`Code département invalide ignoré: ${dep}`, row);
                            return;
                        }

                        const values = [dep];
                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values.push(parseFloat(value));
                            } else {
                                values.push(null);
                            }
                        });

                        departmentRows++;
                        departmentBatch.push(values);
                    })
                    .on('end', () => {
                        console.log(`Lecture de departement_subventions.csv terminée: ${departmentRows} lignes`);
                        resolve();
                    })
                    .on('error', reject);
            });
        }

        function insertDepartmentSubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    const schema = createTableSchema(subventionFields, 'department_subventions', 'dep');
                    
                    db.run(schema, err => {
                        if (err) {
                            console.error('Erreur création table department_subventions:', err.message);
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

                            const fieldsList = ['dep'].concat(subventionFields).join(', ');
                            const placeholders = `(${Array(subventionFields.length + 1).fill('?').join(', ')})`;

                            for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                const batch = departmentBatch.slice(i, i + batchSize);
                                const batchPlaceholders = batch.map(() => placeholders).join(',');
                                const flatBatch = [].concat(...batch);
                                
                                db.run(
                                    `INSERT OR REPLACE INTO department_subventions (${fieldsList}) VALUES ${batchPlaceholders}`,
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
        }

        return readDepartmentSubventions().then(insertDepartmentSubventions);
    }

    // Import commune subventions from commune_subventions.csv
    function importCommuneSubventions(subventionFields) {
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

                    const fieldsList = ['COG'].concat(subventionFields).join(', ');
                    const placeholders = `(${Array(subventionFields.length + 1).fill('?').join(', ')})`;
                    const batchPlaceholders = communeBatch.map(() => placeholders).join(',');
                    const flatBatch = [].concat(...communeBatch);
                    
                    db.run(
                        `INSERT OR REPLACE INTO commune_subventions (${fieldsList}) VALUES ${batchPlaceholders}`,
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

                        const values = [row['COG']];
                        subventionFields.forEach(field => {
                            const value = row[field];
                            if (value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
                                values.push(parseFloat(value));
                            } else {
                                values.push(null);
                            }
                        });

                        communeRows++;
                        communeBatch.push(values);

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
                        processBatch()
                            .then(resolve)
                            .catch(reject);
                    })
                    .on('error', reject);
            });
        }

        function insertCommuneSubventions() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    const schema = createTableSchema(subventionFields, 'commune_subventions', 'COG');
                    
                    db.run(schema, err => {
                        if (err) {
                            console.error('Erreur création table commune_subventions:', err.message);
                            reject(err);
                            return;
                        }
                        resolve();
                    });
                });
            });
        }

        return insertCommuneSubventions().then(readCommuneSubventions);
    }

    // Execute imports sequentially
    getAllSubventionFields()
        .then(subventionFields => {
            console.log(`Champs de subvention détectés: ${subventionFields.join(', ')}`);
            return importCountrySubventions(subventionFields)
                .then(() => importDepartmentSubventions(subventionFields))
                .then(() => importCommuneSubventions(subventionFields));
        })
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des données de subventions:', err.message);
            callback(err);
        });
}

module.exports = { importSubventions };
