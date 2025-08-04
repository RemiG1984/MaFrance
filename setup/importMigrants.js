
const fs = require('fs');
const csv = require('csv-parser');

function importMigrants(db, callback) {
    const batchSize = 1000;

    // Import migrant centers from centres_migrants.csv
    function importMigrantCenters() {
        let migrantRows = 0;
        let migrantBatch = [];

        function processBatch() {
            return new Promise((resolve, reject) => {
                if (migrantBatch.length === 0) {
                    resolve();
                    return;
                }

                db.run('BEGIN TRANSACTION', err => {
                    if (err) {
                        console.error('Erreur début transaction migrant_centers:', err.message);
                        reject(err);
                        return;
                    }

                    const placeholders = migrantBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                    const flatBatch = [].concat(...migrantBatch);
                    db.run(
                        `INSERT OR IGNORE INTO migrant_centers (
                            COG, departement, region, type_centre, nom_centre, adresse,
                            latitude, longitude, capacite, date_ouverture, date_fermeture,
                            statut, gestionnaire, population_cible, services_proposes,
                            contact_telephone, contact_email, site_web, notes, derniere_maj
                        ) VALUES ${placeholders}`,
                        flatBatch,
                        err => {
                            if (err) {
                                console.error('Erreur insertion batch migrant_centers:', err.message);
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
                                    migrantBatch = []; // Clear batch
                                    resolve();
                                }
                            });
                        }
                    );
                });
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
                        const capacite = row['capacite'] && !isNaN(parseInt(row['capacite'])) ? parseInt(row['capacite']) : null;
                        const latitude = row['latitude'] && !isNaN(parseFloat(row['latitude'])) ? parseFloat(row['latitude']) : null;
                        const longitude = row['longitude'] && !isNaN(parseFloat(row['longitude'])) ? parseFloat(row['longitude']) : null;

                        // Parse dates, allow null if invalid or empty
                        let dateOuverture = null;
                        let dateFermeture = null;
                        let derniereMaj = null;

                        if (row['date_ouverture'] && /^\d{4}-\d{2}-\d{2}$/.test(row['date_ouverture'])) {
                            dateOuverture = row['date_ouverture'];
                        }
                        if (row['date_fermeture'] && /^\d{4}-\d{2}-\d{2}$/.test(row['date_fermeture'])) {
                            dateFermeture = row['date_fermeture'];
                        }
                        if (row['derniere_maj'] && /^\d{4}-\d{2}-\d{2}$/.test(row['derniere_maj'])) {
                            derniereMaj = row['derniere_maj'];
                        }

                        // Handle optional text fields
                        const region = row['region'] ? row['region'].trim() : null;
                        const typeCentre = row['type_centre'] ? row['type_centre'].trim() : null;
                        const nomCentre = row['nom_centre'] ? row['nom_centre'].trim() : null;
                        const adresse = row['adresse'] ? row['adresse'].trim() : null;
                        const statut = row['statut'] ? row['statut'].trim() : null;
                        const gestionnaire = row['gestionnaire'] ? row['gestionnaire'].trim() : null;
                        const populationCible = row['population_cible'] ? row['population_cible'].trim() : null;
                        const servicesProposes = row['services_proposes'] ? row['services_proposes'].trim() : null;
                        const contactTelephone = row['contact_telephone'] ? row['contact_telephone'].trim() : null;
                        const contactEmail = row['contact_email'] ? row['contact_email'].trim() : null;
                        const siteWeb = row['site_web'] ? row['site_web'].trim() : null;
                        const notes = row['notes'] ? row['notes'].trim() : null;

                        migrantRows++;
                        migrantBatch.push([
                            row['COG'],
                            departement,
                            region,
                            typeCentre,
                            nomCentre,
                            adresse,
                            latitude,
                            longitude,
                            capacite,
                            dateOuverture,
                            dateFermeture,
                            statut,
                            gestionnaire,
                            populationCible,
                            servicesProposes,
                            contactTelephone,
                            contactEmail,
                            siteWeb,
                            notes,
                            derniereMaj
                        ]);

                        if (migrantBatch.length >= batchSize) {
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
                        console.log(`Lecture de centres_migrants.csv terminée: ${migrantRows} lignes`);
                        if (migrantRows === 0) {
                            console.warn('Avertissement: centres_migrants.csv est vide ou n\'a pas de données valides');
                        }
                        // Process any remaining rows
                        processBatch()
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
                            COG TEXT,
                            departement TEXT,
                            region TEXT,
                            type_centre TEXT,
                            nom_centre TEXT,
                            adresse TEXT,
                            latitude REAL,
                            longitude REAL,
                            capacite INTEGER,
                            date_ouverture TEXT,
                            date_fermeture TEXT,
                            statut TEXT,
                            gestionnaire TEXT,
                            population_cible TEXT,
                            services_proposes TEXT,
                            contact_telephone TEXT,
                            contact_email TEXT,
                            site_web TEXT,
                            notes TEXT,
                            derniere_maj TEXT,
                            PRIMARY KEY (COG, nom_centre, adresse)
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

                                db.run('CREATE INDEX IF NOT EXISTS idx_migrant_centers_type ON migrant_centers(type_centre)', err => {
                                    if (err) {
                                        console.error('Erreur création index migrant_centers type:', err.message);
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

    // Execute import
    importMigrantCenters()
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des centres migrants:', err.message);
            callback(err);
        });
}

module.exports = { importMigrants };
