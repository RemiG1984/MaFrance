const BaseImporter = require('./baseImporter');

class MigrantsImporter extends BaseImporter {
  constructor(db) {
    super({
      csvPath: 'setup/inputFiles/centres_migrants.csv',
      tableName: 'migrant_centers',
      columns: [
        { name: 'COG', type: 'TEXT', required: true },
        { name: 'departement', type: 'TEXT', required: true },
        { name: 'type', type: 'TEXT' },
        { name: 'gestionnaire', type: 'TEXT' },
        { name: 'adresse', type: 'TEXT' },
        { name: 'places', type: 'INTEGER' },
        { name: 'latitude', type: 'REAL' },
        { name: 'longitude', type: 'REAL' }
      ],
      requiredFields: ['COG', 'departement'],
      db: db,
      indexes: [
        'CREATE INDEX IF NOT EXISTS idx_migrant_centers_cog ON migrant_centers(COG)',
        'CREATE INDEX IF NOT EXISTS idx_migrant_centers_dept ON migrant_centers(departement)',
        'CREATE INDEX IF NOT EXISTS idx_migrant_centers_places ON migrant_centers(places)'
      ],
      processRow: MigrantsImporter.customProcessRow,
      validateRow: MigrantsImporter.customValidateRow,
      insertMode: 'INSERT OR IGNORE'
    });
  }

  async defaultCreateTable() {
    return new Promise((resolve, reject) => {
      const columnDefs = this.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (col.required) {
          def += ' NOT NULL';
        }
        return def;
      }).join(', ');

      const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ${columnDefs},
                UNIQUE(COG, type, gestionnaire, adresse, places)
            )`;

      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create indexes
        if (this.indexes.length > 0) {
          let indexCount = 0;
          this.indexes.forEach(indexSql => {
            this.db.run(indexSql, (indexErr) => {
              if (indexErr) {
                reject(indexErr);
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

  static customValidateRow(row) {
    const missingFields = ['COG', 'departement'].filter(field => !row[field] || row[field].trim() === '');
    if (missingFields.length > 0) {
      return false;
    }

    // Normalize and validate department code
    let departement = row['departement'].trim().toUpperCase();
    if (/^\d+$/.test(departement)) {
      departement = departement.padStart(2, '0');
    }
    if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)) {
      return false;
    }

    return true;
  }

  static customProcessRow(row) {
    // Normalize department code
    let departement = row['departement'].trim().toUpperCase();
    if (/^\d+$/.test(departement)) {
      departement = departement.padStart(2, '0');
    }

    // Parse numeric fields, allow null if invalid
    const latitude = row['latitude'] && !isNaN(parseFloat(row['latitude'])) ? parseFloat(row['latitude']) : null;
    const longitude = row['longitude'] && !isNaN(parseFloat(row['longitude'])) ? parseFloat(row['longitude']) : null;

    // Handle optional text fields
    const type = row['type'] ? row['type'].trim() : null;
    const gestionnaire = row['gestionnaire'] ? row['gestionnaire'].trim() : null;
    const adresse = row['adresse'] ? row['adresse'].trim() : null;
    const places = row['places'] && !isNaN(parseInt(row['places'])) ? parseInt(row['places']) : null;

    return [
      row['COG'],
      departement,
      type,
      gestionnaire,
      adresse,
      places,
      latitude,
      longitude
    ];
  }

  async import() {
    await this.createTable();
    const data = await this.readCSV();
    // Sort by places descending, then by departement, COG, gestionnaire
    data.sort((a, b) => {
      const placesA = a[5] || 0; // places at index 5
      const placesB = b[5] || 0;
      if (placesB !== placesA) {
        return placesB - placesA; // descending order
      }
      if (a[1] !== b[1]) {
        return a[1].localeCompare(b[1]); // departement
      }
      if (a[0] !== b[0]) {
        return a[0].localeCompare(b[0]); // COG
      }
      return (a[3] || '').localeCompare(b[3] || ''); // gestionnaire
    });
    await this.insertBatch(data);
  }
}

function importMigrants(db, callback) {
  try {
    const importer = new MigrantsImporter(db);
    importer.import().then(() => callback(null)).catch(err => {
      callback(err);
    });
  } catch (err) {
    callback(err);
  }
}

module.exports = { importMigrants };