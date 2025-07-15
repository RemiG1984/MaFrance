
const fs = require('fs');
const csv = require('csv-parser');

function importQPV(db, callback) {
    let qpvRows = 0;
    let qpvBatch = [];
    const batchSize = 1000;

    function readQPVData() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync('setup/analyse_qpv.csv')) {
                console.error('Erreur: setup/analyse_qpv.csv n\'existe pas dans le répertoire courant');
                resolve(); // Continue with empty data
                return;
            }

            fs.createReadStream('setup/analyse_qpv.csv')
                .pipe(csv())
                .on('data', (row) => {
                    const missingFields = [];
                    if (!row['COG']) missingFields.push('COG');
                    if (!row['lib_com']) missingFields.push('lib_com');
                    if (!row['codeQPV']) missingFields.push('codeQPV');

                    if (missingFields.length > 0) {
                        console.warn(`Ligne ignorée dans analyse_qpv.csv (champs manquants: ${missingFields.join(', ')}):`, row);
                        return;
                    }

                    const cog = row['COG'];
                    const lib_com = row['lib_com'];
                    const codeQPV = row['codeQPV'];
                    const lib_qp = row['lib_qp'] || null;
                    const insee_reg = parseInt(row['insee_reg']) || null;
                    const lib_reg = row['lib_reg'] || null;
                    const insee_dep = row['insee_dep'] || null;
                    const lib_dep = row['lib_dep'] || null;
                    const siren_epci = row['siren_epci'] || null;
                    const lib_epci = row['lib_epci'] || null;
                    const popMuniQPV = row['popMuniQPV'] && row['popMuniQPV'].trim() ? parseInt(row['popMuniQPV']) : null;
                    const indiceJeunesse = row['indiceJeunesse'] && row['indiceJeunesse'].trim() ? parseFloat(row['indiceJeunesse']) : null;
                    const partPopEt = row['partPopEt'] && row['partPopEt'].trim() ? parseFloat(row['partPopEt']) : null;
                    const partPopImmi = row['partPopImmi'] && row['partPopImmi'].trim() ? parseFloat(row['partPopImmi']) : null;
                    const partMenImmi = row['partMenImmi'] && row['partMenImmi'].trim() ? parseFloat(row['partMenImmi']) : null;
                    const partMenEt = row['partMenEt'] && row['partMenEt'].trim() ? parseFloat(row['partMenEt']) : null;
                    const partMen1p = row['partMen1p'] && row['partMen1p'].trim() ? parseFloat(row['partMen1p']) : null;
                    const partMen2p = row['partMen2p'] && row['partMen2p'].trim() ? parseFloat(row['partMen2p']) : null;
                    const partMen3p = row['partMen3p'] && row['partMen3p'].trim() ? parseFloat(row['partMen3p']) : null;
                    const partMen45p = row['partMen45p'] && row['partMen45p'].trim() ? parseFloat(row['partMen45p']) : null;
                    const partMen6pp = row['partMen6pp'] && row['partMen6pp'].trim() ? parseFloat(row['partMen6pp']) : null;
                    const nombre_menages = row['nombre_menages'] && row['nombre_menages'].trim() ? parseFloat(row['nombre_menages']) : null;
                    const nombre_logements_sociaux = row['nombre_logements_sociaux'] && row['nombre_logements_sociaux'].trim() ? parseFloat(row['nombre_logements_sociaux']) : null;
                    const taux_logements_sociaux = row['taux_logements_sociaux'] && row['taux_logements_sociaux'].trim() ? parseFloat(row['taux_logements_sociaux']) : null;
                    const taux_d_emploi = row['taux_d_emploi'] && row['taux_d_emploi'].trim() ? parseFloat(row['taux_d_emploi']) : null;
                    const taux_pauvrete_60 = row['taux_pauvrete_60%'] && row['taux_pauvrete_60%'].trim() ? parseFloat(row['taux_pauvrete_60%']) : null;
                    const personnes_couvertes_CAF = row['personnes_couvertes_CAF'] && row['personnes_couvertes_CAF'].trim() ? parseFloat(row['personnes_couvertes_CAF']) : null;
                    const allocataires_CAF = row['allocataires_CAF'] && row['allocataires_CAF'].trim() ? parseFloat(row['allocataires_CAF']) : null;
                    const RSA_socle = row['RSA_socle'] && row['RSA_socle'].trim() ? parseFloat(row['RSA_socle']) : null;

                    qpvRows++;
                    qpvBatch.push([
                        cog,
                        lib_com,
                        codeQPV,
                        lib_qp,
                        insee_reg,
                        lib_reg,
                        insee_dep,
                        lib_dep,
                        siren_epci,
                        lib_epci,
                        popMuniQPV,
                        indiceJeunesse,
                        partPopEt,
                        partPopImmi,
                        partMenImmi,
                        partMenEt,
                        partMen1p,
                        partMen2p,
                        partMen3p,
                        partMen45p,
                        partMen6pp,
                        nombre_menages,
                        nombre_logements_sociaux,
                        taux_logements_sociaux,
                        taux_d_emploi,
                        taux_pauvrete_60,
                        personnes_couvertes_CAF,
                        allocataires_CAF,
                        RSA_socle
                    ]);
                })
                .on('end', () => {
                    console.log(`Lecture de analyse_qpv.csv terminée: ${qpvRows} lignes`);
                    if (qpvRows === 0) {
                        console.warn('Avertissement: analyse_qpv.csv est vide ou n\'a pas de données valides');
                    }
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Erreur lecture analyse_qpv.csv:', err.message);
                    reject(err);
                });
        });
    }

    function insertQPVData() {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS qpv_data (
                        COG TEXT,
                        lib_com TEXT,
                        codeQPV TEXT,
                        lib_qp TEXT,
                        insee_reg INTEGER,
                        lib_reg TEXT,
                        insee_dep TEXT,
                        lib_dep TEXT,
                        siren_epci TEXT,
                        lib_epci TEXT,
                        popMuniQPV INTEGER,
                        indiceJeunesse REAL,
                        partPopEt REAL,
                        partPopImmi REAL,
                        partMenImmi REAL,
                        partMenEt REAL,
                        partMen1p REAL,
                        partMen2p REAL,
                        partMen3p REAL,
                        partMen45p REAL,
                        partMen6pp REAL,
                        nombre_menages REAL,
                        nombre_logements_sociaux REAL,
                        taux_logements_sociaux REAL,
                        taux_d_emploi REAL,
                        taux_pauvrete_60 REAL,
                        personnes_couvertes_CAF REAL,
                        allocataires_CAF REAL,
                        RSA_socle REAL,
                        PRIMARY KEY (COG, codeQPV)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Erreur création table qpv_data:', err.message);
                        reject(err);
                        return;
                    }

                    db.run('CREATE INDEX IF NOT EXISTS idx_qpv_cog ON qpv_data(COG)', (err) => {
                        if (err) {
                            console.error('Erreur création index qpv_data:', err.message);
                            reject(err);
                            return;
                        }

                        db.run('CREATE INDEX IF NOT EXISTS idx_qpv_dep ON qpv_data(insee_dep)', (err) => {
                            if (err) {
                                console.error('Erreur création index qpv_data département:', err.message);
                                reject(err);
                                return;
                            }

                            db.run('BEGIN TRANSACTION', (err) => {
                                if (err) {
                                    console.error('Erreur début transaction qpv_data:', err.message);
                                    reject(err);
                                    return;
                                }

                                if (qpvBatch.length > 0) {
                                    for (let i = 0; i < qpvBatch.length; i += batchSize) {
                                        const batch = qpvBatch.slice(i, i + batchSize);
                                        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
                                        const flatBatch = [].concat(...batch);
                                        
                                        db.run(
                                            `INSERT OR REPLACE INTO qpv_data (
                                                COG, lib_com, codeQPV, lib_qp, insee_reg, lib_reg, insee_dep, lib_dep,
                                                siren_epci, lib_epci, popMuniQPV, indiceJeunesse, partPopEt, partPopImmi,
                                                partMenImmi, partMenEt, partMen1p, partMen2p, partMen3p, partMen45p,
                                                partMen6pp, nombre_menages, nombre_logements_sociaux, taux_logements_sociaux,
                                                taux_d_emploi, taux_pauvrete_60, personnes_couvertes_CAF, allocataires_CAF, RSA_socle
                                            ) VALUES ${placeholders}`,
                                            flatBatch,
                                            (err) => {
                                                if (err) {
                                                    console.error('Erreur insertion batch qpv_data:', err.message);
                                                }
                                            }
                                        );
                                    }
                                }

                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Erreur commit qpv_data:', err.message);
                                        db.run('ROLLBACK');
                                        reject(err);
                                    } else {
                                        console.log(`Importation de ${qpvRows} lignes dans qpv_data terminée`);
                                        resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    return readQPVData().then(insertQPVData).then(() => callback(null)).catch((err) => {
        console.error('Échec de l\'importation des données QPV:', err.message);
        callback(err);
    });
}

module.exports = { importQPV };
