const fs = require('fs');
const csv = require('csv-parser');

function importNames(db, callback) {
    const batchSize = 1000;

    // Import country_names from analyse_prenom_france.csv
    function importCountryNames() {
        let countryRows = 0;
        let countryBatch = [];

        function readCountryNames() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('analyse_prenom_france.csv')) {
                    console.error('Erreur: analyse_prenom_france.csv n\'existe pas dans le répertoire courant');
                    resolve(); // Continue with empty data
                    return;
                }

                fs.createReadStream('analyse_prenom_france.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['country']) missingFields.push('country');
                        if (!row['annais']) missingFields.push('annais');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans analyse_prenom_france.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        const musulman_pct = parseFloat(row['Musulman_pct']) || 0;
                        const africain_pct = parseFloat(row['Africain_pct']) || 0;
                        const asiatique_pct = parseFloat(row['Asiatique_pct']) || 0;
                        const traditionnel_pct = parseFloat(row['Traditionnel_pct']) || 0;
                        const moderne_pct = parseFloat(row['Moderne_pct']) || 0;
                        const invente_pct = parseFloat(row['Inventé_pct']) || 0;
                        const europeen_pct = parseFloat(row['Européen_pct']) || 0;
                        const annais = row['annais'];

                        countryRows++;
                        countryBatch.push([
                            row['country'],
                            annais,
                            musulman_pct,
                            africain_pct,
                            asiatique_pct,
                            traditionnel_pct,
                            moderne_pct,
                            invente_pct,
                            europeen_pct
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de analyse_prenom_france.csv terminée: ${countryRows} lignes`);
                        if (countryRows === 0) {
                            console.warn('Avertissement: analyse_prenom_france.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture analyse_prenom_france.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCountryNames() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS country_names (
                            country TEXT,
                            annais TEXT,
                            musulman_pct REAL,
                            africain_pct REAL,
                            asiatique_pct REAL,
                            traditionnel_pct REAL,
                            moderne_pct REAL,
                            invente_pct REAL,
                            europeen_pct REAL,
                            PRIMARY KEY (country, annais)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table country_names:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_country_names ON country_names(country, annais)', (err) => {
                            if (err) {
                                console.error('Erreur création index country_names:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction country_names:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < countryBatch.length; i += batchSize) {
                                    const batch = countryBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...batch); // Manual flattening
                                    db.run(
                                        `INSERT OR IGNORE INTO country_names (country, annais, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch country_names:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit country_names:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${countryRows} lignes dans country_names terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readCountryNames().then(insertCountryNames);
    }

    // Import department_names from analyse_prenom_departement.csv
    function importDepartmentNames() {
        let departmentRows = 0;
        let departmentBatch = [];
        let corseData = []; // Store department 20 data for 2A and 2B

        function readDepartmentNames() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('analyse_prenom_departement.csv')) {
                    console.error('Erreur: analyse_prenom_departement.csv n\'existe pas dans le répertoire courant');
                    resolve(); // Continue with empty data
                    return;
                }
        
                fs.createReadStream('analyse_prenom_departement.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['dpt']) missingFields.push('dpt');
                        if (!row['annais']) missingFields.push('annais');
        
                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans analyse_prenom_departement.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }
        
                        // Normalize dpt to consistent format: '01' to '09', '11' to '95', '2A', '2B', '971' to '976'
                        let dpt = row['dpt'].trim().toUpperCase();
                        // Pad numeric codes to two digits
                        if (/^\d+$/.test(dpt)) {
                            dpt = dpt.padStart(2, '0');
                        }
                        // Validate department code
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dpt)) {
                            console.warn(`Code département invalide ignoré: ${dpt}`, row);
                            return;
                        }
        
                        const musulman_pct = parseFloat(row['Musulman_pct']) || 0;
                        const africain_pct = parseFloat(row['Africain_pct']) || 0;
                        const asiatique_pct = parseFloat(row['Asiatique_pct']) || 0;
                        const traditionnel_pct = parseFloat(row['Traditionnel_pct']) || 0;
                        const moderne_pct = parseFloat(row['Moderne_pct']) || 0;
                        const invente_pct = parseFloat(row['Inventé_pct']) || 0;
                        const europeen_pct = parseFloat(row['Européen_pct']) || 0;
                        const annais = row['annais'];
        
                        departmentRows++;
                        departmentBatch.push([
                            dpt,
                            annais,
                            musulman_pct,
                            africain_pct,
                            asiatique_pct,
                            traditionnel_pct,
                            moderne_pct,
                            invente_pct,
                            europeen_pct
                        ]);
        
                        // Handle Corse (20) by adding entries for 2A and 2B
                        if (dpt === '20') {
                            corseData.push([
                                '2A', // Duplicate for 2A
                                annais,
                                musulman_pct,
                                africain_pct,
                                asiatique_pct,
                                traditionnel_pct,
                                moderne_pct,
                                invente_pct,
                                europeen_pct
                            ]);
                            corseData.push([
                                '2B', // Duplicate for 2B
                                annais,
                                musulman_pct,
                                africain_pct,
                                asiatique_pct,
                                traditionnel_pct,
                                moderne_pct,
                                invente_pct,
                                europeen_pct
                            ]);
                            console.log(`Stored Corse (20) data for 2A and 2B:`, { annais, musulman_pct });
                        }
                    })
                    .on('end', () => {
                        console.log(`Lecture de analyse_prenom_departement.csv terminée: ${departmentRows} lignes`);
                        if (departmentRows === 0) {
                            console.warn('Avertissement: analyse_prenom_departement.csv est vide ou n\'a pas de données valides');
                        }
                        // Add 2A and 2B data if not already present
                        if (corseData.length > 0) {
                            console.log(`Adding ${corseData.length} entries for 2A and 2B from dpt 20`);
                            departmentBatch.push(...corseData);
                            departmentRows += corseData.length;
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture analyse_prenom_departement.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertDepartmentNames() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS department_names (
                            dpt TEXT,
                            annais TEXT,
                            musulman_pct REAL,
                            africain_pct REAL,
                            asiatique_pct REAL,
                            traditionnel_pct REAL,
                            moderne_pct REAL,
                            invente_pct REAL,
                            europeen_pct REAL,
                            PRIMARY KEY (dpt, annais)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table department_names:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_department_names ON department_names(dpt, annais)', (err) => {
                            if (err) {
                                console.error('Erreur création index department_names:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction department_names:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                    const batch = departmentBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...batch); // Manual flattening
                                    db.run(
                                        `INSERT OR IGNORE INTO department_names (dpt, annais, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch department_names:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit department_names:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${departmentRows} lignes dans department_names terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readDepartmentNames().then(insertDepartmentNames);
    }

    // Import commune_names from analyse_prenom_commune.csv
    function importCommuneNames() {
        let communeRows = 0;
        let communeBatch = [];

        function readCommuneNames() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('analyse_prenom_commune.csv')) {
                    console.error('Erreur: analyse_prenom_commune.csv n\'existe pas dans le répertoire courant');
                    resolve(); // Continue with empty data
                    return;
                }

                fs.createReadStream('analyse_prenom_commune.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['COG']) missingFields.push('COG');
                        if (!row['commune']) missingFields.push('commune');
                        if (!row['annais']) missingFields.push('annais');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans analyse_prenom_commune.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        const musulman_pct = parseFloat(row['Musulman_pct']) || 0;
                        const africain_pct = parseFloat(row['Africain_pct']) || 0;
                        const asiatique_pct = parseFloat(row['Asiatique_pct']) || 0;
                        const traditionnel_pct = parseFloat(row['Traditionnel_pct']) || 0;
                        const moderne_pct = parseFloat(row['Moderne_pct']) || 0;
                        const invente_pct = parseFloat(row['Inventé_pct']) || 0;
                        const europeen_pct = parseFloat(row['Européen_pct']) || 0;
                        const annais = row['annais'];

                        communeRows++;
                        communeBatch.push([
                            row['COG'],
                            row['commune'],
                            annais,
                            musulman_pct,
                            africain_pct,
                            asiatique_pct,
                            traditionnel_pct,
                            moderne_pct,
                            invente_pct,
                            europeen_pct
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de analyse_prenom_commune.csv terminée: ${communeRows} lignes`);
                        if (communeRows === 0) {
                            console.warn('Avertissement: analyse_prenom_commune.csv est vide ou n\'a pas de données valides');
                        }
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture analyse_prenom_commune.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertCommuneNames() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS commune_names (
                            COG TEXT,
                            commune TEXT,
                            annais TEXT,
                            musulman_pct REAL,
                            africain_pct REAL,
                            asiatique_pct REAL,
                            traditionnel_pct REAL,
                            moderne_pct REAL,
                            invente_pct REAL,
                            europeen_pct REAL,
                            PRIMARY KEY (COG, annais)
                        )
                    `, (err) => {
                        if (err) {
                            console.error('Erreur création table commune_names:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_commune_names ON commune_names(COG, annais)', (err) => {
                            if (err) {
                                console.error('Erreur création index commune_names:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction commune_names:', err.message);
                                    reject(err);
                                    return;
                                }

                                for (let i = 0; i < communeBatch.length; i += batchSize) {
                                    const batch = communeBatch.slice(i, i + batchSize);
                                    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                    const flatBatch = [].concat(...batch); // Manual flattening
                                    db.run(
                                        `INSERT OR IGNORE INTO commune_names (COG, commune, annais, musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, invente_pct, europeen_pct) VALUES ${placeholders}`,
                                        flatBatch,
                                        (err) => {
                                            if (err) {
                                                console.error('Erreur insertion batch commune_names:', err.message);
                                            }
                                        }
                                    );
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit commune_names:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${communeRows} lignes dans commune_names terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }

        return readCommuneNames().then(insertCommuneNames);
    }

    // Execute imports sequentially
    importCountryNames()
        .then(importDepartmentNames)
        .then(importCommuneNames)
        .then(() => callback(null))
        .catch((err) => {
            console.error('Échec de l\'importation des names:', err.message);
            callback(err);
        });
}

module.exports = { importNames };