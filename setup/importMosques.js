
const BaseImporter = require('./baseImporter');
const { parseNumericField, trimField, normalizeDepartmentCode } = require('./importUtils');

class MosquesImporter extends BaseImporter {
  constructor(db) {
    super({
      csvPath: 'setup/inputFiles/mosques_france_with_cog.csv',
      tableName: 'mosques',
      columns: [
        { name: 'name', type: 'TEXT' },
        { name: 'address', type: 'TEXT' },
        { name: 'latitude', type: 'REAL' },
        { name: 'longitude', type: 'REAL' },
        { name: 'commune', type: 'TEXT' },
        { name: 'departement', type: 'TEXT' },
        { name: 'cog', type: 'TEXT' }
      ],
      db,
      processRow: MosquesImporter.customProcessRow,
      validateRow: MosquesImporter.customValidateRow,
      indexes: [] // No specific indexes needed
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`;

      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create indexes if provided
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
    // Parse coordinates
    const latitude = parseNumericField(row.latitude || row.lat, false);
    const longitude = parseNumericField(row.longitude || row.lng || row.lon, false);

    if (isNaN(latitude) || isNaN(longitude)) {
      return false; // Skip invalid coordinates
    }

    // Filter to metropolitan France only (exclude overseas territories)
    const overseasDepartements = ['971', '972', '973', '974', '976'];
    const departement = normalizeDepartmentCode(row.departement || row.dept || '');

    if (!departement || overseasDepartements.includes(departement)) {
      return false; // Skip overseas territories or invalid departements
    }

    return true;
  }

  static customProcessRow(row) {
    return [
      trimField(row.nom) || 'Mosquée',
      trimField(row.adresse) || '',
      parseNumericField(row.latitude || row.lat),
      parseNumericField(row.longitude || row.lng || row.lon),
      trimField(row.commune) || '',
      normalizeDepartmentCode(row.departement || row.dept) || '',
      trimField(row.cog || row.COG) || ''
    ];
  }
}

function importMosques(db, callback) {
  try {
    const importer = new MosquesImporter(db);
    importer.import().then(() => {
      callback(null);
    }).catch(err => {
      callback(err);
    });
  } catch (err) {
    callback(err);
  }
}

module.exports = { importMosques };
