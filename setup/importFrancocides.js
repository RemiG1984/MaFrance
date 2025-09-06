
const fs = require("fs");
const csv = require("csv-parser");

function importFrancocides(db, callback) {
    // Create francocides table
    function createFrancocidesTable() {
        return new Promise((resolve, reject) => {
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS francocides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prenom TEXT NOT NULL,
                    nom TEXT NOT NULL,
                    age INTEGER NOT NULL,
                    sexe TEXT NOT NULL,
                    date_deces TEXT NOT NULL,
                    cog TEXT NOT NULL,
                    photo TEXT,
                    resume TEXT,
                    source1 TEXT,
                    source2 TEXT,
                    tags TEXT,
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
            if (!fs.existsSync('setup/francocides_valides.csv')) {
                console.error('Erreur: setup/francocides_valides.csv n\'existe pas dans le répertoire setup');
                resolve(); // Continue with empty data
                return;
            }

            let francocidesTotal = 0;
            let francocidesSkipped = 0;
            let francocidesProcessed = 0;
            const francocidesData = [];

            fs.createReadStream('setup/francocides_valides.csv')
                .pipe(csv())
                .on('data', (row) => {
                    francocidesTotal++;

                    const missingFields = [];
                    if (!row['prenom']) missingFields.push('prenom');
                    if (!row['nom']) missingFields.push('nom');
                    if (!row['age']) missingFields.push('age');
                    if (!row['sexe']) missingFields.push('sexe');
                    if (!row['date_deces']) missingFields.push('date_deces');
                    if (!row['cog']) missingFields.push('cog');

                    if (missingFields.length > 0) {
                        console.warn(`Ligne ignorée dans francocides_valides.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                        francocidesSkipped++;
                        return;
                    }

                    // Validate age is a number
                    const age = parseInt(row['age'], 10);
                    if (isNaN(age)) {
                        console.warn(`Ligne ignorée dans francocides_valides.csv (âge invalide):`, row);
                        francocidesSkipped++;
                        return;
                    }

                    // Convert French date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
                    function convertFrenchDateToISO(frenchDate) {
                        const parts = frenchDate.trim().split('/');
                        if (parts.length === 3) {
                            const day = parts[0].padStart(2, '0');
                            const month = parts[1].padStart(2, '0');
                            const year = parts[2];
                            return `${year}-${month}-${day}`;
                        }
                        return frenchDate; // Return original if can't parse
                    }

                    francocidesData.push({
                        prenom: row['prenom'].trim(),
                        nom: row['nom'].trim(),
                        age: age,
                        sexe: row['sexe'].trim(),
                        date_deces: convertFrenchDateToISO(row['date_deces']),
                        cog: row['cog'].trim(),
                        photo: row['photo'] ? row['photo'].trim() : null,
                        resume: row['resume'] ? row['resume'].trim() : null,
                        source1: row['source1'] ? row['source1'].trim() : null,
                        source2: row['source2'] ? row['source2'].trim() : null,
                        tags: row['tags'] ? row['tags'].trim() : null
                    });
                })
                .on('end', () => {
                    console.log(`Lecture francocides_valides.csv terminée. Total: ${francocidesTotal}, Ignorées: ${francocidesSkipped}, À traiter: ${francocidesData.length}`);

                    if (francocidesData.length === 0) {
                        console.log('✓ Import francocides terminé: 0 entrées insérées');
                        resolve();
                        return;
                    }

                    // Insert all data at once
                    const placeholders = francocidesData.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
                    const insertSQL = `INSERT INTO francocides (prenom, nom, age, sexe, date_deces, cog, photo, resume, source1, source2, tags) VALUES ${placeholders}`;

                    const values = [];
                    francocidesData.forEach(row => {
                        values.push(
                            row.prenom,
                            row.nom,
                            row.age,
                            row.sexe,
                            row.date_deces,
                            row.cog,
                            row.photo,
                            row.resume,
                            row.source1,
                            row.source2,
                            row.tags
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
