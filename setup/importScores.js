const BaseImporter = require('./baseImporter');
const { normalizeDepartmentCode } = require('./importUtils');

const scoreColumns = [
  { name: 'population', type: 'INTEGER' },
  { name: 'insecurite_score', type: 'INTEGER' },
  { name: 'immigration_score', type: 'INTEGER' },
  { name: 'islamisation_score', type: 'INTEGER' },
  { name: 'defrancisation_score', type: 'INTEGER' },
  { name: 'wokisme_score', type: 'INTEGER' },
  { name: 'number_of_mosques', type: 'INTEGER' },
  { name: 'mosque_p100k', type: 'REAL' },
  { name: 'total_qpv', type: 'INTEGER' },
  { name: 'pop_in_qpv_pct', type: 'REAL' },
  { name: 'logements_sociaux_pct', type: 'REAL' },
  { name: 'Total_places_migrants', type: 'INTEGER' },
  { name: 'places_migrants_p1k', type: 'REAL' }
];

const countryColumns = [
  { name: 'country', type: 'TEXT' },
  ...scoreColumns
];

const departementColumns = [
  { name: 'departement', type: 'TEXT' },
  ...scoreColumns
];

const locationColumns = [
  { name: 'COG', type: 'TEXT' },
  { name: 'departement', type: 'TEXT' },
  { name: 'commune', type: 'TEXT' },
  { name: 'population', type: 'INTEGER' },
  { name: 'logements_sociaux_pct', type: 'REAL' },
  { name: 'insecurite_score', type: 'INTEGER' },
  { name: 'immigration_score', type: 'INTEGER' },
  { name: 'islamisation_score', type: 'INTEGER' },
  { name: 'defrancisation_score', type: 'INTEGER' },
  { name: 'wokisme_score', type: 'INTEGER' },
  { name: 'number_of_mosques', type: 'INTEGER' },
  { name: 'mosque_p100k', type: 'REAL' },
  { name: 'total_qpv', type: 'INTEGER' },
  { name: 'pop_in_qpv_pct', type: 'REAL' },
  { name: 'Total_places_migrants', type: 'INTEGER' },
  { name: 'places_migrants_p1k', type: 'REAL' }
];

function processCountryRow(row) {
  return [
    row['country'],
    parseInt(row['population'].replace(/\s/g, '')) || 0,
    parseInt(row['Insécurité_Score']) || 0,
    parseInt(row['Immigration_Score']) || 0,
    parseInt(row['Islamisation_Score']) || 0,
    parseInt(row['Défrancisation_Score']) || 0,
    parseInt(row['Wokisme_Score']) || 0,
    parseInt(row['Number_of_Mosques']) || 0,
    parseFloat(row['Mosque_p100k']) || 0,
    parseInt(row['Total_QPV']) || 0,
    parseFloat(row['Pop_in_QPV_pct']) || 0,
    parseFloat(row['logements_sociaux_pct']) || 0,
    parseInt(row['Total_places_migrants']) || 0,
    parseFloat(row['places_migrants_p1k']) || 0
  ];
}

function processDepartementRow(row) {
  const departement = normalizeDepartmentCode(row['departement']);
  return [
    departement,
    parseInt(row['population'].replace(/\s/g, '')) || 0,
    parseInt(row['Insécurité_Score']) || 0,
    parseInt(row['Immigration_Score']) || 0,
    parseInt(row['Islamisation_Score']) || 0,
    parseInt(row['Défrancisation_Score']) || 0,
    parseInt(row['Wokisme_Score']) || 0,
    parseInt(row['Number_of_Mosques']) || 0,
    parseFloat(row['Mosque_p100k']) || 0,
    parseInt(row['Total_QPV']) || 0,
    parseFloat(row['Pop_in_QPV_pct']) || 0,
    parseFloat(row['logements_sociaux_pct']) || 0,
    parseInt(row['Total_places_migrants']) || 0,
    parseFloat(row['places_migrants_p1k']) || 0
  ];
}

function processLocationRow(row) {
  const departement = normalizeDepartmentCode(row['departement']);
  return [
    row['COG'],
    departement,
    row['commune'],
    parseInt(row['population'].replace(/\s/g, '')) || 0,
    parseFloat(row['logements_sociaux_pct']) || 0,
    parseInt(row['Insécurité_Score']) || 0,
    parseInt(row['Immigration_Score']) || 0,
    parseInt(row['Islamisation_Score']) || 0,
    parseInt(row['Défrancisation_Score']) || 0,
    parseInt(row['Wokisme_Score']) || 0,
    parseInt(row['Number_of_Mosques']) || 0,
    parseFloat(row['Mosque_p100k']) || 0,
    parseInt(row['Total_QPV']) || 0,
    parseFloat(row['Pop_in_QPV_pct']) || 0,
    parseInt(row['Total_places_migrants']) || 0,
    parseFloat(row['places_migrants_p1k']) || 0
  ];
}

