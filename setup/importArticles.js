const fs = require("fs");
const csv = require("csv-parser");

const cogLieuMap = new Map(); // Map<cog, Set<lieu>>

function createTables(db) {
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
                        console.error("Erreur création table articles:", err.message);
                        reject(err);
                        return;
                    }

                    db.run(
                        "CREATE INDEX IF NOT EXISTS idx_articles_dept_commune ON articles(departement, cog, commune, lieu)",
                        (err) => {
                            if (err) {
                                console.error("Erreur création index articles:", err.message);
                                reject(err);
                                return;
                            }

                            db.run(
                                `
                                CREATE TABLE IF NOT EXISTS lieux (
                                    cog TEXT,
                                    lieu TEXT
                                )
                                `,
                                (err) => {
                                    if (err) {
                                        console.error("Erreur création table lieux:", err.message);
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                }
                            );
                        }
                    );
                }
            );
        });
    });
}

function processRow(row) {
    const missingFields = [];
    if (!row.date) missingFields.push("date");
    if (!row.departement) missingFields.push("departement");
    if (!row.title) missingFields.push("title");
    if (!row.url) missingFields.push("url");

    if (missingFields.length > 0) {
        console.warn(`Ligne ignorée (champs manquants: ${missingFields.join(", ")}):`, row);
        return null;
    }

    // Normalize departement code
    let normalizedDepartement = row.departement.trim();
    if (normalizedDepartement.length <= 2) {
        normalizedDepartement = normalizedDepartement.padStart(2, "0");
    }

    const insecurite = ["1", "1.0", 1].includes(row.Insécurité) ? 1 : 0;
    const immigration = ["1", "1.0", 1].includes(row.Immigration) ? 1 : 0;
    const islamisme = ["1", "1.0", 1].includes(row.Islamisme) ? 1 : 0;
    const defrancisation = ["1", "1.0", 1].includes(row.Défrancisation) ? 1 : 0;
    const wokisme = ["1", "1.0", 1].includes(row.Wokisme) ? 1 : 0;

    const cog = row.COG && row.COG.trim() !== "" ? row.COG : null;
    const commune = row.commune && row.commune.trim() !== "" ? row.commune : null;
    const lieu = row.lieu && row.lieu.trim() !== "" ? row.lieu : null;

    // Collect cog-lieu mapping
    if (cog && lieu) {
        if (!cogLieuMap.has(cog)) {
            cogLieuMap.set(cog, new Set());
        }
        cogLieuMap.get(cog).add(lieu);
    }

    return [
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
    ];
}

function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    const frenchDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (frenchDateMatch) {
        const [, day, month, year] = frenchDateMatch;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    return new Date(dateStr);
}

function processCSV() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync("setup/fdesouche_analyzed.csv")) {
            reject(new Error("setup/fdesouche_analyzed.csv n'existe pas"));
            return;
        }

        const allArticles = [];
        let articleRows = 0;

        fs.createReadStream("setup/fdesouche_analyzed.csv")
            .pipe(csv())
            .on("data", (row) => {
                const processed = processRow(row);
                if (processed) {
                    allArticles.push(processed);
                    articleRows++;
                }
            })
            .on("end", () => {
                // Sort all articles by date in descending order
                allArticles.sort((a, b) => {
                    const parsedDateA = parseFrenchDate(a[0]);
                    const parsedDateB = parseFrenchDate(b[0]);
                    if (!parsedDateA || !parsedDateB || isNaN(parsedDateA.getTime()) || isNaN(parsedDateB.getTime())) {
                        console.warn('Invalid date found:', a[0], b[0]);
                        return b[0].localeCompare(a[0]);
                    }
                    return parsedDateB - parsedDateA;
                });

                console.log(`Sorted ${allArticles.length} articles by date (descending)`);
                resolve({ allArticles, articleRows });
            })
            .on("error", (err) => {
                console.error("Erreur lecture CSV:", err.message);
                reject(err);
            });
    });
}

function insertBatches(db, allArticles) {
    return new Promise((resolve, reject) => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) {
                console.error("Erreur début transaction:", err.message);
                reject(err);
                return;
            }

            let currentBatch = [];
            const batchSize = 1000;
            let batchIndex = 0;

            function insertNextBatch() {
                if (batchIndex >= allArticles.length) {
                    insertLieux(db)
                        .then(() => {
                            db.run("COMMIT", (err) => {
                                if (err) {
                                    console.error("Erreur commit:", err.message);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                        })
                        .catch(reject);
                    return;
                }

                currentBatch = [];
                for (let i = batchIndex; i < Math.min(batchIndex + batchSize, allArticles.length); i++) {
                    currentBatch.push(allArticles[i]);
                }

                const placeholders = currentBatch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
                const flatBatch = [].concat(...currentBatch);

                db.run(
                    `INSERT INTO articles (date, departement, cog, commune, lieu, title, url, insecurite, immigration, islamisme, defrancisation, wokisme) VALUES ${placeholders}`,
                    flatBatch,
                    (err) => {
                        if (err) {
                            console.error("Erreur insertion batch:", err.message);
                            db.run("ROLLBACK", () => reject(err));
                            return;
                        }
                        batchIndex += batchSize;
                        insertNextBatch();
                    }
                );
            }

            insertNextBatch();
        });
    });
}

function insertLieux(db) {
    return new Promise((resolve, reject) => {
        const lieuxData = [];
        for (const [cog, lieuxSet] of cogLieuMap) {
            for (const lieu of lieuxSet) {
                lieuxData.push([cog, lieu]);
            }
        }

        if (lieuxData.length === 0) {
            resolve();
            return;
        }

        const lieuxPlaceholders = lieuxData.map(() => "(?, ?)").join(",");
        const flatLieux = [].concat(...lieuxData);
        db.run(
            `INSERT OR IGNORE INTO lieux (cog, lieu) VALUES ${lieuxPlaceholders}`,
            flatLieux,
            (err) => {
                if (err) {
                    console.error("Erreur insertion lieux:", err.message);
                    reject(err);
                } else {
                    console.log(`Inserted ${lieuxData.length} distinct cog-lieu pairs into lieux table`);
                    resolve();
                }
            }
        );
    });
}

async function importArticles(db, callback) {
    try {
        await createTables(db);
        const { allArticles, articleRows } = await processCSV();
        await insertBatches(db, allArticles);
        console.log(`Importation de ${articleRows} lignes dans articles terminée`);
        if (articleRows === 0) {
            console.warn("Avertissement: CSV est vide ou n'a pas de données valides");
        }
        callback(null);
    } catch (err) {
        console.error("Échec de l'importation des articles:", err.message);
        callback(err);
    }
}

const getCogLieuTable = () => {
    const table = {};
    for (const [cog, lieuxSet] of cogLieuMap) {
        table[cog] = Array.from(lieuxSet).sort();
    }
    return table;
};

module.exports = { importArticles, getCogLieuTable };
