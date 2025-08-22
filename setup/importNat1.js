
const fs = require("fs");
const csv = require("csv-parser");

function importNat1(db, callback) {
    const batchSize = 1000;

    let totalRows = 0;
    let countryBatch = [];
    let departmentBatch = [];
    let communeBatch = [];
    let skippedRows = 0;

    function readNat1Data() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync("setup/insee_NAT1_detailed_inferred.csv")) {
                console.error(
                    "Erreur: insee_NAT1_detailed_inferred.csv n'existe pas dans le répertoire setup",
                );
                resolve(); // Continue with empty data
                return;
            }

            fs.createReadStream("setup/insee_NAT1_detailed_inferred.csv")
                .pipe(csv())
                .on("data", (row) => {
                    const missingFields = [];
                    if (!row["Type"]) missingFields.push("Type");
                    if (!row["Code"]) missingFields.push("Code");

                    if (missingFields.length > 0) {
                        console.warn(
                            `Ligne ignorée dans insee_NAT1_detailed_inferred.csv (champs manquants: ${missingFields.join(", ")}):`,
                            row,
                        );
                        skippedRows++;
                        return;
                    }

                    const type = row["Type"].trim();
                    const code = row["Code"].trim();

                    // Skip dept- entries
                    if (type === "dept-") {
                        skippedRows++;
                        return;
                    }

                    // Extract numeric fields, defaulting to 0 if missing or invalid
                    const numericFields = {};
                    Object.keys(row).forEach(key => {
                        if (key !== "Type" && key !== "Code") {
                            const value = parseFloat(row[key]);
                            numericFields[key] = isNaN(value) ? 0 : value;
                        }
                    });

                    totalRows++;

                    // Route data based on Type
                    if (type === "country") {
                        // For country level, use 'france' as code
                        const countryRow = ["france", type];
                        Object.keys(numericFields).forEach(key => {
                            countryRow.push(numericFields[key]);
                        });
                        countryBatch.push(countryRow);
                    } else if (type === "dept") {
                        // For department level, use departement code
                        const deptRow = [code, type];
                        Object.keys(numericFields).forEach(key => {
                            deptRow.push(numericFields[key]);
                        });
                        departmentBatch.push(deptRow);
                    } else if (type === "com" || type === "com-") {
                        // For commune level, use COG code
                        const communeRow = [code, type];
                        Object.keys(numericFields).forEach(key => {
                            communeRow.push(numericFields[key]);
                        });
                        communeBatch.push(communeRow);
                    }
                })
                .on("end", () => {
                    console.log(
                        `Lecture de insee_NAT1_detailed_inferred.csv terminée: ${totalRows} lignes traitées, ${skippedRows} lignes ignorées`,
                    );
                    console.log(`Répartition: ${countryBatch.length} country, ${departmentBatch.length} dept, ${communeBatch.length} commune`);
                    resolve();
                })
                .on("error", (err) => {
                    console.error(
                        "Erreur lecture insee_NAT1_detailed_inferred.csv:",
                        err.message,
                    );
                    reject(err);
                });
        });
    }

    function getFieldNames() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync("setup/insee_NAT1_detailed_inferred.csv")) {
                resolve([]);
                return;
            }

            let fieldNames = [];
            fs.createReadStream("setup/insee_NAT1_detailed_inferred.csv")
                .pipe(csv())
                .on("headers", (headers) => {
                    // Filter out Type and Code to get only data fields
                    fieldNames = headers.filter(h => h !== "Type" && h !== "Code");
                })
                .on("data", () => {
                    // We only need the headers, so we can stop after first row
                })
                .on("end", () => {
                    resolve(fieldNames);
                })
                .on("error", (err) => {
                    reject(err);
                });
        });
    }

    function sanitizeColumnName(columnName) {
        // Replace spaces and special characters with underscores
        // Remove accents and special characters, keep only alphanumeric and underscores
        return columnName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
            .replace(/[^a-zA-Z0-9_]/g, "_")   // Replace non-alphanumeric with underscores
            .replace(/_{2,}/g, "_")           // Replace multiple underscores with single
            .replace(/^_+|_+$/g, "");        // Remove leading/trailing underscores
    }

    function createTableSchema(fieldNames) {
        const baseFields = "Code TEXT PRIMARY KEY, Type TEXT";
        const sanitizedFieldNames = fieldNames.map(field => sanitizeColumnName(field));
        
        // Check for duplicates after sanitization and make them unique
        const uniqueFieldNames = [];
        const nameCount = {};
        
        sanitizedFieldNames.forEach(name => {
            if (nameCount[name]) {
                nameCount[name]++;
                uniqueFieldNames.push(`${name}_${nameCount[name]}`);
            } else {
                nameCount[name] = 1;
                uniqueFieldNames.push(name);
            }
        });
        
        const dataFields = uniqueFieldNames.map(field => `${field} REAL`).join(", ");
        return `${baseFields}, ${dataFields}`;
    }

    function createInsertQuery(tableName, fieldNames) {
        const sanitizedFieldNames = fieldNames.map(field => sanitizeColumnName(field));
        
        // Apply same uniqueness logic as in createTableSchema
        const uniqueFieldNames = [];
        const nameCount = {};
        
        sanitizedFieldNames.forEach(name => {
            if (nameCount[name]) {
                nameCount[name]++;
                uniqueFieldNames.push(`${name}_${nameCount[name]}`);
            } else {
                nameCount[name] = 1;
                uniqueFieldNames.push(name);
            }
        });
        
        const allFields = ["Code", "Type", ...uniqueFieldNames];
        const placeholders = allFields.map(() => "?").join(", ");
        return `INSERT OR IGNORE INTO ${tableName} (${allFields.join(", ")}) VALUES (${placeholders})`;
    }

    function insertCountryNat1(fieldNames) {
        return new Promise((resolve, reject) => {
            if (countryBatch.length === 0) {
                resolve();
                return;
            }

            db.serialize(() => {
                const schema = createTableSchema(fieldNames);
                db.run(
                    `CREATE TABLE IF NOT EXISTS country_nat1 (${schema})`,
                    (err) => {
                        if (err) {
                            console.error("Erreur création table country_nat1:", err.message);
                            reject(err);
                            return;
                        }

                        db.run(
                            "CREATE INDEX IF NOT EXISTS idx_country_nat1 ON country_nat1(Code)",
                            (err) => {
                                if (err) {
                                    console.error("Erreur création index country_nat1:", err.message);
                                    reject(err);
                                    return;
                                }

                                const insertQuery = createInsertQuery("country_nat1", fieldNames);
                                
                                db.run("BEGIN TRANSACTION", (err) => {
                                    if (err) {
                                        console.error("Erreur début transaction country_nat1:", err.message);
                                        reject(err);
                                        return;
                                    }

                                    countryBatch.forEach(row => {
                                        db.run(insertQuery, row, (err) => {
                                            if (err) {
                                                console.error("Erreur insertion country_nat1:", err.message);
                                            }
                                        });
                                    });

                                    db.run("COMMIT", (err) => {
                                        if (err) {
                                            console.error("Erreur commit country_nat1:", err.message);
                                            db.run("ROLLBACK");
                                            reject(err);
                                        } else {
                                            console.log(`Importation de ${countryBatch.length} lignes dans country_nat1 terminée`);
                                            resolve();
                                        }
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    function insertDepartmentNat1(fieldNames) {
        return new Promise((resolve, reject) => {
            if (departmentBatch.length === 0) {
                resolve();
                return;
            }

            db.serialize(() => {
                const schema = createTableSchema(fieldNames);
                db.run(
                    `CREATE TABLE IF NOT EXISTS department_nat1 (${schema})`,
                    (err) => {
                        if (err) {
                            console.error("Erreur création table department_nat1:", err.message);
                            reject(err);
                            return;
                        }

                        db.run(
                            "CREATE INDEX IF NOT EXISTS idx_department_nat1 ON department_nat1(Code)",
                            (err) => {
                                if (err) {
                                    console.error("Erreur création index department_nat1:", err.message);
                                    reject(err);
                                    return;
                                }

                                const insertQuery = createInsertQuery("department_nat1", fieldNames);
                                
                                db.run("BEGIN TRANSACTION", (err) => {
                                    if (err) {
                                        console.error("Erreur début transaction department_nat1:", err.message);
                                        reject(err);
                                        return;
                                    }

                                    for (let i = 0; i < departmentBatch.length; i += batchSize) {
                                        const batch = departmentBatch.slice(i, i + batchSize);
                                        batch.forEach(row => {
                                            db.run(insertQuery, row, (err) => {
                                                if (err) {
                                                    console.error("Erreur insertion department_nat1:", err.message);
                                                }
                                            });
                                        });
                                    }

                                    db.run("COMMIT", (err) => {
                                        if (err) {
                                            console.error("Erreur commit department_nat1:", err.message);
                                            db.run("ROLLBACK");
                                            reject(err);
                                        } else {
                                            console.log(`Importation de ${departmentBatch.length} lignes dans department_nat1 terminée`);
                                            resolve();
                                        }
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    function insertCommuneNat1(fieldNames) {
        return new Promise((resolve, reject) => {
            if (communeBatch.length === 0) {
                resolve();
                return;
            }

            db.serialize(() => {
                const schema = createTableSchema(fieldNames);
                db.run(
                    `CREATE TABLE IF NOT EXISTS commune_nat1 (${schema})`,
                    (err) => {
                        if (err) {
                            console.error("Erreur création table commune_nat1:", err.message);
                            reject(err);
                            return;
                        }

                        db.run(
                            "CREATE INDEX IF NOT EXISTS idx_commune_nat1 ON commune_nat1(Code)",
                            (err) => {
                                if (err) {
                                    console.error("Erreur création index commune_nat1:", err.message);
                                    reject(err);
                                    return;
                                }

                                const insertQuery = createInsertQuery("commune_nat1", fieldNames);
                                
                                db.run("BEGIN TRANSACTION", (err) => {
                                    if (err) {
                                        console.error("Erreur début transaction commune_nat1:", err.message);
                                        reject(err);
                                        return;
                                    }

                                    for (let i = 0; i < communeBatch.length; i += batchSize) {
                                        const batch = communeBatch.slice(i, i + batchSize);
                                        batch.forEach(row => {
                                            db.run(insertQuery, row, (err) => {
                                                if (err) {
                                                    console.error("Erreur insertion commune_nat1:", err.message);
                                                }
                                            });
                                        });
                                    }

                                    db.run("COMMIT", (err) => {
                                        if (err) {
                                            console.error("Erreur commit commune_nat1:", err.message);
                                            db.run("ROLLBACK");
                                            reject(err);
                                        } else {
                                            console.log(`Importation de ${communeBatch.length} lignes dans commune_nat1 terminée`);
                                            resolve();
                                        }
                                    });
                                });
                            }
                        );
                    }
                );
            });
        });
    }

    // Execute import process
    Promise.all([readNat1Data(), getFieldNames()])
        .then(([_, fieldNames]) => {
            return insertCountryNat1(fieldNames)
                .then(() => insertDepartmentNat1(fieldNames))
                .then(() => insertCommuneNat1(fieldNames));
        })
        .then(() => {
            console.log("✓ Importation NAT1 terminée");
            callback(null);
        })
        .catch((err) => {
            console.error("Échec de l'importation NAT1:", err.message);
            callback(err);
        });
}

module.exports = { importNat1 };
