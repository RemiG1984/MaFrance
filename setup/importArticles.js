const fs = require("fs");
const csv = require("csv-parser");

function importArticles(db, callback) {
    let articleBatch = [];
    let articleRows = 0;
    const batchSize = 1000;

    function insertArticles() {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(
                    `
                    CREATE TABLE IF NOT EXISTS articles (
                        date TEXT,
                        departement TEXT,
                        cog TEXT,
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
                `,
                    (err) => {
                        if (err) {
                            console.error(
                                "Erreur création table articles:",
                                err.message,
                            );
                            reject(err);
                            return;
                        }

                        db.run(
                            "CREATE INDEX IF NOT EXISTS idx_articles_dept_commune ON articles(departement, cog, commune, lieu)",
                            (err) => {
                                if (err) {
                                    console.error(
                                        "Erreur création index articles:",
                                        err.message,
                                    );
                                    reject(err);
                                    return;
                                }

                                db.run("BEGIN TRANSACTION", (err) => {
                                    if (err) {
                                        console.error(
                                            "Erreur début transaction articles:",
                                            err.message,
                                        );
                                        reject(err);
                                        return;
                                    }

                                    if (
                                        !fs.existsSync("setup/fdesouche_analyzed.csv")
                                    ) {
                                        console.error(
                                            "Erreur: setup/fdesouche_analyzed.csv n'existe pas dans le répertoire courant",
                                        );
                                        db.run("COMMIT", () => resolve());
                                        return;
                                    }

                                    const allArticles = [];
                                    
                                    fs.createReadStream(
                                        "setup/fdesouche_analyzed.csv",
                                    )
                                        .pipe(csv())
                                        .on("data", (row) => {
                                            const missingFields = [];
                                            if (!row.date)
                                                missingFields.push("date");
                                            if (!row.departement)
                                                missingFields.push(
                                                    "departement",
                                                );
                                            if (!row.title)
                                                missingFields.push("title");
                                            if (!row.url)
                                                missingFields.push("url");

                                            if (missingFields.length > 0) {
                                                console.warn(
                                                    `Ligne ignorée (champs manquants: ${missingFields.join(", ")}):`,
                                                    row,
                                                );
                                                return;
                                            }

                                            // Normalize departement code
                                            let normalizedDepartement =
                                                row.departement.trim();
                                            if (
                                                normalizedDepartement.length <=
                                                2
                                            ) {
                                                normalizedDepartement =
                                                    normalizedDepartement.padStart(
                                                        2,
                                                        "0",
                                                    );
                                            }

                                            const insecurite =
                                                row.Insécurité === "1" ||
                                                row.Insécurité === "1.0" ||
                                                row.Insécurité == 1
                                                    ? 1
                                                    : 0;
                                            const immigration =
                                                row.Immigration === "1" ||
                                                row.Immigration === "1.0" ||
                                                row.Immigration == 1
                                                    ? 1
                                                    : 0;
                                            const islamisme =
                                                row.Islamisme === "1" ||
                                                row.Islamisme === "1.0" ||
                                                row.Islamisme == 1
                                                    ? 1
                                                    : 0;
                                            const defrancisation =
                                                row.Défrancisation === "1" ||
                                                row.Défrancisation === "1.0" ||
                                                row.Défrancisation == 1
                                                    ? 1
                                                    : 0;
                                            const wokisme =
                                                row.Wokisme === "1" ||
                                                row.Wokisme === "1.0" ||
                                                row.Wokisme == 1
                                                    ? 1
                                                    : 0;

                                            const cog =
                                                row.COG && row.COG.trim() !== ""
                                                    ? row.COG
                                                    : null;
                                            const commune =
                                                row.commune &&
                                                row.commune.trim() !== ""
                                                    ? row.commune
                                                    : null;
                                            const lieu =
                                                row.lieu &&
                                                row.lieu.trim() !== ""
                                                    ? row.lieu
                                                    : null;

                                            allArticles.push([
                                                row.date,
                                                normalizedDepartement,
                                                cog,
                                                commune,
                                                lieu,
                                                row.title,
                                                row.url,
                                                insecurite,
                                                immigration,
                                                islamisme,
                                                defrancisation,
                                                wokisme,
                                            ]);

                                            articleRows++;
                                        })
                                        .on("end", () => {
                                            // Sort all articles by date in descending order
                                            allArticles.sort((a, b) => {
                                                // Normalize dates to ensure proper sorting
                                                let dateA = a[0]; // date is at index 0
                                                let dateB = b[0];
                                                
                                                // Parse French date format (DD/MM/YYYY)
                                                function parseFrenchDate(dateStr) {
                                                    if (!dateStr) return null;
                                                    
                                                    // Check if it's in DD/MM/YYYY format
                                                    const frenchDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                                                    if (frenchDateMatch) {
                                                        const [, day, month, year] = frenchDateMatch;
                                                        // Convert to ISO format (YYYY-MM-DD) for reliable parsing
                                                        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                                                    }
                                                    
                                                    // Try standard parsing as fallback
                                                    return new Date(dateStr);
                                                }
                                                
                                                const parsedDateA = parseFrenchDate(dateA);
                                                const parsedDateB = parseFrenchDate(dateB);
                                                
                                                // Check if dates are valid
                                                if (!parsedDateA || !parsedDateB || isNaN(parsedDateA.getTime()) || isNaN(parsedDateB.getTime())) {
                                                    console.warn('Invalid date found:', dateA, dateB);
                                                    // Fallback to string comparison
                                                    return dateB.localeCompare(dateA);
                                                }
                                                
                                                return parsedDateB - parsedDateA; // Descending order (newest first)
                                            });

                                            console.log(`Sorted ${allArticles.length} articles by date (descending)`);

                                            // Insert sorted articles in batches
                                            let currentBatch = [];
                                            for (let i = 0; i < allArticles.length; i++) {
                                                currentBatch.push(allArticles[i]);

                                                if (currentBatch.length >= batchSize || i === allArticles.length - 1) {
                                                    const placeholders = currentBatch
                                                        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                                                        .join(",");
                                                    const flatBatch = [].concat(...currentBatch);

                                                    db.run(
                                                        `INSERT INTO articles (date, departement, cog, commune, lieu, title, url, insecurite, immigration, islamisme, defrancisation, wokisme) VALUES ${placeholders}`,
                                                        flatBatch,
                                                        (err) => {
                                                            if (err) {
                                                                console.error(
                                                                    "Erreur insertion batch articles:",
                                                                    err.message,
                                                                );
                                                            }
                                                        },
                                                    );
                                                    currentBatch = [];
                                                }
                                            }

                                            db.run("COMMIT", (err) => {
                                                if (err) {
                                                    console.error(
                                                        "Erreur commit articles:",
                                                        err.message,
                                                    );
                                                    db.run("ROLLBACK");
                                                    reject(err);
                                                } else {
                                                    console.log(
                                                        `Importation de ${articleRows} lignes dans articles terminée`,
                                                    );
                                                    if (articleRows === 0) {
                                                        console.warn(
                                                            "Avertissement: fdesouche_analyzed.csv est vide ou n'a pas de données valides",
                                                        );
                                                    }
                                                    resolve();
                                                }
                                            });
                                        })
                                        .on("error", (err) => {
                                            console.error(
                                                "Erreur lecture fdesouche_analyzed.csv:",
                                                err.message,
                                            );
                                            db.run("ROLLBACK");
                                            reject(err);
                                        });
                                });
                            },
                        );
                    },
                );
            });
        });
    }

    insertArticles()
        .then(() => callback(null))
        .catch((err) => {
            console.error("Échec de l'importation des articles:", err.message);
            callback(err);
        });
}

module.exports = { importArticles };
