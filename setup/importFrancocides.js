
const fs = require("fs");
const csv = require("csv-parser");

function importFrancocides(db, callback) {
    const batchSize = 1000;

    // Create francocides table
    function createFrancocidesTable() {
        return new Promise((resolve, reject) => {
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS francocides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date_deces TEXT NOT NULL,
                    cog TEXT NOT NULL,
                    prenom TEXT NOT NULL,
                    nom TEXT NOT NULL,
                    sexe TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    photo TEXT,
                    url_fdesouche TEXT,
                    url_wikipedia TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`;

            db.run(createTableSQL, (err) => {
                if (err) {
                    console.error('Erreur création table francocides:', err.message);
                    reject(err);
                } else {
                    console.log('✓ Table francocides créée');
                    resolve();
                }
            });
        });
    }

    // Import francocides data
    function importFrancocidesData() {
        let francocidesRows = 0;
        let francocidesTotal = 0;
        let francocidesSkipped = 0;
        let francocidesProcessed = 0;
        let francocidesLiveRows = 0;
        let francocidesLiveBatch = [];

        function readFrancocidesData() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync('setup/francocides.csv')) {
                    console.error('Erreur: setup/francocides.csv n\'existe pas dans le répertoire setup');
                    resolve(); // Continue with empty data
                    return;
                }

                fs.createReadStream('setup/francocides.csv')
                    .pipe(csv())
                    .on('data', (row) => {
                        francocidesTotal++;
                        
                        const missingFields = [];
                        if (!row['date_deces']) missingFields.push('date_deces');
                        if (!row['cog']) missingFields.push('cog');
                        if (!row['prenom']) missingFields.push('prenom');
                        if (!row['nom']) missingFields.push('nom');
                        if (!row['sexe']) missingFields.push('sexe');
                        if (!row['age']) missingFields.push('age');

                        if (missingFields.length > 0) {
                            console.warn(`Ligne ignorée dans francocides.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                            francocidesSkipped++;
                            return;
                        }

                        // Validate age is a number
                        const age = parseInt(row['age'], 10);
                        if (isNaN(age)) {
                            console.warn(`Ligne ignorée dans francocides.csv (âge invalide):`, row);
                            francocidesSkipped++;
                            return;
                        }

                        francocidesLiveBatch.push({
                            date_deces: row['date_deces'].trim(),
                            cog: row['cog'].trim(),
                            prenom: row['prenom'].trim(),
                            nom: row['nom'].trim(),
                            sexe: row['sexe'].trim(),
                            age: age,
                            photo: row['photo'] ? row['photo'].trim() : null,
                            url_fdesouche: row['url_fdesouche'] ? row['url_fdesouche'].trim() : null,
                            url_wikipedia: row['url_wikipedia'] ? row['url_wikipedia'].trim() : null
                        });

                        francocidesLiveRows++;

                        if (francocidesLiveBatch.length >= batchSize) {
                            insertFrancocidesBatch(francocidesLiveBatch.splice(0, batchSize));
                        }
                    })
                    .on('end', () => {
                        console.log(`Lecture francocides.csv terminée. Total: ${francocidesTotal}, Ignorées: ${francocidesSkipped}, À traiter: ${francocidesLiveRows}`);
                        
                        // Insert remaining batch
                        if (francocidesLiveBatch.length > 0) {
                            insertFrancocidesBatch(francocidesLiveBatch);
                        } else {
                            resolve();
                        }
                    })
                    .on('error', reject);
            });
        }

        function insertFrancocidesBatch(batch) {
            if (batch.length === 0) return;

            const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
            const insertSQL = `INSERT INTO francocides (date_deces, cog, prenom, nom, sexe, age, photo, url_fdesouche, url_wikipedia) VALUES ${placeholders}`;
            
            const values = [];
            batch.forEach(row => {
                values.push(
                    row.date_deces,
                    row.cog,
                    row.prenom,
                    row.nom,
                    row.sexe,
                    row.age,
                    row.photo,
                    row.url_fdesouche,
                    row.url_wikipedia
                );
            });

            db.run(insertSQL, values, function(err) {
                if (err) {
                    console.error('Erreur insertion batch francocides:', err.message);
                    return;
                }
                francocidesProcessed += batch.length;
                francocidesRows++;
                
                if (francocidesProcessed % 100 === 0 || francocidesLiveBatch.length === 0) {
                    console.log(`Francocides insérées: ${francocidesProcessed}/${francocidesLiveRows}`);
                }

                // Check if we're done
                if (francocidesProcessed >= francocidesLiveRows) {
                    console.log(`✓ Import francocides terminé: ${francocidesProcessed} entrées insérées`);
                    resolve();
                }
            });
        }

        return readFrancocidesData();
    }

    // Run the import process
    createFrancocidesTable()
        .then(() => importFrancocidesData())
        .then(() => callback(null))
        .catch(callback);
}

module.exports = { importFrancocides };
