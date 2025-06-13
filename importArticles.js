const fs = require('fs');
const csv = require('csv-parser');

function importArticles(db, callback) {
    let articleBatch = [];
    let articleRows = 0;
    const batchSize = 1000;

    function insertArticles() {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS articles (
                        date TEXT,
                        departement TEXT,
                        commune TEXT,
                        lieu TEXT,
                        title TEXT,
                        url TEXT,
                        insecurite INTEGER,
                        immigration INTEGER,
                        islamisme INTEGER,
                        defrancisation INTEGER,
                        wokisme INTEGER
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erreur création table articles:', err.message);
                        reject(err);
                        return;
                    }

                    db.run('CREATE INDEX IF NOT EXISTS idx_articles_dept_commune ON articles(departement, commune, lieu)', (err) => {
                        if (err) {
                            console.error('Erreur création index articles:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('BEGIN TRANSACTION', (err) => {
                            if (err) {
                                console.error('Erreur début transaction articles:', err.message);
                                reject(err);
                                return;
                            }

                            if (!fs.existsSync('fdesouche_analyzed.csv')) {
                                console.error('Erreur: fdesouche_analyzed.csv n\'existe pas dans le répertoire courant');
                                db.run('COMMIT', () => resolve());
                                return;
                            }

                            fs.createReadStream('fdesouche_analyzed.csv')
                                .pipe(csv())
                                .on('data', (row) => {
                                    const missingFields = [];
                                    if (!row.date) missingFields.push('date');
                                    if (!row.departement) missingFields.push('departement');
                                    if (!row.title) missingFields.push('title');
                                    if (!row.url) missingFields.push('url');

                                    if (missingFields.length > 0) {
                                        console.warn(`Ligne ignorée (champs manquants: ${missingFields.join(', ')}):`, row);
                                        return;
                                    }

                                    // Normalize departement code
                                    let normalizedDepartement = row.departement.trim();                                   
                                    if (normalizedDepartement.length <= 2) {
                                        normalizedDepartement = normalizedDepartement.padStart(2, '0');
                                    }
                                    

                                    const insecurite = row.Insécurité === '1' || row.Insécurité === '1.0' || row.Insécurité == 1 ? 1 : 0;
                                    const immigration = row.Immigration === '1' || row.Immigration === '1.0' || row.Immigration == 1 ? 1 : 0;
                                    const islamisme = row.Islamisme === '1' || row.Islamisme === '1.0' || row.Islamisme == 1 ? 1 : 0;
                                    const defrancisation = row.Défrancisation === '1' || row.Défrancisation === '1.0' || row.Défrancisation == 1 ? 1 : 0;
                                    const wokisme = row.Wokisme === '1' || row.Wokisme === '1.0' || row.Wokisme == 1 ? 1 : 0;

                                    const commune = row.commune && row.commune.trim() !== '' ? row.commune : null;
                                    const lieu = row.lieu && row.lieu.trim() !== '' ? row.lieu : null;

                                    articleBatch.push([
                                        row.date,
                                        normalizedDepartement,
                                        commune,
                                        lieu,
                                        row.title,
                                        row.url,
                                        insecurite,
                                        immigration,
                                        islamisme,
                                        defrancisation,
                                        wokisme
                                    ]);

                                    articleRows++;

                                    if (articleBatch.length >= batchSize) {
                                        const placeholders = articleBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                        const flatBatch = [].concat(...articleBatch); // Manual flattening
                                        db.run(
                                            `INSERT INTO articles (date, departement, commune, lieu, title, url, insecurite, immigration, islamisme, defrancisation, wokisme) VALUES ${placeholders}`,
                                            flatBatch,
                                            (err) => {
                                                if (err) {
                                                    console.error('Erreur insertion batch articles:', err.message);
                                                }
                                            }
                                        );
                                        articleBatch = [];
                                    }
                                })
                                .on('end', () => {
                                    if (articleBatch.length > 0) {
                                        const placeholders = articleBatch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                        const flatBatch = [].concat(...articleBatch); // Manual flattening
                                        db.run(
                                            `INSERT INTO articles (date, departement, commune, lieu, title, url, insecurite, immigration, islamisme, defrancisation, wokisme) VALUES ${placeholders}`,
                                            flatBatch,
                                            (err) => {
                                                if (err) {
                                                    console.error('Erreur insertion batch final articles:', err.message);
                                                }
                                            }
                                        );
                                    }

                                    db.run('COMMIT', (err) => {
                                        if (err) {
                                            console.error('Erreur commit articles:', err.message);
                                            db.run('ROLLBACK');
                                            reject(err);
                                        } else {
                                            console.log(`Importation de ${articleRows} lignes dans articles terminée`);
                                            if (articleRows === 0) {
                                                console.warn('Avertissement: fdesouche_analyzed.csv est vide ou n\'a pas de données valides');
                                            }
                                            resolve();
                                        }
                                    });
                                })
                                .on('error', (err) => {
                                    console.error('Erreur lecture fdesouche_analyzed.csv:', err.message);
                                    db.run('ROLLBACK');
                                    reject(err);
                                });
                        });
                    });
                });
            });
        });
    }

    insertArticles()
        .then(() => callback(null))
        .catch((err) => {
            console.error('Échec de l\'importation des articles:', err.message);
            callback(err);
        });
}

module.exports = { importArticles };