
const BaseImporter = require('./baseImporter');
const fs = require('fs');
const csv = require('csv-parser');

function sanitizeColumnName(columnName) {
  // Replace spaces and special characters with underscores
  // Remove accents and special characters, keep only alphanumeric and underscores
  return columnName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
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

function validateNat1Row(row) {
  const missingFields = [];
  if (!row['Type']) {
    missingFields.push('Type');
  }
  if (!row['Code']) {
    missingFields.push('Code');
  }
  return missingFields;
}

function shouldSkipRow(type) {
  return type === 'dept-';
}

function extractNumericFields(row) {
  const numericFields = {};
  Object.keys(row).forEach(key => {
    if (key !== 'Type' && key !== 'Code') {
      const value = parseFloat(row[key]);
      numericFields[key] = isNaN(value) ? 0 : value;
    }
  });
  return numericFields;
}

function processCountryRow(code, type, numericFields) {
  const countryRow = [code, type];
  Object.keys(numericFields).forEach(key => {
    countryRow.push(numericFields[key]);
  });
  return countryRow;
}

function processDepartmentRow(code, type, numericFields) {
  let departement = code;
  if (/^\d+$/.test(departement)) {
    departement = departement.padStart(2, '0');
  }
  const deptRow = [departement, type];
  Object.keys(numericFields).forEach(key => {
    deptRow.push(numericFields[key]);
  });
  return deptRow;
}

function processCommuneRow(code, type, numericFields) {
  const communeRow = [code, type];
  Object.keys(numericFields).forEach(key => {
    communeRow.push(numericFields[key]);
  });
  return communeRow;
}

function processNat1CsvRow(row, state) {
  const missingFields = validateNat1Row(row);
  if (missingFields.length > 0) {
    const reason = `Champs manquants: ${missingFields.join(', ')}`;
    state.ignoredLines.push({
      lineNumber: state.totalRows + state.skippedRows + 1,
      reason: reason,
      data: { Type: row['Type'] || 'N/A', Code: row['Code'] || 'N/A' }
    });
    state.skippedRows++;
    return;
  }

  const type = row['Type'].trim();
  const code = row['Code'].trim();

  if (shouldSkipRow(type)) {
    state.ignoredLines.push({
      lineNumber: state.totalRows + state.skippedRows + 1,
      reason: 'Type \'dept-\' ignoré (non supporté)',
      data: { Type: type, Code: code }
    });
    state.skippedRows++;
    return;
  }

  const numericFields = extractNumericFields(row);
  state.totalRows++;

  // Route data based on Type
  if (type === 'country') {
    state.countryBatch.push(processCountryRow(code, type, numericFields));
  } else if (type === 'dept') {
    state.departmentBatch.push(processDepartmentRow(code, type, numericFields));
  } else if (type === 'com' || type === 'com-') {
    state.communeBatch.push(processCommuneRow(code, type, numericFields));
  }
}

function logIgnoredLinesReport(ignoredLines) {
  // Report ignored lines
  if (ignoredLines.length > 0) {
    // Group by reason
    ignoredLines.reduce((acc, line) => {
      if (!acc[line.reason]) {
        acc[line.reason] = [];
      }
      acc[line.reason].push(line);
      return acc;
    }, {});
  }
}

function readNat1Data() {
  return new Promise((resolve, reject) => {
    const state = {
      totalRows: 0,
      countryBatch: [],
      departmentBatch: [],
      communeBatch: [],
      skippedRows: 0,
      ignoredLines: []
    };

    if (!fs.existsSync('setup/inputFiles/insee_NAT1_detailed_inferred.csv')) {
      resolve(state);
      return;
    }

    fs.createReadStream('setup/inputFiles/insee_NAT1_detailed_inferred.csv')
      .pipe(csv())
      .on('data', (row) => {
        processNat1CsvRow(row, state);
      })
      .on('end', () => {
        logIgnoredLinesReport(state.ignoredLines);
        resolve(state);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

function getFieldNames() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync('setup/inputFiles/insee_NAT1_detailed_inferred.csv')) {
      resolve([]);
      return;
    }

    let fieldNames = [];
    fs.createReadStream('setup/inputFiles/insee_NAT1_detailed_inferred.csv')
      .pipe(csv())
      .on('headers', (headers) => {
        // Filter out Type and Code to get only data fields
        fieldNames = headers.filter(h => h !== 'Type' && h !== 'Code');
      })
      .on('data', () => {
        // We only need the headers, so we can stop after first row
      })
      .on('end', () => {
        resolve(fieldNames);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
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
      db: db,
      indexes: ['CREATE INDEX IF NOT EXISTS idx_country_nat1 ON country_nat1(Code)'],
      insertMode: 'INSERT OR IGNORE'
    });

    importer.createTable().then(() => {
      importer.insertBatch(countryBatch).then(() => {
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
      db: db,
      indexes: ['CREATE INDEX IF NOT EXISTS idx_department_nat1 ON department_nat1(Code)'],
      insertMode: 'INSERT OR IGNORE'
    });

    importer.createTable().then(() => {
      importer.insertBatch(departmentBatch).then(() => {
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
      db: db,
      indexes: ['CREATE INDEX IF NOT EXISTS idx_commune_nat1 ON commune_nat1(Code)'],
      insertMode: 'INSERT OR IGNORE'
    });

    importer.createTable().then(() => {
      importer.insertBatch(communeBatch).then(() => {
        resolve();
      }).catch(reject);
    }).catch(reject);
  });
}

function importNat1(db, callback) {
  // Execute import process
  Promise.all([readNat1Data(), getFieldNames()])
    .then(([data, fieldNames]) => {
      const { countryBatch, departmentBatch, communeBatch } = data;
      return insertCountryNat1(db, fieldNames, countryBatch)
        .then(() => insertDepartmentNat1(db, fieldNames, departmentBatch))
        .then(() => insertCommuneNat1(db, fieldNames, communeBatch));
    })
    .then(() => {
      callback(null);
    })
    .catch((err) => {
      callback(err);
    });
}

module.exports = { importNat1 };