const fs = require("fs");
const csv = require("csv-parser");

function importElus(db, callback) {
    const batchSize = 1000;

    // Import mayors from maires_list.csv
    function importMaires() {
        let maireRows = 0;
        let maireBatch = [];

        function processMaireBatch() {
            return new Promise((resolve, reject) => {
                if (maireBatch.length === 0) {
                    resolve();
                    return;
                }

                db.run("BEGIN TRANSACTION", (err) => {
                    if (err) {
                        console.error(
                            "Erreur début transaction maires:",
                            err.message,
                        );
                        reject(err);
                        return;
                    }

                    const placeholders = maireBatch
                        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)")
                        .join(",");
                    const flatBatch = [].concat(...maireBatch);
                    db.run(
                        `INSERT OR IGNORE INTO maires (
                            cog, commune, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique
                        ) VALUES ${placeholders}`,
                        flatBatch,
                        (err) => {
                            if (err) {
                                console.error(
                                    "Erreur insertion batch maires:",
                                    err.message,
                                );
                                db.run("ROLLBACK");
                                reject(err);
                                return;
                            }
                            db.run("COMMIT", (err) => {
                                if (err) {
                                    console.error(
                                        "Erreur commit maires:",
                                        err.message,
                                    );
                                    db.run("ROLLBACK");
                                    reject(err);
                                } else {
                                    maireBatch = [];
                                    resolve();
                                }
                            });
                        },
                    );
                });
            });
        }

        function readMaires() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync("maires_list.csv")) {
                    const error = new Error(
                        "maires_list.csv does not exist in the current directory",
                    );
                    console.error(error.message);
                    reject(error);
                    return;
                }

                const stream = fs
                    .createReadStream("maires_list.csv")
                    .pipe(csv());

                stream
                    .on("data", (row) => {
                        const missingFields = [];
                        if (!row["cog"]) missingFields.push("cog");
                        if (!row["commune"]) missingFields.push("commune");
                        if (!row["prenom"]) missingFields.push("prenom");
                        if (!row["nom"]) missingFields.push("nom");
                        if (!row["sexe"]) missingFields.push("sexe");

                        if (missingFields.length > 0) {
                            console.warn(
                                `Ligne ignorée dans maires_list.csv (champs manquants: ${missingFields.join(", ")}):`,
                                row,
                            );
                            return;
                        }

                        // Validate COG (5-digit code)
                        const cog = row["cog"].trim();

                        // Validate sexe
                        const sexe = row["sexe"].trim().toUpperCase();
                        if (!["M", "F"].includes(sexe)) {
                            console.warn(`Sexe invalide ignoré: ${sexe}`, row);
                            return;
                        }

                        // Parse dates, allow null if invalid
                        let dateNais = null;
                        let dateMandat = null;
                        if (
                            row["dateNais"] &&
                            /^\d{4}-\d{2}-\d{2}$/.test(row["dateNais"])
                        ) {
                            dateNais = row["dateNais"];
                        }
                        if (
                            row["dateMandat"] &&
                            /^\d{4}-\d{2}-\d{2}$/.test(row["dateMandat"])
                        ) {
                            dateMandat = row["dateMandat"];
                        }

                        // Normalize famille_nuance and nuance_politique
                        const familleNuance = row["famille_nuance"]
                            ? row["famille_nuance"].trim()
                            : null;
                        const nuancePolitique = row["nuance_politique"]
                            ? row["nuance_politique"].trim()
                            : null;

                        maireRows++;
                        maireBatch.push([
                            cog,
                            row["commune"].trim(),
                            row["prenom"].trim(),
                            row["nom"].trim(),
                            sexe,
                            dateNais,
                            dateMandat,
                            familleNuance,
                            nuancePolitique,
                        ]);

                        if (maireBatch.length >= batchSize) {
                            stream.pause();
                            processMaireBatch()
                                .then(() => stream.resume())
                                .catch((err) => stream.destroy(err));
                        }
                    })
                    .on("end", () => {
                        console.log(
                            `Lecture de maires_list.csv terminée: ${maireRows} lignes`,
                        );
                        if (maireRows === 0) {
                            console.warn(
                                "Avertissement: maires_list.csv est vide ou n'a pas de données valides",
                            );
                        }
                        // Process any remaining rows
                        processMaireBatch().then(resolve).catch(reject);
                    })
                    .on("error", (err) => {
                        console.error(
                            "Erreur lecture maires_list.csv:",
                            err.message,
                        );
                        reject(err);
                    });
            });
        }

        function insertMaires() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(
                        `
                        CREATE TABLE IF NOT EXISTS maires (
                            cog TEXT,
                            commune TEXT,
                            prenom TEXT,
                            nom TEXT,
                            sexe TEXT CHECK(sexe IN ('M', 'F')),
                            date_nais TEXT,
                            date_mandat TEXT,
                            famille_nuance TEXT,
                            nuance_politique TEXT,
                            PRIMARY KEY (cog)
                        )
                    `,
                        (err) => {
                            if (err) {
                                console.error(
                                    "Erreur création table maires:",
                                    err.message,
                                );
                                reject(err);
                                return;
                            }

                            db.run(
                                "CREATE INDEX IF NOT EXISTS idx_maires_commune ON maires(commune)",
                                (err) => {
                                    if (err) {
                                        console.error(
                                            "Erreur création index maires:",
                                            err.message,
                                        );
                                        reject(err);
                                        return;
                                    }
                                    resolve();
                                },
                            );
                        },
                    );
                });
            });
        }

        return insertMaires().then(readMaires);
    }

    // Import prefects from prefets_list.csv
    function importPrefets() {
        let prefetRows = 0;
        let prefetBatch = [];

        function readPrefets() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync("prefets_list.csv")) {
                    const error = new Error(
                        "prefets_list.csv does not exist in the current directory",
                    );
                    console.error(error.message);
                    reject(error);
                    return;
                }

                fs.createReadStream("prefets_list.csv")
                    .pipe(csv())
                    .on("data", (row) => {
                        const missingFields = [];
                        if (!row["Code"]) missingFields.push("Code");
                        if (!row["Prenom"]) missingFields.push("Prenom");
                        if (!row["Nom"]) missingFields.push("Nom");

                        if (missingFields.length > 0) {
                            console.warn(
                                `Ligne ignorée dans prefets_list.csv (champs manquants: ${missingFields.join(", ")}):`,
                                row,
                            );
                            return;
                        }

                        // Normalize department code
                        let code = row["Code"].trim().toUpperCase();
                        if (/^\d+$/.test(code)) {
                            code = code.padStart(2, "0");
                        }
                        if (
                            !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(
                                code,
                            )
                        ) {
                            console.warn(
                                `Code département invalide ignoré: ${code}`,
                                row,
                            );
                            return;
                        }

                        // Parse datePoste, allow null if invalid
                        let datePoste = null;
                        if (
                            row["datePoste"] &&
                            /^\d{2}\/\d{2}\/\d{2}$/.test(row["datePoste"])
                        ) {
                            const [day, month, year] =
                                row["datePoste"].split("/");
                            datePoste = `20${year}-${month}-${day}`;
                        }

                        prefetRows++;
                        prefetBatch.push([
                            code,
                            row["Prenom"].trim(),
                            row["Nom"].trim(),
                            datePoste,
                        ]);
                    })
                    .on("end", () => {
                        console.log(
                            `Lecture de prefets_list.csv terminée: ${prefetRows} lignes`,
                        );
                        if (prefetRows === 0) {
                            console.warn(
                                "Avertissement: prefets_list.csv est vide ou n'a pas de données valides",
                            );
                        }
                        resolve();
                    })
                    .on("error", (err) => {
                        console.error(
                            "Erreur lecture prefets_list.csv:",
                            err.message,
                        );
                        reject(err);
                    });
            });
        }

        function insertPrefets() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(
                        `
                        CREATE TABLE IF NOT EXISTS prefets (
                            code TEXT,
                            prenom TEXT,
                            nom TEXT,
                            date_poste TEXT,
                            PRIMARY KEY (code)
                        )
                    `,
                        (err) => {
                            if (err) {
                                console.error(
                                    "Erreur création table prefets:",
                                    err.message,
                                );
                                reject(err);
                                return;
                            }

                            db.run(
                                "CREATE INDEX IF NOT EXISTS idx_prefets_nom ON prefets(nom)",
                                (err) => {
                                    if (err) {
                                        console.error(
                                            "Erreur création index prefets:",
                                            err.message,
                                        );
                                        reject(err);
                                        return;
                                    }

                                    db.run("BEGIN TRANSACTION", (err) => {
                                        if (err) {
                                            console.error(
                                                "Erreur début transaction prefets:",
                                                err.message,
                                            );
                                            reject(err);
                                            return;
                                        }

                                        if (prefetBatch.length > 0) {
                                            const placeholders = prefetBatch
                                                .map(() => "(?, ?, ?, ?)")
                                                .join(",");
                                            const flatBatch = [].concat(
                                                ...prefetBatch,
                                            );
                                            db.run(
                                                `INSERT OR IGNORE INTO prefets (code, prenom, nom, date_poste) VALUES ${placeholders}`,
                                                flatBatch,
                                                (err) => {
                                                    if (err) {
                                                        console.error(
                                                            "Erreur insertion batch prefets:",
                                                            err.message,
                                                        );
                                                        db.run("ROLLBACK");
                                                        reject(err);
                                                        return;
                                                    }
                                                    db.run("COMMIT", (err) => {
                                                        if (err) {
                                                            console.error(
                                                                "Erreur commit prefets:",
                                                                err.message,
                                                            );
                                                            db.run("ROLLBACK");
                                                            reject(err);
                                                        } else {
                                                            console.log(
                                                                `Importation de ${prefetRows} lignes dans prefets terminée`,
                                                            );
                                                            resolve();
                                                        }
                                                    });
                                                },
                                            );
                                        } else {
                                            db.run("COMMIT", () => {
                                                console.log(
                                                    "Aucune donnée à insérer dans prefets",
                                                );
                                                resolve();
                                            });
                                        }
                                    });
                                },
                            );
                        },
                    );
                });
            });
        }

        return readPrefets().then(insertPrefets);
    }

    // Import interior minister from ministre_interieur_list.csv
    function importMinistreInterieur() {
        let ministreRows = 0;
        let ministreBatch = [];

        function readMinistreInterieur() {
            return new Promise((resolve, reject) => {
                if (!fs.existsSync("ministre_interieur_list.csv")) {
                    const error = new Error(
                        "ministre_interieur_list.csv does not exist in the current directory",
                    );
                    console.error(error.message);
                    reject(error);
                    return;
                }

                fs.createReadStream("ministre_interieur_list.csv")
                    .pipe(csv())
                    .on("data", (row) => {
                        const missingFields = [];
                        if (!row["country"]) missingFields.push("country");
                        if (!row["prenom"]) missingFields.push("prenom");
                        if (!row["nom"]) missingFields.push("nom");
                        if (!row["sexe"]) missingFields.push("sexe");

                        if (missingFields.length > 0) {
                            console.warn(
                                `Ligne ignorée dans ministre_interieur_list.csv (champs manquants: ${missingFields.join(", ")}):`,
                                row,
                            );
                            return;
                        }

                        // Validate sexe
                        const sexe = row["sexe"].trim().toUpperCase();
                        if (!["M", "F"].includes(sexe)) {
                            console.warn(`Sexe invalide ignoré: ${sexe}`, row);
                            return;
                        }

                        // Parse dates, allow null if invalid
                        let dateNais = null;
                        let dateMandat = null;
                        if (
                            row["dateNais"] &&
                            /^\d{4}-\d{2}-\d{2}$/.test(row["dateNais"])
                        ) {
                            dateNais = row["dateNais"];
                        }
                        if (
                            row["dateMandat"] &&
                            /^\d{4}-\d{2}-\d{2}$/.test(row["dateMandat"])
                        ) {
                            dateMandat = row["dateMandat"];
                        }

                        // Normalize famille_nuance and nuance_politique
                        const familleNuance = row["famille_nuance"]
                            ? row["famille_nuance"].trim()
                            : null;
                        const nuancePolitique = row["nuance_politique"]
                            ? row["nuance_politique"].trim()
                            : null;

                        ministreRows++;
                        ministreBatch.push([
                            row["country"].trim().toUpperCase(),
                            row["prenom"].trim(),
                            row["nom"].trim(),
                            sexe,
                            dateNais,
                            dateMandat,
                            familleNuance,
                            nuancePolitique,
                        ]);
                    })
                    .on("end", () => {
                        console.log(
                            `Lecture de ministre_interieur_list.csv terminée: ${ministreRows} lignes`,
                        );
                        if (ministreRows === 0) {
                            console.warn(
                                "Avertissement: ministre_interieur_list.csv est vide ou n'a pas de données valides",
                            );
                        }
                        resolve();
                    })
                    .on("error", (err) => {
                        console.error(
                            "Erreur lecture ministre_interieur_list.csv:",
                            err.message,
                        );
                        reject(err);
                    });
            });
        }

        function insertMinistreInterieur() {
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run(
                        `
                        CREATE TABLE IF NOT EXISTS ministre_interieur (
                            country TEXT,
                            prenom TEXT,
                            nom TEXT,
                            sexe TEXT CHECK(sexe IN ('M', 'F')),
                            date_nais TEXT,
                            date_mandat TEXT,
                            famille_nuance TEXT,
                            nuance_politique TEXT,
                            PRIMARY KEY (country, date_mandat)
                        )
                    `,
                        (err) => {
                            if (err) {
                                console.error(
                                    "Erreur création table ministre_interieur:",
                                    err.message,
                                );
                                reject(err);
                                return;
                            }

                            db.run(
                                "CREATE INDEX IF NOT EXISTS idx_ministre_interieur_nom ON ministre_interieur(nom)",
                                (err) => {
                                    if (err) {
                                        console.error(
                                            "Erreur création index ministre_interieur:",
                                            err.message,
                                        );
                                        reject(err);
                                        return;
                                    }

                                    db.run("BEGIN TRANSACTION", (err) => {
                                        if (err) {
                                            console.error(
                                                "Erreur début transaction ministre_interieur:",
                                                err.message,
                                            );
                                            reject(err);
                                            return;
                                        }

                                        if (ministreBatch.length > 0) {
                                            const placeholders = ministreBatch
                                                .map(
                                                    () =>
                                                        "(?, ?, ?, ?, ?, ?, ?, ?)",
                                                )
                                                .join(",");
                                            const flatBatch = [].concat(
                                                ...ministreBatch,
                                            );
                                            db.run(
                                                `INSERT OR IGNORE INTO ministre_interieur (
                                            country, prenom, nom, sexe, date_nais, date_mandat, famille_nuance, nuance_politique
                                        ) VALUES ${placeholders}`,
                                                flatBatch,
                                                (err) => {
                                                    if (err) {
                                                        console.error(
                                                            "Erreur insertion batch ministre_interieur:",
                                                            err.message,
                                                        );
                                                        db.run("ROLLBACK");
                                                        reject(err);
                                                        return;
                                                    }
                                                    db.run("COMMIT", (err) => {
                                                        if (err) {
                                                            console.error(
                                                                "Erreur commit ministre_interieur:",
                                                                err.message,
                                                            );
                                                            db.run("ROLLBACK");
                                                            reject(err);
                                                        } else {
                                                            console.log(
                                                                `Importation de ${ministreRows} lignes dans ministre_interieur terminée`,
                                                            );
                                                            resolve();
                                                        }
                                                    });
                                                },
                                            );
                                        } else {
                                            db.run("COMMIT", () => {
                                                console.log(
                                                    "Aucune donnée à insérer dans ministre_interieur",
                                                );
                                                resolve();
                                            });
                                        }
                                    });
                                },
                            );
                        },
                    );
                });
            });
        }

        return readMinistreInterieur().then(insertMinistreInterieur);
    }

    // Execute imports sequentially
    importMaires()
        .then(importPrefets)
        .then(importMinistreInterieur)
        .then(() => callback(null))
        .catch((err) => {
            console.error("Échec de l'importation des élus:", err.message);
            callback(err);
        });
}

module.exports = { importElus };
