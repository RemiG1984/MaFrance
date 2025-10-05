const BaseImporter = require('./baseImporter');

function importCrimeData(db, callback) {
    // List of crime fields for validation
    const crimeFields = [
        "Homicides_p100k",
        "Tentatives_d_homicides_p100k",
        "Coups_et_blessures_volontaires_p1k",
        "Coups_et_blessures_volontaires_intrafamiliaux_p1k",
        "Autres_coups_et_blessures_volontaires_p1k",
        "Violences_sexuelles_p1k",
        "Vols_avec_armes_p1k",
        "Vols_violents_sans_arme_p1k",
        "Vols_sans_violence_contre_des_personnes_p1k",
        "Cambriolages_de_logement_p1k",
        "Vols_de_véhicules_p1k",
        "Vols_dans_les_véhicules_p1k",
        "Vols_d_accessoires_sur_véhicules_p1k",
        "Destructions_et_dégradations_volontaires_p1k",
        "Usage_de_stupéfiants_p1k",
        "Usage_de_stupéfiants_AFD_p1k",
        "Trafic_de_stupéfiants_p1k",
        "Escroqueries_p1k",
    ];

    // BaseImporter for country_crime
    const countryCrimeImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/crime_data_france.csv',
        tableName: 'country_crime',
        db: db,
        columns: [
            { name: 'country', type: 'TEXT', required: true },
            { name: 'annee', type: 'TEXT', required: true },
            { name: 'homicides_p100k', type: 'REAL' },
            { name: 'tentatives_homicides_p100k', type: 'REAL' },
            { name: 'coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'coups_et_blessures_volontaires_intrafamiliaux_p1k', type: 'REAL' },
            { name: 'autres_coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'violences_sexuelles_p1k', type: 'REAL' },
            { name: 'vols_avec_armes_p1k', type: 'REAL' },
            { name: 'vols_violents_sans_arme_p1k', type: 'REAL' },
            { name: 'vols_sans_violence_contre_des_personnes_p1k', type: 'REAL' },
            { name: 'cambriolages_de_logement_p1k', type: 'REAL' },
            { name: 'vols_de_vehicules_p1k', type: 'REAL' },
            { name: 'vols_dans_les_vehicules_p1k', type: 'REAL' },
            { name: 'vols_d_accessoires_sur_vehicules_p1k', type: 'REAL' },
            { name: 'destructions_et_degradations_volontaires_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_afd_p1k', type: 'REAL' },
            { name: 'trafic_de_stupefiants_p1k', type: 'REAL' },
            { name: 'escroqueries_p1k', type: 'REAL' }
        ],
        requiredFields: ['country', 'annee'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_country_crime ON country_crime(country, annee)'],
        insertMode: 'INSERT OR IGNORE',
        createTable: function() {
            return new Promise((resolve, reject) => {
                const sql = `
                    CREATE TABLE IF NOT EXISTS country_crime (
                        country TEXT,
                        annee TEXT,
                        homicides_p100k REAL,
                        tentatives_homicides_p100k REAL,
                        coups_et_blessures_volontaires_p1k REAL,
                        coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                        autres_coups_et_blessures_volontaires_p1k REAL,
                        violences_sexuelles_p1k REAL,
                        vols_avec_armes_p1k REAL,
                        vols_violents_sans_arme_p1k REAL,
                        vols_sans_violence_contre_des_personnes_p1k REAL,
                        cambriolages_de_logement_p1k REAL,
                        vols_de_vehicules_p1k REAL,
                        vols_dans_les_vehicules_p1k REAL,
                        vols_d_accessoires_sur_vehicules_p1k REAL,
                        destructions_et_degradations_volontaires_p1k REAL,
                        usage_de_stupefiants_p1k REAL,
                        usage_de_stupefiants_afd_p1k REAL,
                        trafic_de_stupefiants_p1k REAL,
                        escroqueries_p1k REAL,
                        PRIMARY KEY (country, annee)
                    )
                `;
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error('Error creating table country_crime:', err.message);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
        validateRow: function(row) {
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields in crime_data_france.csv: ${missingFields.join(', ')}`);
            }

            // Validate crime fields
            const invalidFields = crimeFields.filter(field => {
                const value = row[field];
                return value === undefined || value === '' || isNaN(parseFloat(value));
            });
            if (invalidFields.length > 0) {
                throw new Error(`Invalid or missing crime data in crime_data_france.csv: ${invalidFields.join(', ')}`);
            }

            return true;
        },
        processRow: function(row) {
            return [
                row['country'].trim(),
                row['annee'].trim(),
                ...crimeFields.map(field => parseFloat(row[field]))
            ];
        }
    });

    // BaseImporter for department_crime
    const departmentCrimeImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/crime_data_departement.csv',
        tableName: 'department_crime',
        db: db,
        columns: [
            { name: 'dep', type: 'TEXT', required: true },
            { name: 'annee', type: 'TEXT', required: true },
            { name: 'homicides_p100k', type: 'REAL' },
            { name: 'tentatives_homicides_p100k', type: 'REAL' },
            { name: 'coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'coups_et_blessures_volontaires_intrafamiliaux_p1k', type: 'REAL' },
            { name: 'autres_coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'violences_sexuelles_p1k', type: 'REAL' },
            { name: 'vols_avec_armes_p1k', type: 'REAL' },
            { name: 'vols_violents_sans_arme_p1k', type: 'REAL' },
            { name: 'vols_sans_violence_contre_des_personnes_p1k', type: 'REAL' },
            { name: 'cambriolages_de_logement_p1k', type: 'REAL' },
            { name: 'vols_de_vehicules_p1k', type: 'REAL' },
            { name: 'vols_dans_les_vehicules_p1k', type: 'REAL' },
            { name: 'vols_d_accessoires_sur_vehicules_p1k', type: 'REAL' },
            { name: 'destructions_et_degradations_volontaires_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_afd_p1k', type: 'REAL' },
            { name: 'trafic_de_stupefiants_p1k', type: 'REAL' },
            { name: 'escroqueries_p1k', type: 'REAL' }
        ],
        requiredFields: ['DEP', 'annee'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_department_crime ON department_crime(dep, annee)'],
        insertMode: 'INSERT OR IGNORE',
        createTable: function() {
            return new Promise((resolve, reject) => {
                const sql = `
                    CREATE TABLE IF NOT EXISTS department_crime (
                        dep TEXT,
                        annee TEXT,
                        homicides_p100k REAL,
                        tentatives_homicides_p100k REAL,
                        coups_et_blessures_volontaires_p1k REAL,
                        coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                        autres_coups_et_blessures_volontaires_p1k REAL,
                        violences_sexuelles_p1k REAL,
                        vols_avec_armes_p1k REAL,
                        vols_violents_sans_arme_p1k REAL,
                        vols_sans_violence_contre_des_personnes_p1k REAL,
                        cambriolages_de_logement_p1k REAL,
                        vols_de_vehicules_p1k REAL,
                        vols_dans_les_vehicules_p1k REAL,
                        vols_d_accessoires_sur_vehicules_p1k REAL,
                        destructions_et_degradations_volontaires_p1k REAL,
                        usage_de_stupefiants_p1k REAL,
                        usage_de_stupefiants_afd_p1k REAL,
                        trafic_de_stupefiants_p1k REAL,
                        escroqueries_p1k REAL,
                        PRIMARY KEY (dep, annee)
                    )
                `;
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error('Error creating table department_crime:', err.message);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
        validateRow: function(row) {
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields in crime_data_departement.csv: ${missingFields.join(', ')}`);
            }

            // Normalize department code
            let dep = row['DEP'].trim().toUpperCase();
            if (/^\d+$/.test(dep)) {
                dep = dep.padStart(2, '0');
            }
            if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(dep)) {
                throw new Error(`Invalid department code in crime_data_departement.csv: ${dep}`);
            }

            // Validate crime fields
            const invalidFields = crimeFields.filter(field => {
                const value = row[field];
                return value === undefined || value === '' || isNaN(parseFloat(value));
            });
            if (invalidFields.length > 0) {
                throw new Error(`Invalid or missing crime data in crime_data_departement.csv: ${invalidFields.join(', ')}`);
            }

            return true;
        },
        processRow: function(row) {
            // Normalize department code
            let dep = row['DEP'].trim().toUpperCase();
            if (/^\d+$/.test(dep)) {
                dep = dep.padStart(2, '0');
            }

            return [
                dep,
                row['annee'].trim(),
                ...crimeFields.map(field => parseFloat(row[field]))
            ];
        }
    });

    // List of crime fields for commune (subset)
    const communeCrimeFields = [
        "Coups_et_blessures_volontaires_p1k",
        "Coups_et_blessures_volontaires_intrafamiliaux_p1k",
        "Autres_coups_et_blessures_volontaires_p1k",
        "Violences_sexuelles_p1k",
        "Vols_avec_armes_p1k",
        "Vols_violents_sans_arme_p1k",
        "Vols_sans_violence_contre_des_personnes_p1k",
        "Cambriolages_de_logement_p1k",
        "Vols_de_véhicules_p1k",
        "Vols_dans_les_véhicules_p1k",
        "Vols_d_accessoires_sur_véhicules_p1k",
        "Destructions_et_dégradations_volontaires_p1k",
        "Usage_de_stupéfiants_p1k",
        "Usage_de_stupéfiants_AFD_p1k",
        "Trafic_de_stupéfiants_p1k",
        "Escroqueries_p1k",
    ];

    // BaseImporter for commune_crime
    const communeCrimeImporter = new BaseImporter({
        csvPath: 'setup/inputFiles/crime_data_commune.csv',
        tableName: 'commune_crime',
        db: db,
        columns: [
            { name: 'COG', type: 'TEXT', required: true },
            { name: 'annee', type: 'TEXT', required: true },
            { name: 'coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'coups_et_blessures_volontaires_intrafamiliaux_p1k', type: 'REAL' },
            { name: 'autres_coups_et_blessures_volontaires_p1k', type: 'REAL' },
            { name: 'violences_sexuelles_p1k', type: 'REAL' },
            { name: 'vols_avec_armes_p1k', type: 'REAL' },
            { name: 'vols_violents_sans_arme_p1k', type: 'REAL' },
            { name: 'vols_sans_violence_contre_des_personnes_p1k', type: 'REAL' },
            { name: 'cambriolages_de_logement_p1k', type: 'REAL' },
            { name: 'vols_de_vehicules_p1k', type: 'REAL' },
            { name: 'vols_dans_les_vehicules_p1k', type: 'REAL' },
            { name: 'vols_d_accessoires_sur_vehicules_p1k', type: 'REAL' },
            { name: 'destructions_et_degradations_volontaires_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_p1k', type: 'REAL' },
            { name: 'usage_de_stupefiants_afd_p1k', type: 'REAL' },
            { name: 'trafic_de_stupefiants_p1k', type: 'REAL' },
            { name: 'escroqueries_p1k', type: 'REAL' }
        ],
        requiredFields: ['COG', 'annee'],
        indexes: ['CREATE INDEX IF NOT EXISTS idx_commune_crime ON commune_crime(COG, annee)'],
        insertMode: 'INSERT OR IGNORE',
        createTable: function() {
            return new Promise((resolve, reject) => {
                const sql = `
                    CREATE TABLE IF NOT EXISTS commune_crime (
                        COG TEXT,
                        annee TEXT,
                        coups_et_blessures_volontaires_p1k REAL,
                        coups_et_blessures_volontaires_intrafamiliaux_p1k REAL,
                        autres_coups_et_blessures_volontaires_p1k REAL,
                        violences_sexuelles_p1k REAL,
                        vols_avec_armes_p1k REAL,
                        vols_violents_sans_arme_p1k REAL,
                        vols_sans_violence_contre_des_personnes_p1k REAL,
                        cambriolages_de_logement_p1k REAL,
                        vols_de_vehicules_p1k REAL,
                        vols_dans_les_vehicules_p1k REAL,
                        vols_d_accessoires_sur_vehicules_p1k REAL,
                        destructions_et_degradations_volontaires_p1k REAL,
                        usage_de_stupefiants_p1k REAL,
                        usage_de_stupefiants_afd_p1k REAL,
                        trafic_de_stupefiants_p1k REAL,
                        escroqueries_p1k REAL,
                        PRIMARY KEY (COG, annee)
                    )
                `;
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error('Error creating table commune_crime:', err.message);
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        },
        validateRow: function(row) {
            // Check required fields
            const missingFields = this.requiredFields.filter(field => !row[field] || row[field].trim() === '');
            if (missingFields.length > 0) {
                throw new Error(`Missing required fields in crime_data_commune.csv: ${missingFields.join(', ')}`);
            }

            // Validate crime fields
            const invalidFields = communeCrimeFields.filter(field => {
                const value = row[field];
                return value === undefined || value === '' || isNaN(parseFloat(value));
            });
            if (invalidFields.length > 0) {
                throw new Error(`Invalid or missing crime data in crime_data_commune.csv: ${invalidFields.join(', ')}`);
            }

            return true;
        },
        processRow: function(row) {
            return [
                row['COG'].trim(),
                row['annee'].trim(),
                ...communeCrimeFields.map(field => parseFloat(row[field]))
            ];
        }
    });

    // Execute imports sequentially
    countryCrimeImporter.import()
        .then(() => departmentCrimeImporter.import())
        .then(() => communeCrimeImporter.import())
        .then(() => callback(null))
        .catch((err) => {
            console.error('Failed to import crime data:', err.message);
            callback(err);
        });
}

module.exports = { importCrimeData };
