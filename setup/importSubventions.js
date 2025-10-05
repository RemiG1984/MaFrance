const fs = require('fs');
const csv = require('csv-parser');
const BaseImporter = require('./baseImporter');

function importSubventions(db, callback) {
    // Get all unique subvention field names from CSV files
    function getAllSubventionFields() {
        return new Promise((resolve, reject) => {
            const allFields = new Set();
            const files = [
                { path: 'setup/inputFiles/france_subventions.csv', excludedFields: ['country', 'commune', 'population', 'total_subventions'] },
                { path: 'setup/inputFiles/departement_subventions.csv', excludedFields: ['dept_code', 'commune', 'population', 'total_subventions'] },
                { path: 'setup/inputFiles/commune_subventions.csv', excludedFields: ['COG', 'commune', 'population', 'total_subventions'] }
            ];

            let processedFiles = 0;

            files.forEach(file => {
                if (!fs.existsSync(file.path)) {
                    processedFiles++;
                    if (processedFiles === files.length) resolve(Array.from(allFields));
                    return;
                }

                fs.createReadStream(file.path)
                    .pipe(csv())
                    .on('data', (row) => {
                        Object.keys(row).forEach(key => {
                            if (!file.excludedFields.includes(key)) {
                                allFields.add(key);
                            }
                        });
                    })
                    .on('end', () => {
                        processedFiles++;
                        if (processedFiles === files.length) {
                            resolve(Array.from(allFields));
                        }
                    })
                    .on('error', reject);
            });
        });
    }

    // Execute imports sequentially
    getAllSubventionFields()
        .then(subventionFields => {
            console.log(`Champs de subvention détectés: ${subventionFields.join(', ')}`);

            // Country subventions
            const countryColumns = [{name: 'country', type: 'TEXT', required: true}].concat(subventionFields.map(f => ({name: f, type: 'REAL'})));
            const countryRequiredFields = ['country'];
            const countryProcessRow = function(row) {
                const country = row['country'];
                if (!country) return null;
                const values = [country.trim()];
                subventionFields.forEach(field => {
                    const value = row[field];
                    values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
                });
                return values;
            };
            const countryCreateTable = function() {
                const columnDefs = this.columns.map(col => {
                    let def = `${col.name} ${col.type}`;
                    if (col.required) def += ' NOT NULL';
                    return def;
                }).join(', ');
                const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs}, PRIMARY KEY (country))`;
                return new Promise((resolve, reject) => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error(`Error creating table ${this.tableName}:`, err.message);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };
            const countryImporter = new BaseImporter({
                csvPath: 'setup/inputFiles/france_subventions.csv',
                tableName: 'country_subventions',
                columns: countryColumns,
                requiredFields: countryRequiredFields,
                processRow: countryProcessRow,
                db: db,
                indexes: [],
                createTable: countryCreateTable
            });

            // Department subventions
            const departmentColumns = [{name: 'dep', type: 'TEXT', required: true}].concat(subventionFields.map(f => ({name: f, type: 'REAL'})));
            const departmentRequiredFields = ['dept_code'];
            const departmentProcessRow = function(row) {
                if (!row['dept_code']) return null;
                let dep = row['dept_code'].trim().toUpperCase();
                if (/^\d+$/.test(dep)) {
                    dep = dep.padStart(2, '0');
                }
                if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
                    console.warn(`Code département invalide ignoré: ${dep}`, row);
                    return null;
                }
                const values = [dep];
                subventionFields.forEach(field => {
                    const value = row[field];
                    values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
                });
                return values;
            };
            const departmentCreateTable = function() {
                const columnDefs = this.columns.map(col => {
                    let def = `${col.name} ${col.type}`;
                    if (col.required) def += ' NOT NULL';
                    return def;
                }).join(', ');
                const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs}, PRIMARY KEY (dep))`;
                return new Promise((resolve, reject) => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error(`Error creating table ${this.tableName}:`, err.message);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };
            const departmentImporter = new BaseImporter({
                csvPath: 'setup/inputFiles/departement_subventions.csv',
                tableName: 'department_subventions',
                columns: departmentColumns,
                requiredFields: departmentRequiredFields,
                processRow: departmentProcessRow,
                db: db,
                indexes: [],
                createTable: departmentCreateTable
            });

            // Commune subventions
            const communeColumns = [{name: 'COG', type: 'TEXT', required: true}].concat(subventionFields.map(f => ({name: f, type: 'REAL'})));
            const communeRequiredFields = ['COG'];
            const communeProcessRow = function(row) {
                if (!row['COG']) return null;
                const values = [row['COG'].trim()];
                subventionFields.forEach(field => {
                    const value = row[field];
                    values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
                });
                return values;
            };
            const communeCreateTable = function() {
                const columnDefs = this.columns.map(col => {
                    let def = `${col.name} ${col.type}`;
                    if (col.required) def += ' NOT NULL';
                    return def;
                }).join(', ');
                const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs}, PRIMARY KEY (COG))`;
                return new Promise((resolve, reject) => {
                    this.db.run(sql, (err) => {
                        if (err) {
                            console.error(`Error creating table ${this.tableName}:`, err.message);
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            };
            const communeImporter = new BaseImporter({
                csvPath: 'setup/inputFiles/commune_subventions.csv',
                tableName: 'commune_subventions',
                columns: communeColumns,
                requiredFields: communeRequiredFields,
                processRow: communeProcessRow,
                db: db,
                indexes: [],
                createTable: communeCreateTable
            });

            return countryImporter.import()
                .then(() => departmentImporter.import())
                .then(() => communeImporter.import());
        })
        .then(() => callback(null))
        .catch(err => {
            console.error('Échec de l\'importation des données de subventions:', err.message);
            callback(err);
        });
}

module.exports = { importSubventions };
