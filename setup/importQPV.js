const BaseImporter = require('./baseImporter');

// Helper functions for parsing different field types
function parseStringField(value) {
  return value ? value.trim() : null;
}

function parseIntField(value) {
  return value && value.trim() && !isNaN(parseInt(value)) ? parseInt(value) : null;
}

function parseFloatField(value) {
  return value && value.trim() && !isNaN(parseFloat(value)) ? parseFloat(value) : null;
}

function normalizeDepartmentCode(code) {
  if (code && /^\d+$/.test(code) && code.length < 2) {
    return code.padStart(2, '0');
  }
  return code;
}

function processQPVRow(row) {
  return [
    parseStringField(row['COG']),
    parseStringField(row['lib_com']),
    parseStringField(row['codeQPV']),
    parseStringField(row['lib_qp']),
    parseIntField(row['insee_reg']),
    parseStringField(row['lib_reg']),
    normalizeDepartmentCode(row['insee_dep']),
    parseStringField(row['lib_dep']),
    parseStringField(row['siren_epci']),
    parseStringField(row['lib_epci']),
    parseIntField(row['popMuniQPV']),
    parseFloatField(row['indiceJeunesse']),
    parseFloatField(row['partPopEt']),
    parseFloatField(row['partPopImmi']),
    parseFloatField(row['partMenImmi']),
    parseFloatField(row['partMenEt']),
    parseFloatField(row['partMen1p']),
    parseFloatField(row['partMen2p']),
    parseFloatField(row['partMen3p']),
    parseFloatField(row['partMen45p']),
    parseFloatField(row['partMen6pp']),
    parseFloatField(row['nombre_menages']),
    parseFloatField(row['nombre_logements_sociaux']),
    parseFloatField(row['taux_logements_sociaux']),
    parseFloatField(row['taux_d_emploi']),
    parseFloatField(row['taux_pauvrete_60%']),
    parseFloatField(row['personnes_couvertes_CAF']),
    parseFloatField(row['allocataires_CAF']),
    parseFloatField(row['RSA_socle'])
  ];
}

function createQPVTable() {
  const columnDefs = this.columns.map(col => {
    let def = `${col.name} ${col.type}`;
    if (col.required) {
      def += ' NOT NULL';
    }
    return def;
  }).join(', ');

  const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs}, PRIMARY KEY (COG, codeQPV))`;

  return new Promise((resolve, reject) => {
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

function importQPV(db, callback) {
  const columns = [
    { name: 'COG', type: 'TEXT', required: true },
    { name: 'lib_com', type: 'TEXT', required: true },
    { name: 'codeQPV', type: 'TEXT', required: true },
    { name: 'lib_qp', type: 'TEXT' },
    { name: 'insee_reg', type: 'INTEGER' },
    { name: 'lib_reg', type: 'TEXT' },
    { name: 'insee_dep', type: 'TEXT' },
    { name: 'lib_dep', type: 'TEXT' },
    { name: 'siren_epci', type: 'TEXT' },
    { name: 'lib_epci', type: 'TEXT' },
    { name: 'popMuniQPV', type: 'INTEGER' },
    { name: 'indiceJeunesse', type: 'REAL' },
    { name: 'partPopEt', type: 'REAL' },
    { name: 'partPopImmi', type: 'REAL' },
    { name: 'partMenImmi', type: 'REAL' },
    { name: 'partMenEt', type: 'REAL' },
    { name: 'partMen1p', type: 'REAL' },
    { name: 'partMen2p', type: 'REAL' },
    { name: 'partMen3p', type: 'REAL' },
    { name: 'partMen45p', type: 'REAL' },
    { name: 'partMen6pp', type: 'REAL' },
    { name: 'nombre_menages', type: 'REAL' },
    { name: 'nombre_logements_sociaux', type: 'REAL' },
    { name: 'taux_logements_sociaux', type: 'REAL' },
    { name: 'taux_d_emploi', type: 'REAL' },
    { name: 'taux_pauvrete_60', type: 'REAL' },
    { name: 'personnes_couvertes_CAF', type: 'REAL' },
    { name: 'allocataires_CAF', type: 'REAL' },
    { name: 'RSA_socle', type: 'REAL' }
  ];

  const requiredFields = ['COG', 'lib_com', 'codeQPV'];

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_qpv_cog ON qpv_data(COG)',
    'CREATE INDEX IF NOT EXISTS idx_qpv_dep ON qpv_data(insee_dep)'
  ];

  const importer = new BaseImporter({
    csvPath: 'setup/inputFiles/analyse_qpv.csv',
    tableName: 'qpv_data',
    columns: columns,
    requiredFields: requiredFields,
    processRow: processQPVRow,
    db: db,
    indexes: indexes,
    createTable: createQPVTable
  });

  importer.import()
    .then(() => callback(null))
    .catch((err) => {
      callback(err);
    });
}

module.exports = { importQPV };
