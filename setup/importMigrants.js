const fs = require('fs');
const csv = require('csv-parser');

function importMigrants(db, callback) {
    const batchSize = 1000;

    // Import migrant centers from centres_migrants.csv
    function importMigrantCenters() {
        let migrantRows = 0;
        let allMigrantData = [];
        let skippedRows = 0;

        function processSortedData() {
            return new Promise((resolve, reject) => {
                if (allMigrantData.length === 0) {
                    resolve();
                    return;
                }

                // Sort by places descending, then by departement, COG, gestionnaire
                allMigrantData.sort((a, b) => {
                    const placesA = a[5] || 0; // places is at index 5
                    const placesB = b[5] || 0;
                    if (placesB !== placesA) {
                        return placesB - placesA; // descending order
                    }
                    if (a[1] !== b[1]) {
                        return a[1].localeCompare(b[1]);
                    }
                    if (a[0] !== b[0]) {
                        return a[0].localeCompare(b[0]);
                    }
                    return (a[3] || '').localeCompare(b[3] || '');
                });

                console.log(`Données triées: ${allMigrantData.length} centres par places (décroissant)`);

                // Process in batches
                let batchIndex = 0;
                function processBatch() {
                    const batch = allMigrantData.slice(batchIndex, batchIndex + batchSize);
                    if (batch.length === 0) {
                        if (skippedRows > 0) {
                            console.warn(`Avertissement: ${skippedRows} lignes ignorées en raison de contraintes d'unicité`);
                        }
                        resolve();
                        return;
                    }

                    db.run('BEGIN TRANSACTION', err => {
                        if (err) {
                            console.error('Erreur début transaction migrant_centers:', err.message);
                            reject(err);
                            return;
                        }

                        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                        const flatBatch = [].concat(...batch);
                        db.run(
                            `INSERT INTO migrant_centers (
                                COG, departement, type, gestionnaire, adresse, places,
                                latitude, longitude
                            ) VALUES ${placeholders}`,
                            flatBatch,
                            err => {
                                if (err) {
                                    console.error('Erreur insertion batch migrant_centers:', err.message);
                                    if (err.message.includes('UNIQUE constraint failed')) {
                                        skippedRows += batch.length;
                                        console.warn(`Batch ignoré en raison de contrainte d'unicité: ${batch.length} lignes`);
                                    }
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                db.run('COMMIT', err => {
                                    if (err) {
                                        console.error('Erreur commit migrant_centers:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        batchIndex += batchSize;
                                        processBatch();
                                    }
                                });
                            }
                        );
                    });
                }

                processBatch();
            });
        }

        function readMigrantCenters() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/centres_migrants.csv')) {
                    const error = new Error('setup/centres_migrants.csv does not exist in the current directory');
                    console.error(error.message);
                    reject(error);
                    return;
                }

                const stream = fs.createReadStream('setup/centres_migrants.csv').pipe(csv());

                stream
                    .on('data', (row) => {
                        const missingFields = [];
                        if (!row['COG']) missingFields.push('COG');
                        if (!row['departement']) missingFields.push('departement');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans centres_migrants.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            return;
                        }

                        // Normalize department code
                        let departement = row['departement'].trim().toUpperCase();
                        if (/^\d+$/.test(departement)) {
                            departement = departement.padStart(2, '0');
                        }
                        if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)) {
                            console.warn(`Code département invalide ignoré dans centres_migrants.csv: ${departement}`, row);
                            return;
                        }

                        // Parse numeric fields, allow null if invalid
                        const latitude = row['latitude'] && !isNaN(parseFloat(row['latitude'])) ? parseFloat(row['latitude']) : null;
                        const longitude = row['longitude'] && !isNaN(parseFloat(row['longitude'])) ? parseFloat(row['longitude']) : null;

                        // Handle optional text fields
                        const type = row['type'] ? row['type'].trim() : null;
                        const gestionnaire = row['gestionnaire'] ? row['gestionnaire'].trim() : null;
                        const adresse = row['adresse'] ? row['adresse'].trim() : null;
                        const places = row['places'] && !isNaN(parseInt(row['places'])) ? parseInt(row['places']) : null;

                        migrantRows++;
                        allMigrantData.push([
                            row['COG'],
                            departement,
                            type,
                            gestionnaire,
                            adresse,
                            places,
                            latitude,
                            longitude,
                        ]);
                    })
                    .on('end', () => {
                        console.log(`Lecture de centres_migrants.csv terminée: ${migrantRows} lignes`);
                        if (migrantRows === 0) {
                            console.warn('Avertissement: centres_migrants.csv est vide ou n\'a pas de données valides');
                        }
                        processSortedData()
                            .then(resolve)
                            .catch(reject);
                    })
                    .on('error', (err) => {
                        console.error('Erreur lecture centres_migrants.csv:', err.message);
                        reject(err);
                    });
            });
        }

        function insertMigrantCenters() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(`
                        CREATE TABLE IF NOT EXISTS migrant_centers (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            COG TEXT NOT NULL,
                            departement TEXT NOT NULL,
                            type TEXT,
                            gestionnaire TEXT,
                            adresse TEXT,
                            places INTEGER,
                            latitude REAL,
                            longitude REAL,
                            UNIQUE(COG, type, gestionnaire, adresse, places)
                        )
                    `, err => {
                        if (err) {
                            console.error('Erreur création table migrant_centers:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_migrant_centers_cog ON migrant_centers(COG)', err => {
                            if (err) {
                                console.error('Erreur création index migrant_centers COG:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('CREATE INDEX IF NOT EXISTS idx_migrant_centers_dept ON migrant_centers(departement)', err => {
                                if (err) {
                                    console.error('Erreur création index migrant_centers département:', err.message);
                                    reject(err);
                                    return;
                                }

                                db.run('CREATE INDEX IF NOT EXISTS idx_migrant_centers_places ON migrant_centers(places)', err => {
                                    if (err) {
                                        console.error('Erreur création index migrant_centers places:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                });
                            });
                        });
                    });
                });
            });
        }

        return insertMigrantCenters().then(readMigrantCenters);
    }

    importMigrantCenters()
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des centres migrants:', err.message);
            callback(err);
        });
}

module.exports = { importMigrants };