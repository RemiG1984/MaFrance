const BaseImporter = require('./baseImporter');

// Common crime fields for country and department
const crimeFields = [
  'Homicides_p100k',
  'Tentatives_d_homicides_p100k',
  'Coups_et_blessures_volontaires_p1k',
  'Coups_et_blessures_volontaires_intrafamiliaux_p1k',
  'Autres_coups_et_blessures_volontaires_p1k',
  'Violences_sexuelles_p1k',
  'Vols_avec_armes_p1k',
  'Vols_violents_sans_arme_p1k',
  'Vols_sans_violence_contre_des_personnes_p1k',
  'Cambriolages_de_logement_p1k',
  'Vols_de_véhicules_p1k',
  'Vols_dans_les_véhicules_p1k',
  'Vols_d_accessoires_sur_véhicules_p1k',
  'Destructions_et_dégradations_volontaires_p1k',
  'Usage_de_stupéfiants_p1k',
  'Usage_de_stupéfiants_AFD_p1k',
  'Trafic_de_stupéfiants_p1k',
  'Escroqueries_p1k'
];

// Crime fields for commune (subset)
const communeCrimeFields = [
  'Coups_et_blessures_volontaires_p1k',
  'Coups_et_blessures_volontaires_intrafamiliaux_p1k',
  'Autres_coups_et_blessures_volontaires_p1k',
  'Violences_sexuelles_p1k',
  'Vols_avec_armes_p1k',
  'Vols_violents_sans_arme_p1k',
  'Vols_sans_violence_contre_des_personnes_p1k',
  'Cambriolages_de_logement_p1k',
  'Vols_de_véhicules_p1k',
  'Vols_dans_les_véhicules_p1k',
  'Vols_d_accessoires_sur_véhicules_p1k',
  'Destructions_et_dégradations_volontaires_p1k',
  'Usage_de_stupéfiants_p1k',
  'Usage_de_stupéfiants_AFD_p1k',
  'Trafic_de_stupéfiants_p1k',
  'Escroqueries_p1k'
];

function createCrimeColumns(fields) {
  return fields.map(field => ({ name: field.toLowerCase().replace(/_/g, '_'), type: 'REAL' }));
}

function createCrimeTableSQL(tableName, fields, primaryKeyFields) {
  const fieldDefinitions = fields.map(field =>
    `${field.toLowerCase().replace(/_/g, '_')} REAL`
  ).join(',\n                        ');

  return `
    CREATE TABLE IF NOT EXISTS ${tableName} (
        ${primaryKeyFields.join(' TEXT,\n        ')} TEXT,
        ${fieldDefinitions},
        PRIMARY KEY (${primaryKeyFields.join(', ')})
    )
  `;
}

function validateCrimeRow(row, requiredFields, fields) {
  // Check required fields
  const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate crime fields
  const invalidFields = fields.filter(field => {
    const value = row[field];
    return value === undefined || value === '' || isNaN(parseFloat(value));
  });
  if (invalidFields.length > 0) {
    throw new Error(`Invalid or missing crime data: ${invalidFields.join(', ')}`);
  }

  return true;
}

function processCrimeRow(row, fields, primaryKeyFields) {
  return [
    ...primaryKeyFields.map(field => row[field].trim()),
    ...fields.map(field => parseFloat(row[field]))
  ];
}

function normalizeDepartmentCode(dep) {
  let normalized = dep.trim().toUpperCase();
  if (/^\d+$/.test(normalized)) {
    normalized = normalized.padStart(2, '0');
  }
  if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(normalized)) {
    throw new Error(`Invalid department code: ${normalized}`);
  }
  return normalized;
}

function createCountryCrimeImporter(db) {
  const columns = [
    { name: 'country', type: 'TEXT', required: true },
    { name: 'annee', type: 'TEXT', required: true },
    ...createCrimeColumns(crimeFields)
  ];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/crime_data_france.csv',
    tableName: 'country_crime',
    db: db,
    columns,
    requiredFields: ['country', 'annee'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_country_crime ON country_crime(country, annee)'],
    insertMode: 'INSERT OR IGNORE',
    createTable: function() {
      return new Promise((resolve, reject) => {
        const sql = createCrimeTableSQL('country_crime', crimeFields, ['country', 'annee']);
        this.db.run(sql, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
    validateRow: function(row) {
      return validateCrimeRow(row, this.requiredFields, crimeFields);
    },
    processRow: function(row) {
      return processCrimeRow(row, crimeFields, ['country', 'annee']);
    }
  });
}

function createDepartmentCrimeImporter(db) {
  const columns = [
    { name: 'dep', type: 'TEXT', required: true },
    { name: 'annee', type: 'TEXT', required: true },
    ...createCrimeColumns(crimeFields)
  ];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/crime_data_departement.csv',
    tableName: 'department_crime',
    db: db,
    columns,
    requiredFields: ['DEP', 'annee'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_department_crime ON department_crime(dep, annee)'],
    insertMode: 'INSERT OR IGNORE',
    createTable: function() {
      return new Promise((resolve, reject) => {
        const sql = createCrimeTableSQL('department_crime', crimeFields, ['dep', 'annee']);
        this.db.run(sql, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
    validateRow: function(row) {
      validateCrimeRow(row, this.requiredFields, crimeFields);
      normalizeDepartmentCode(row['DEP']);
      return true;
    },
    processRow: function(row) {
      const dep = normalizeDepartmentCode(row['DEP']);
      return [
        dep,
        row['annee'].trim(),
        ...crimeFields.map(field => parseFloat(row[field]))
      ];
    }
  });
}

function createCommuneCrimeImporter(db) {
  const columns = [
    { name: 'COG', type: 'TEXT', required: true },
    { name: 'annee', type: 'TEXT', required: true },
    ...createCrimeColumns(communeCrimeFields)
  ];

  return new BaseImporter({
    csvPath: 'setup/inputFiles/crime_data_commune.csv',
    tableName: 'commune_crime',
    db: db,
    columns,
    requiredFields: ['COG', 'annee'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_commune_crime ON commune_crime(COG, annee)'],
    insertMode: 'INSERT OR IGNORE',
    createTable: function() {
      return new Promise((resolve, reject) => {
        const sql = createCrimeTableSQL('commune_crime', communeCrimeFields, ['COG', 'annee']);
        this.db.run(sql, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
    validateRow: function(row) {
      return validateCrimeRow(row, this.requiredFields, communeCrimeFields);
    },
    processRow: function(row) {
      return processCrimeRow(row, communeCrimeFields, ['COG', 'annee']);
    }
  });
}

function importCrimeData(db, callback) {
  const countryImporter = createCountryCrimeImporter(db);
  const departmentImporter = createDepartmentCrimeImporter(db);
  const communeImporter = createCommuneCrimeImporter(db);

  // Execute imports sequentially
  countryImporter.import()
    .then(() => departmentImporter.import())
    .then(() => communeImporter.import())
    .then(() => callback(null))
    .catch((err) => {
      callback(err);
    });
}

module.exports = { importCrimeData };
