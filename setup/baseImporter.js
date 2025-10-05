const fs = require('fs');
const csv = require('csv-parser');

/**
 * Base import utility class for CSV imports.
 * Provides common functionality for reading CSV, validating data,
 * creating tables, batch insertion, and orchestrating the import process.
 * Designed to be configurable and reusable across import modules.
 */
class BaseImporter {
    /**
     * Constructor for BaseImporter.
     * @param {Object} options - Configuration options.
     * @param {string} options.csvPath - Path to the CSV file.
     * @param {string} options.tableName - Name of the database table.
     * @param {Array<Object>} options.columns - Array of column definitions.
     *   Each column: { name: string, type: string, required?: boolean, default?: any }
     * @param {Array<string>} options.requiredFields - List of required field names.
     * @param {Function} [options.processRow] - Custom row processing function.
     *   Should return an array of values matching columns order.
     * @param {Function} [options.validateRow] - Custom row validation function.
     * @param {number} [options.batchSize=1000] - Batch size for insertions.
     * @param {Object} options.db - SQLite database instance.
     * @param {Array<string>} [options.indexes] - Array of index creation SQL statements.
     * @param {Function} [options.createTable] - Custom table creation function.
     * @param {string} [options.insertMode='INSERT'] - SQL insert mode ('INSERT' or 'INSERT OR IGNORE').
     * @param {boolean} [options.allowMissingCsv=false] - Whether to allow missing CSV file (resolve with empty data).
     */
    constructor(options) {
        this.csvPath = options.csvPath;
        this.tableName = options.tableName;
        this.columns = options.columns || [];
        this.requiredFields = options.requiredFields || [];
        this.processRow = options.processRow || this.defaultProcessRow.bind(this);
        this.validateRow = options.validateRow || this.defaultValidateRow.bind(this);
        this.batchSize = options.batchSize || 1000;
        this.db = options.db;
        this.indexes = options.indexes || [];
        this.createTable = options.createTable || this.defaultCreateTable.bind(this);
        this.insertMode = options.insertMode || 'INSERT';
        this.allowMissingCsv = options.allowMissingCsv || false;
    }

    /**
     * Default table creation method.
     * Generates CREATE TABLE SQL from columns definition.
     */
    async defaultCreateTable() {
        return new Promise((resolve, reject) => {
            const columnDefs = this.columns.map(col => {
                let def = `${col.name} ${col.type}`;
                if (col.required) def += ' NOT NULL';
                if (col.default !== undefined) def += ` DEFAULT ${col.default}`;
                return def;
            }).join(', ');

            const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs})`;

            this.db.run(sql, (err) => {
                if (err) {
                    console.error(`Error creating table ${this.tableName}:`, err.message);
                    reject(err);
                    return;
                }

                // Create indexes if provided
                if (this.indexes.length > 0) {
                    let indexCount = 0;
                    this.indexes.forEach(indexSql => {
                        this.db.run(indexSql, (err) => {
                            if (err) {
                                console.error(`Error creating index:`, err.message);
                                reject(err);
                                return;
                            }
                            indexCount++;
                            if (indexCount === this.indexes.length) {
                                resolve();
                            }
                        });
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Reads and processes the CSV file.
     * @returns {Promise<Array<Array>>} Array of processed rows (arrays of values).
     */
    async readCSV() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.csvPath)) {
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

            fs.createReadStream(this.csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    if (this.validateRow(row)) {
                        const processed = this.processRow(row);
                        if (processed) {
                            processedRows.push(processed);
                            rowCount++;
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

    /**
     * Default row validation.
     * Checks for required fields.
     * @param {Object} row - CSV row object.
     * @returns {boolean} True if valid.
     */
    defaultValidateRow(row) {
        const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
        if (missingFields.length > 0) {
            console.warn(`Row ignored (missing fields: ${missingFields.join(', ')}):`, row);
            return false;
        }
        return true;
    }

    /**
     * Default row processing.
     * Returns array of values in column order.
     * @param {Object} row - CSV row object.
     * @returns {Array} Array of values.
     */
    defaultProcessRow(row) {
        return this.columns.map(col => {
            const value = row[col.name];
            if (col.type.toUpperCase().includes('INTEGER') || col.type.toUpperCase().includes('REAL')) {
                return value && !isNaN(parseFloat(value)) ? parseFloat(value) : null;
            }
            return value ? value.trim() : null;
        });
    }

    /**
     * Inserts data in batches.
     * @param {Array<Array>} data - Array of rows (each row is an array of values).
     */
    async insertBatch(data) {
        return new Promise((resolve, reject) => {
            if (data.length === 0) {
                resolve();
                return;
            }

            this.db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('Error starting transaction:', err.message);
                    reject(err);
                    return;
                }

                let batchIndex = 0;

                const insertNextBatch = () => {
                    if (batchIndex >= data.length) {
                        this.db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error committing transaction:', err.message);
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                        return;
                    }

                    const batch = data.slice(batchIndex, batchIndex + this.batchSize);
                    const placeholders = batch.map(() => `(${this.columns.map(() => '?').join(', ')})`).join(', ');
                    const flatBatch = [].concat(...batch);

                    const sql = `${this.insertMode} INTO ${this.tableName} (${this.columns.map(col => col.name).join(', ')}) VALUES ${placeholders}`;

                    this.db.run(sql, flatBatch, (err) => {
                        if (err) {
                            console.error('Error inserting batch:', err.message);
                            this.db.run('ROLLBACK', () => reject(err));
                            return;
                        }
                        batchIndex += this.batchSize;
                        insertNextBatch();
                    });
                };

                insertNextBatch();
            });
        });
    }

    /**
     * Orchestrates the full import process.
     */
    async import() {
        try {
            await this.createTable();
            const data = await this.readCSV();
            await this.insertBatch(data);
            console.log(`Import completed for ${this.tableName}: ${data.length} rows inserted`);
        } catch (err) {
            console.error(`Import failed for ${this.tableName}:`, err.message);
            throw err;
        }
    }
}

module.exports = BaseImporter;