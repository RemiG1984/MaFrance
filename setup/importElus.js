const BaseImporter = require('./baseImporter');

function importElus(db, callback) {
    // BaseImporter for maires
    const mairesImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/maires_list.csv',
        tableName: 'maires',
        db: db,
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
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                console.warn(`Row ignored (missing fields: ${missingFields.join(', ')}):`, row);
                return false;
            }

            // Validate sexe
            const sexe = row['sexe'].trim().toUpperCase();
            if (!['M', 'F'].includes(sexe)) {
                console.warn(`Invalid sexe ignored: ${sexe}`, row);
                return false;
            }

            return true;
        },
        processRow: function(row) {
            // Validate sexe
            const sexe = row['sexe'].trim().toUpperCase();

            // Parse dates, allow null if invalid
            let dateNais = null;
            let dateMandat = null;
            if (row['dateNais'] && /^\d{4}-\d{2}-\d{2}$/.test(row['dateNais'])) {
                dateNais = row['dateNais'];
            }
            if (row['dateMandat'] && /^\d{4}-\d{2}-\d{2}$/.test(row['dateMandat'])) {
                dateMandat = row['dateMandat'];
            }

            // Normalize famille_nuance and nuance_politique
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

    // BaseImporter for prefets
    const prefetsImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/prefets_list.csv',
        tableName: 'prefets',
        db: db,
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
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                console.warn(`Row ignored (missing fields: ${missingFields.join(', ')}):`, row);
                return false;
            }

            // Normalize and validate department code
            let code = row['Code'].trim().toUpperCase();
            if (/^\d+$/.test(code)) {
                code = code.padStart(2, '0');
            }
            if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(code)) {
                console.warn(`Invalid department code ignored: ${code}`, row);
                return false;
            }

            return true;
        },
        processRow: function(row) {
            // Normalize department code
            let code = row['Code'].trim().toUpperCase();
            if (/^\d+$/.test(code)) {
                code = code.padStart(2, '0');
            }

            // Parse datePoste, allow null if invalid
            let datePoste = null;
            if (row['datePoste'] && /^\d{2}\/\d{2}\/\d{2}$/.test(row['datePoste'])) {
                const [day, month, year] = row['datePoste'].split('/');
                datePoste = `20${year}-${month}-${day}`;
            }

            return [
                code,
                row['Prenom'].trim(),
                row['Nom'].trim(),
                datePoste
            ];
        }
    });

    // BaseImporter for ministre_interieur
    const ministreImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/ministre_interieur_list.csv',
        tableName: 'ministre_interieur',
        db: db,
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
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                console.warn(`Row ignored (missing fields: ${missingFields.join(', ')}):`, row);
                return false;
            }

            // Validate sexe
            const sexe = row['sexe'].trim().toUpperCase();
            if (!['M', 'F'].includes(sexe)) {
                console.warn(`Invalid sexe ignored: ${sexe}`, row);
                return false;
            }

            return true;
        },
        processRow: function(row) {
            // Validate sexe
            const sexe = row['sexe'].trim().toUpperCase();

            // Parse dates, allow null if invalid
            let dateNais = null;
            let dateMandat = null;
            if (row['dateNais'] && /^\d{4}-\d{2}-\d{2}$/.test(row['dateNais'])) {
                dateNais = row['dateNais'];
            }
            if (row['dateMandat'] && /^\d{4}-\d{2}-\d{2}$/.test(row['dateMandat'])) {
                dateMandat = row['dateMandat'];
            }

            // Normalize famille_nuance and nuance_politique
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

    // Execute imports sequentially
    mairesImporter.import()
        .then(() => prefetsImporter.import())
        .then(() => ministreImporter.import())
        .then(() => callback(null))
        .catch((err) => {
            console.error('Failed to import élus:', err.message);
            callback(err);
        });
}

module.exports = { importElus };
