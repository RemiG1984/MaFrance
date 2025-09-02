const fs = require("fs");
const csv = require("csv-parser");

function importFrancocides(db, callback) {
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
        return new Promise((resolve, reject) => {
            if (!fs.existsSync('setup/francocides.csv')) {
                console.error('Erreur: setup/francocides.csv n\'existe pas dans le répertoire setup');
                resolve(); // Continue with empty data
                return;
            }

            let francocidesTotal = 0;
            let francocidesSkipped = 0;
            let francocidesProcessed = 0;
            const francocidesData = [];

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

                    francocidesData.push({
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
                })
                .on('end', () => {
                    console.log(`Lecture francocides.csv terminée. Total: ${francocidesTotal}, Ignorées: ${francocidesSkipped}, À traiter: ${francocidesData.length}`);

                    if (francocidesData.length === 0) {
                        console.log('✓ Import francocides terminé: 0 entrées insérées');
                        resolve();
                        return;
                    }

                    // Insert all data at once
                    const placeholders = francocidesData.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
                    const insertSQL = `INSERT INTO francocides (date_deces, cog, prenom, nom, sexe, age, photo, url_fdesouche, url_wikipedia) VALUES ${placeholders}`;

                    const values = [];
                    francocidesData.forEach(row => {
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
                            console.error('Erreur insertion francocides:', err.message);
                            reject(err);
                            return;
                        }

                        console.log(`✓ Import francocides terminé: ${francocidesData.length} entrées insérées`);
                        resolve();
                    });
                })
                .on('error', reject);
        });
    }

    // Run the import process
    createFrancocidesTable()
        .then(() => importFrancocidesData())
        .then(() => callback(null))
        .catch(callback);
}

module.exports = { importFrancocides };