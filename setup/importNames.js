const BaseImporter = require('./baseImporter');

function importNames(db, callback) {
    // Common percentage columns
    const pctColumns = [
        { name: 'musulman_pct', type: 'REAL' },
        { name: 'africain_pct', type: 'REAL' },
        { name: 'asiatique_pct', type: 'REAL' },
        { name: 'traditionnel_pct', type: 'REAL' },
        { name: 'moderne_pct', type: 'REAL' },
        { name: 'invente_pct', type: 'REAL' },
        { name: 'europeen_pct', type: 'REAL' }
    ];

    // BaseImporter for country_names
    const countryImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/analyse_prenom_france.csv',
        tableName: 'country_names',
        db: db,
        columns: [
            { name: 'country', type: 'TEXT', required: true },
            { name: 'annais', type: 'TEXT', required: true },
            ...pctColumns
        ],
        requiredFields: ['country', 'annais'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_country_names ON country_names(country, annais)'],
        insertMode: 'INSERT OR IGNORE',
        allowMissingCsv: true,
        processRow: function(row) {
            return [
                row['country'],
                row['annais'],
                parseFloat(row['Musulman_pct']) || 0,
                parseFloat(row['Africain_pct']) || 0,
                parseFloat(row['Asiatique_pct']) || 0,
                parseFloat(row['Traditionnel_pct']) || 0,
                parseFloat(row['Moderne_pct']) || 0,
                parseFloat(row['Inventé_pct']) || 0,
                parseFloat(row['Européen_pct']) || 0
            ];
        }
    });

    // BaseImporter for department_names with Corsica handling
    const departmentImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/analyse_prenom_departement.csv',
        tableName: 'department_names',
        db: db,
        columns: [
            { name: 'dpt', type: 'TEXT', required: true },
            { name: 'annais', type: 'TEXT', required: true },
            ...pctColumns
        ],
        requiredFields: ['dpt', 'annais'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_department_names ON department_names(dpt, annais)'],
        insertMode: 'INSERT OR IGNORE',
        allowMissingCsv: true,
        validateRow: function(row) {
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                console.warn(`Row ignored (missing fields: ${missingFields.join(', ')}):`, row);
                return false;
            }

            // Normalize and validate dpt
            let dpt = row['dpt'].trim().toUpperCase();
            if (/^\d+$/.test(dpt)) {
                dpt = dpt.padStart(2, '0');
            }
            if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dpt)) {
                console.warn(`Invalid department code ignored: ${dpt}`, row);
                return false;
            }

            return true;
        },
        processRow: function(row) {
            // Normalize dpt
            let dpt = row['dpt'].trim().toUpperCase();
            if (/^\d+$/.test(dpt)) {
                dpt = dpt.padStart(2, '0');
            }

            return [
                dpt,
                row['annais'],
                parseFloat(row['Musulman_pct']) || 0,
                parseFloat(row['Africain_pct']) || 0,
                parseFloat(row['Asiatique_pct']) || 0,
                parseFloat(row['Traditionnel_pct']) || 0,
                parseFloat(row['Moderne_pct']) || 0,
                parseFloat(row['Inventé_pct']) || 0,
                parseFloat(row['Européen_pct']) || 0
            ];
        },
        // Override readCSV to handle Corsica
        readCSV: async function() {
            return new Promise((resolve, reject) => {
                if (!require('fs').existsSync(this.csvPath)) {
                    if (this.allowMissingCsv) {
                        console.log(`Warning: ${this.csvPath} does not exist, proceeding with empty data`);
                        resolve([]);
                        return;
                    } else {
                        reject(new Error(`${this.csvPath} does not exist`));
                        return;
                    }
                }

                const processedRows = [];
                let rowCount = 0;

                require('fs').createReadStream(this.csvPath)
                    .pipe(require('csv-parser')())
                    .on('data', (row) => {
                        if (this.validateRow(row)) {
                            const processed = this.processRow(row);
                            if (processed) {
                                processedRows.push(processed);
                                rowCount++;

                                // Handle Corse (20) by adding entries for 2A and 2B
                                if (processed[0] === '20') {
                                    const [dpt, annais, ...pcts] = processed;
                                    processedRows.push(['2A', annais, ...pcts]);
                                    processedRows.push(['2B', annais, ...pcts]);
                                    console.log(`Added Corse (20) data for 2A and 2B:`, { annais, musulman_pct: pcts[0] });
                                }
                            }
                        }
                    })
                    .on('end', () => {
                        console.log(`Processed ${rowCount} rows from ${this.csvPath}`);
                        resolve(processedRows);
                    })
                    .on('error', (err) => {
                        console.error(`Error reading CSV ${this.csvPath}:`, err.message);
                        reject(err);
                    });
            });
        }
    });

    // BaseImporter for commune_names
    const communeImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/analyse_prenom_commune.csv',
        tableName: 'commune_names',
        db: db,
        columns: [
            { name: 'COG', type: 'TEXT', required: true },
            { name: 'commune', type: 'TEXT', required: true },
            { name: 'annais', type: 'TEXT', required: true },
            ...pctColumns
        ],
        requiredFields: ['COG', 'commune', 'annais'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_commune_names ON commune_names(COG, annais)'],
        insertMode: 'INSERT OR IGNORE',
        allowMissingCsv: true,
        processRow: function(row) {
            return [
                row['COG'],
                row['commune'],
                row['annais'],
                parseFloat(row['Musulman_pct']) || 0,
                parseFloat(row['Africain_pct']) || 0,
                parseFloat(row['Asiatique_pct']) || 0,
                parseFloat(row['Traditionnel_pct']) || 0,
                parseFloat(row['Moderne_pct']) || 0,
                parseFloat(row['Inventé_pct']) || 0,
                parseFloat(row['Européen_pct']) || 0
            ];
        }
    });

    // Execute imports sequentially
    countryImporter.import()
        .then(() => departmentImporter.import())
        .then(() => communeImporter.import())
        .then(() => callback(null))
        .catch((err) => {
            console.error('Failed to import names:', err.message);
            callback(err);
        });
}

module.exports = { importNames };
