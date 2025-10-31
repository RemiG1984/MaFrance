const fs = require('fs');
const csv = require('csv-parser');
const BaseImporter = require('./baseImporter');

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
        if (processedFiles === files.length) {
          resolve(Array.from(allFields));
        }
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

function createSubventionColumns(primaryKeyField, fields) {
  return [{ name: primaryKeyField, type: 'TEXT', required: true }]
    .concat(fields.map(f => ({ name: f, type: 'REAL' })));
}

function createSubventionTableSQL(tableName, columns, primaryKey) {
  const columnDefs = columns.map(col => {
    let def = `${col.name} ${col.type}`;
    if (col.required) {
      def += ' NOT NULL';
    }
    return def;
  }).join(', ');
  return `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs}, PRIMARY KEY (${primaryKey}))`;
}

function createSubventionTableCreator(tableName, columns, primaryKey) {
  return function() {
    const sql = createSubventionTableSQL(tableName, columns, primaryKey);
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };
}

function createCountrySubventionImporter(db, fields) {
  const columns = createSubventionColumns('country', fields);
  const requiredFields = ['country'];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/france_subventions.csv',
    tableName: 'country_subventions',
    columns,
    requiredFields,
    processRow: function(row) {
      const country = row['country'];
      if (!country) {
        return null;
      }
      const values = [country.trim()];
      fields.forEach(field => {
        const value = row[field];
        values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
      });
      return values;
    },
    db,
    indexes: [],
    createTable: createSubventionTableCreator('country_subventions', columns, 'country')
  });
}

function createDepartmentSubventionImporter(db, fields) {
  const columns = createSubventionColumns('dep', fields);
  const requiredFields = ['dept_code'];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/departement_subventions.csv',
    tableName: 'department_subventions',
    columns,
    requiredFields,
    processRow: function(row) {
      if (!row['dept_code']) {
        return null;
      }
      let dep = row['dept_code'].trim().toUpperCase();
      if (/^\d+$/.test(dep)) {
        dep = dep.padStart(2, '0');
      }
      if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
        return null;
      }
      const values = [dep];
      fields.forEach(field => {
        const value = row[field];
        values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
      });
      return values;
    },
    db,
    indexes: [],
    createTable: createSubventionTableCreator('department_subventions', columns, 'dep')
  });
}

function createCommuneSubventionImporter(db, fields) {
  const columns = createSubventionColumns('COG', fields);
  const requiredFields = ['COG'];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/commune_subventions.csv',
    tableName: 'commune_subventions',
    columns,
    requiredFields,
    processRow: function(row) {
      if (!row['COG']) {
        return null;
      }
      const values = [row['COG'].trim()];
      fields.forEach(field => {
        const value = row[field];
        values.push(value !== undefined && value !== '' && !isNaN(parseFloat(value)) ? parseFloat(value) : null);
      });
      return values;
    },
    db,
    indexes: [],
    createTable: createSubventionTableCreator('commune_subventions', columns, 'COG')
  });
}

function importSubventions(db, callback) {
  getAllSubventionFields()
    .then(subventionFields => {
      const countryImporter = createCountrySubventionImporter(db, subventionFields);
      const departmentImporter = createDepartmentSubventionImporter(db, subventionFields);
      const communeImporter = createCommuneSubventionImporter(db, subventionFields);

      return countryImporter.import()
        .then(() => departmentImporter.import())
        .then(() => communeImporter.import());
    })
    .then(() => callback(null))
    .catch(err => {
      callback(err);
    });
}

module.exports = { importSubventions };