function validateCountryRow(row) {
  const missingFields = [];
  if (!row['country']) {
    missingFields.push('country');
  }
  if (!row['population']) {
    missingFields.push('population');
  }
  if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') {
    missingFields.push('Mosque_p100k');
  }
  if (!row['logements_sociaux_pct'] && row['logements_sociaux_pct'] !== '0') {
    missingFields.push('logements_sociaux_pct');
  }
  if (missingFields.length > 0) {
    return false;
  }
  return true;
}

function validateDepartementRow(row) {
  const missingFields = [];
  if (!row['departement']) {
    missingFields.push('departement');
  }
  if (!row['population']) {
    missingFields.push('population');
  }
  if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') {
    missingFields.push('Mosque_p100k');
  }
  if (!row['logements_sociaux_pct'] && row['logements_sociaux_pct'] !== '0') {
    missingFields.push('logements_sociaux_pct');
  }
  if (!row['Total_places_migrants'] && row['Total_places_migrants'] !== '0') {
    missingFields.push('Total_places_migrants');
  }
  if (!row['places_migrants_p1k'] && row['places_migrants_p1k'] !== '0') {
    missingFields.push('places_migrants_p1k');
  }
  if (missingFields.length > 0) {
    return false;
  }
  const departement = normalizeDepartmentCode(row['departement']);
  if (!departement) {
    return false;
  }
  return true;
}

function validateLocationRow(row) {
  const missingFields = [];
  if (!row['COG']) {
    missingFields.push('COG');
  }
  if (!row['commune']) {
    missingFields.push('commune');
  }
  if (!row['departement']) {
    missingFields.push('departement');
  }
  if (!row['population']) {
    missingFields.push('population');
  }
  if (!row['Mosque_p100k'] && row['Mosque_p100k'] !== '0') {
    missingFields.push('Mosque_p100k');
  }
  if (!row['logements_sociaux_pct'] && row['logements_sociaux_pct'] !== '0') {
    missingFields.push('logements_sociaux_pct');
  }
  if (missingFields.length > 0) {
    return false;
  }
  const departement = normalizeDepartmentCode(row['departement']);
  if (!departement) {
    return false;
  }
  return true;
}

function createLocationsTable() {
  return new Promise((resolve, reject) => {
    const sql = `
            CREATE TABLE IF NOT EXISTS locations (
                COG TEXT,
                departement TEXT,
                commune TEXT,
                population INTEGER,
                logements_sociaux_pct REAL,
                insecurite_score INTEGER,
                immigration_score INTEGER,
                islamisation_score INTEGER,
                defrancisation_score INTEGER,
                wokisme_score INTEGER,
                number_of_mosques INTEGER,
                mosque_p100k REAL,
                total_qpv INTEGER,
                pop_in_qpv_pct REAL,
                Total_places_migrants INTEGER,
                places_migrants_p1k REAL,
                UNIQUE(COG, commune)
            )
        `;
    this.db.run(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      this.db.run('CREATE INDEX IF NOT EXISTS idx_locations_dept_commune ON locations(departement, commune)', (indexErr) => {
        if (indexErr) {
          reject(indexErr);
          return;
        }
        resolve();
      });
    });
  });
}

function importScores(db, callback) {
  const countryImporter = new BaseImporter({
    csvPath: 'setup/inputFiles/france_scores.csv',
    tableName: 'country',
    columns: countryColumns,
    processRow: processCountryRow,
    validateRow: validateCountryRow,
    db,
    indexes: ['CREATE INDEX IF NOT EXISTS idx_country ON country(country)'],
    insertMode: 'INSERT OR IGNORE',
    allowMissingCsv: true
  });

  const departementImporter = new BaseImporter({
    csvPath: 'setup/inputFiles/departement_scores.csv',
    tableName: 'departements',
    columns: departementColumns,
    processRow: processDepartementRow,
    validateRow: validateDepartementRow,
    db,
    indexes: ['CREATE INDEX IF NOT EXISTS idx_departements ON departements(departement)'],
    insertMode: 'INSERT OR IGNORE'
  });

  const locationImporter = new BaseImporter({
    csvPath: 'setup/inputFiles/commune_scores.csv',
    tableName: 'locations',
    columns: locationColumns,
    processRow: processLocationRow,
    validateRow: validateLocationRow,
    db,
    createTable: createLocationsTable,
    insertMode: 'INSERT OR IGNORE'
  });

  countryImporter.import()
    .then(() => departementImporter.import())
    .then(() => locationImporter.import())
    .then(() => callback(null))
    .catch((err) => {
      callback(err);
    });
}

module.exports = { importScores };