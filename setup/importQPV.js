const BaseImporter = require('./baseImporter');

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

    const processRow = function(row) {
        let insee_dep = row['insee_dep'] || null;
        if (insee_dep && /^\d+$/.test(insee_dep) && insee_dep.length < 2) {
            insee_dep = insee_dep.padStart(2, '0');
        }
        return [
            row['COG'] ? row['COG'].trim() : null,
            row['lib_com'] ? row['lib_com'].trim() : null,
            row['codeQPV'] ? row['codeQPV'].trim() : null,
            row['lib_qp'] ? row['lib_qp'].trim() : null,
            row['insee_reg'] && !isNaN(parseInt(row['insee_reg'])) ? parseInt(row['insee_reg']) : null,
            row['lib_reg'] ? row['lib_reg'].trim() : null,
            insee_dep,
            row['lib_dep'] ? row['lib_dep'].trim() : null,
            row['siren_epci'] ? row['siren_epci'].trim() : null,
            row['lib_epci'] ? row['lib_epci'].trim() : null,
            row['popMuniQPV'] && row['popMuniQPV'].trim() && !isNaN(parseInt(row['popMuniQPV'])) ? parseInt(row['popMuniQPV']) : null,
            row['indiceJeunesse'] && row['indiceJeunesse'].trim() && !isNaN(parseFloat(row['indiceJeunesse'])) ? parseFloat(row['indiceJeunesse']) : null,
            row['partPopEt'] && row['partPopEt'].trim() && !isNaN(parseFloat(row['partPopEt'])) ? parseFloat(row['partPopEt']) : null,
            row['partPopImmi'] && row['partPopImmi'].trim() && !isNaN(parseFloat(row['partPopImmi'])) ? parseFloat(row['partPopImmi']) : null,
            row['partMenImmi'] && row['partMenImmi'].trim() && !isNaN(parseFloat(row['partMenImmi'])) ? parseFloat(row['partMenImmi']) : null,
            row['partMenEt'] && row['partMenEt'].trim() && !isNaN(parseFloat(row['partMenEt'])) ? parseFloat(row['partMenEt']) : null,
            row['partMen1p'] && row['partMen1p'].trim() && !isNaN(parseFloat(row['partMen1p'])) ? parseFloat(row['partMen1p']) : null,
            row['partMen2p'] && row['partMen2p'].trim() && !isNaN(parseFloat(row['partMen2p'])) ? parseFloat(row['partMen2p']) : null,
            row['partMen3p'] && row['partMen3p'].trim() && !isNaN(parseFloat(row['partMen3p'])) ? parseFloat(row['partMen3p']) : null,
            row['partMen45p'] && row['partMen45p'].trim() && !isNaN(parseFloat(row['partMen45p'])) ? parseFloat(row['partMen45p']) : null,
            row['partMen6pp'] && row['partMen6pp'].trim() && !isNaN(parseFloat(row['partMen6pp'])) ? parseFloat(row['partMen6pp']) : null,
            row['nombre_menages'] && row['nombre_menages'].trim() && !isNaN(parseFloat(row['nombre_menages'])) ? parseFloat(row['nombre_menages']) : null,
            row['nombre_logements_sociaux'] && row['nombre_logements_sociaux'].trim() && !isNaN(parseFloat(row['nombre_logements_sociaux'])) ? parseFloat(row['nombre_logements_sociaux']) : null,
            row['taux_logements_sociaux'] && row['taux_logements_sociaux'].trim() && !isNaN(parseFloat(row['taux_logements_sociaux'])) ? parseFloat(row['taux_logements_sociaux']) : null,
            row['taux_d_emploi'] && row['taux_d_emploi'].trim() && !isNaN(parseFloat(row['taux_d_emploi'])) ? parseFloat(row['taux_d_emploi']) : null,
            row['taux_pauvrete_60%'] && row['taux_pauvrete_60%'].trim() && !isNaN(parseFloat(row['taux_pauvrete_60%'])) ? parseFloat(row['taux_pauvrete_60%']) : null,
            row['personnes_couvertes_CAF'] && row['personnes_couvertes_CAF'].trim() && !isNaN(parseFloat(row['personnes_couvertes_CAF'])) ? parseFloat(row['personnes_couvertes_CAF']) : null,
            row['allocataires_CAF'] && row['allocataires_CAF'].trim() && !isNaN(parseFloat(row['allocataires_CAF'])) ? parseFloat(row['allocataires_CAF']) : null,
            row['RSA_socle'] && row['RSA_socle'].trim() && !isNaN(parseFloat(row['RSA_socle'])) ? parseFloat(row['RSA_socle']) : null
        ];
    };

    const createTable = function() {
        const columnDefs = this.columns.map(col => {
            let def = `${col.name} ${col.type}`;
            if (col.required) def += ' NOT NULL';
            return def;
        }).join(', ');

        const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs}, PRIMARY KEY (COG, codeQPV))`;

        return new Promise((resolve, reject) => {
            this.db.run(sql, (err) => {
                if (err) {
                    console.error(`Error creating table ${this.tableName}:`, err.message);
                    reject(err);
                    return;
                }

                // Create indexes
                if (this.indexes.length > 0) {
                    let indexCount = 0;
                    this.indexes.forEach(indexSql => {
                        this.db.run(indexSql, (err) => {
                            if (err) {
                                console.error(`Error creating index:`, err.message);
                                reject(err);
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
    };

    const importer = new BaseImporter({
        csvPath: 'setup/inputFiles/analyse_qpv.csv',
        tableName: 'qpv_data',
        columns: columns,
        requiredFields: requiredFields,
        processRow: processRow,
        db: db,
        indexes: indexes,
        createTable: createTable
    });

    importer.import()
        .then(() => callback(null))
        .catch((err) => {
            console.error('Failed to import QPV data:', err.message);
            callback(err);
        });
}

module.exports = { importQPV };
