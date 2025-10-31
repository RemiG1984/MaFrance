const BaseImporter = require('./baseImporter');

function validateRequiredFields(row, requiredFields) {
  const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
  if (missingFields.length > 0) {
    return false;
  }
  return true;
}

function validateSex(sexe) {
  const normalizedSexe = sexe.trim().toUpperCase();
  if (!['M', 'F'].includes(normalizedSexe)) {
    return false;
  }
  return normalizedSexe;
}

function normalizeDepartmentCode(code) {
  let normalized = code.trim().toUpperCase();
  if (/^\d+$/.test(normalized)) {
    normalized = normalized.padStart(2, '0');
  }
  if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(normalized)) {
    return false;
  }
  return normalized;
}

function parseDateYYYYMMDD(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  return dateStr;
}

function parseDateDDMMYY(dateStr) {
  if (!dateStr || !/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return null;
  }
  const [day, month, year] = dateStr.split('/');
  return `20${year}-${month}-${day}`;
}

function createMairesImporter(db) {
  return new BaseImporter({
    csvPath: 'setup/inputFiles/maires_list.csv',
    tableName: 'maires',
    db,
    columns: [
      { name: 'cog', type: 'TEXT', required: true },
      { name: 'commune', type: 'TEXT', required: true },
      { name: 'prenom', type: 'TEXT', required: true },
      { name: 'nom', type: 'TEXT', required: true },
      { name: 'sexe', type: 'TEXT', required: true },
      { name: 'date_nais', type: 'TEXT' },
      { name: 'date_mandat', type: 'TEXT' },
      { name: 'famille_nuance', type: 'TEXT' },
      { name: 'nuance_politique', type: 'TEXT' }
    ],
    requiredFields: ['cog', 'commune', 'prenom', 'nom', 'sexe'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_maires_commune ON maires(commune)'],
    insertMode: 'INSERT OR IGNORE',
    validateRow: function(row) {
      if (!validateRequiredFields(row, this.requiredFields)) {
        return false;
      }
      return validateSex(row['sexe']) !== false;
    },
    processRow: function(row) {
      const sexe = validateSex(row['sexe']);
      const dateNais = parseDateYYYYMMDD(row['dateNais']);
      const dateMandat = parseDateYYYYMMDD(row['dateMandat']);
      const familleNuance = row['famille_nuance'] ? row['famille_nuance'].trim() : null;
      const nuancePolitique = row['nuance_politique'] ? row['nuance_politique'].trim() : null;

      return [
        row['cog'].trim(),
        row['commune'].trim(),
        row['prenom'].trim(),
        row['nom'].trim(),
        sexe,
        dateNais,
        dateMandat,
        familleNuance,
        nuancePolitique
      ];
    }
  });
}

function createPrefetsImporter(db) {
  return new BaseImporter({
    csvPath: 'setup/inputFiles/prefets_list.csv',
    tableName: 'prefets',
    db,
    columns: [
      { name: 'code', type: 'TEXT', required: true },
      { name: 'prenom', type: 'TEXT', required: true },
      { name: 'nom', type: 'TEXT', required: true },
      { name: 'date_poste', type: 'TEXT' }
    ],
    requiredFields: ['Code', 'Prenom', 'Nom'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_prefets_nom ON prefets(nom)'],
    insertMode: 'INSERT OR IGNORE',
    validateRow: function(row) {
      if (!validateRequiredFields(row, this.requiredFields)) {
        return false;
      }
      return normalizeDepartmentCode(row['Code']) !== false;
    },
    processRow: function(row) {
      const code = normalizeDepartmentCode(row['Code']);
      const datePoste = parseDateDDMMYY(row['datePoste']);

      return [
        code,
        row['Prenom'].trim(),
        row['Nom'].trim(),
        datePoste
      ];
    }
  });
}

function createMinistreImporter(db) {
  return new BaseImporter({
    csvPath: 'setup/inputFiles/ministre_interieur_list.csv',
    tableName: 'ministre_interieur',
    db,
    columns: [
      { name: 'country', type: 'TEXT', required: true },
      { name: 'prenom', type: 'TEXT', required: true },
      { name: 'nom', type: 'TEXT', required: true },
      { name: 'sexe', type: 'TEXT', required: true },
      { name: 'date_nais', type: 'TEXT' },
      { name: 'date_mandat', type: 'TEXT' },
      { name: 'famille_nuance', type: 'TEXT' },
      { name: 'nuance_politique', type: 'TEXT' }
    ],
    requiredFields: ['country', 'prenom', 'nom', 'sexe'],
    indexes: ['CREATE INDEX IF NOT EXISTS idx_ministre_interieur_nom ON ministre_interieur(nom)'],
    insertMode: 'INSERT OR IGNORE',
    validateRow: function(row) {
      if (!validateRequiredFields(row, this.requiredFields)) {
        return false;
      }
      return validateSex(row['sexe']) !== false;
    },
    processRow: function(row) {
      const sexe = validateSex(row['sexe']);
      const dateNais = parseDateYYYYMMDD(row['dateNais']);
      const dateMandat = parseDateYYYYMMDD(row['dateMandat']);
      const familleNuance = row['famille_nuance'] ? row['famille_nuance'].trim() : null;
      const nuancePolitique = row['nuance_politique'] ? row['nuance_politique'].trim() : null;

      return [
        row['country'].trim().toUpperCase(),
        row['prenom'].trim(),
        row['nom'].trim(),
        sexe,
        dateNais,
        dateMandat,
        familleNuance,
        nuancePolitique
      ];
    }
  });
}

function importElus(db, callback) {
  const mairesImporter = createMairesImporter(db);
  const prefetsImporter = createPrefetsImporter(db);
  const ministreImporter = createMinistreImporter(db);

  // Execute imports sequentially
  mairesImporter.import()
    .then(() => prefetsImporter.import())
    .then(() => ministreImporter.import())
    .then(() => callback(null))
    .catch((err) => {
      callback(err);
    });
}

module.exports = { importElus };
