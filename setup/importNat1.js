
const BaseImporter = require('./baseImporter');
const fs = require("fs");
const csv = require("csv-parser");

function importNat1(db, callback) {
    let totalRows = 0;
    let countryBatch = [];
    let departmentBatch = [];
    let communeBatch = [];
    let skippedRows = 0;
    let ignoredLines = [];

    function readNat1Data() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync("setup/inputFiles/insee_NAT1_detailed_inferred.csv")) {
                console.error(
                    "Erreur: insee_NAT1_detailed_inferred.csv n'existe pas dans le répertoire setup",
                );
                resolve(); // Continue with empty data
                return;
            }

            fs.createReadStream("setup/inputFiles/insee_NAT1_detailed_inferred.csv")
                .pipe(csv())
                .on("data", (row) => {
                    const missingFields = [];
                    if (!row["Type"]) missingFields.push("Type");
                    if (!row["Code"]) missingFields.push("Code");

                    if (missingFields.length > 0) {
                        const reason = `Champs manquants: ${missingFields.join(", ")}`;
                        ignoredLines.push({
                            lineNumber: totalRows + skippedRows + 1,
                            reason: reason,
                            data: { Type: row["Type"] || "N/A", Code: row["Code"] || "N/A" }
                        });
                        skippedRows++;
                        return;
                    }

                    const type = row["Type"].trim();
                    const code = row["Code"].trim();

                    // Skip dept- entries
                    if (type === "dept-") {
                        ignoredLines.push({
                            lineNumber: totalRows + skippedRows + 1,
                            reason: "Type 'dept-' ignoré (non supporté)",
                            data: { Type: type, Code: code }
                        });
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
                        // For country level, use 'france entiere' or 'france metro' as code from the Code field
                        const countryRow = [code, type];
                        Object.keys(numericFields).forEach(key => {
                            countryRow.push(numericFields[key]);
                        });
                        countryBatch.push(countryRow);
                    } else if (type === "dept") {
                        // For department level, use departement code
                        let departement = code;
                        if (/^\d+$/.test(departement)) {
                            departement = departement.padStart(2, '0');
                        }
                        const deptRow = [departement, type];
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

                    // Report ignored lines
                    if (ignoredLines.length > 0) {
                        console.log("\n📋 RAPPORT DES LIGNES IGNORÉES:");
                        console.log("=" .repeat(50));

                        // Group by reason
                        const groupedByReason = ignoredLines.reduce((acc, line) => {
                            if (!acc[line.reason]) {
                                acc[line.reason] = [];
                            }
                            acc[line.reason].push(line);
                            return acc;
                        }, {});

                        Object.keys(groupedByReason).forEach(reason => {
                            const lines = groupedByReason[reason];
                            console.log(`\n🔸 ${reason} (${lines.length} lignes):`);

                            // Show first 5 examples for each reason
                            const examples = lines.slice(0, 5);
                            examples.forEach(line => {
                                console.log(`   Ligne ${line.lineNumber}: Type="${line.data.Type}", Code="${line.data.Code}"`);
                            });

                            if (lines.length > 5) {
                                console.log(`   ... et ${lines.length - 5} autres lignes similaires`);
                            }
                        });

                        console.log("\n" + "=" .repeat(50));
                        console.log(`Total des lignes ignorées: ${ignoredLines.length}`);
                    }

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
            if (!fs.existsSync("setup/inputFiles/insee_NAT1_detailed_inferred.csv")) {
                resolve([]);
                return;
            }

            let fieldNames = [];
            fs.createReadStream("setup/inputFiles/insee_NAT1_detailed_inferred.csv")
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


    function createColumns(fieldNames) {
        const sanitizedFieldNames = fieldNames.map(field => sanitizeColumnName(field));
    
        // Apply uniqueness logic
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
    
        return [
            { name: 'Code', type: 'TEXT', required: true },
            { name: 'Type', type: 'TEXT' },
            ...uniqueFieldNames.map(name => ({ name, type: 'REAL' }))
        ];
    }
    
    function insertCountryNat1(db, fieldNames, countryBatch) {
        return new Promise((resolve, reject) => {
            if (countryBatch.length === 0) {
                resolve();
                return;
            }
    
            const columns = createColumns(fieldNames);
            const importer = new BaseImporter({
                tableName: 'country_nat1',
                columns,
                db,
                indexes: ['CREATE INDEX IF NOT EXISTS idx_country_nat1 ON country_nat1(Code)'],
                insertMode: 'INSERT OR IGNORE'
            });
    
            importer.createTable().then(() => {
                importer.insertBatch(countryBatch).then(() => {
                    console.log(`Importation de ${countryBatch.length} lignes dans country_nat1 terminée`);
                    resolve();
                }).catch(reject);
            }).catch(reject);
        });
    }
    
    function insertDepartmentNat1(db, fieldNames, departmentBatch) {
        return new Promise((resolve, reject) => {
            if (departmentBatch.length === 0) {
                resolve();
                return;
            }
    
            const columns = createColumns(fieldNames);
            const importer = new BaseImporter({
                tableName: 'department_nat1',
                columns,
                db,
                indexes: ['CREATE INDEX IF NOT EXISTS idx_department_nat1 ON department_nat1(Code)'],
                insertMode: 'INSERT OR IGNORE'
            });
    
            importer.createTable().then(() => {
                importer.insertBatch(departmentBatch).then(() => {
                    console.log(`Importation de ${departmentBatch.length} lignes dans department_nat1 terminée`);
                    resolve();
                }).catch(reject);
            }).catch(reject);
        });
    }
    
    function insertCommuneNat1(db, fieldNames, communeBatch) {
        return new Promise((resolve, reject) => {
            if (communeBatch.length === 0) {
                resolve();
                return;
            }
    
            const columns = createColumns(fieldNames);
            const importer = new BaseImporter({
                tableName: 'commune_nat1',
                columns,
                db,
                indexes: ['CREATE INDEX IF NOT EXISTS idx_commune_nat1 ON commune_nat1(Code)'],
                insertMode: 'INSERT OR IGNORE'
            });
    
            importer.createTable().then(() => {
                importer.insertBatch(communeBatch).then(() => {
                    console.log(`Importation de ${communeBatch.length} lignes dans commune_nat1 terminée`);
                    resolve();
                }).catch(reject);
            }).catch(reject);
        });
    }

    // Execute import process
    Promise.all([readNat1Data(), getFieldNames()])
        .then(([_, fieldNames]) => {
            return insertCountryNat1(db, fieldNames, countryBatch)
                .then(() => insertDepartmentNat1(db, fieldNames, departmentBatch))
                .then(() => insertCommuneNat1(db, fieldNames, communeBatch));
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