
const fs = require('fs');
const csv = require('csv-parser');

function importMosques(db, callback) {
    const csvPath = 'setup/mosques_france_with_cog.csv';
    
    if (!fs.existsSync(csvPath)) {
        console.log('Mosques CSV file not found, skipping...');
        return callback(null);
    }

    console.log('Starting mosque data import...');

    db.serialize(() => {
        // Create mosques table
        db.run(`
            CREATE TABLE IF NOT EXISTS mosques (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                address TEXT,
                latitude REAL,
                longitude REAL,
                commune TEXT,
                departement TEXT,
                cog TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating mosques table:', err.message);
                return callback(err);
            }

            const results = [];
            let processedCount = 0;

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    // Parse and validate coordinates
                    const latitude = parseFloat(row.latitude || row.lat);
                    const longitude = parseFloat(row.longitude || row.lng || row.lon);
                    
                    if (isNaN(latitude) || isNaN(longitude)) {
                        return; // Skip invalid coordinates
                    }

                    // Filter to metropolitan France only (exclude overseas territories)
                    const overseasDepartements = ['971', '972', '973', '974', '976'];
                    const departement = row.departement || row.dept || '';
                    
                    if (overseasDepartements.includes(departement)) {
                        return; // Skip overseas territories
                    }

                    results.push({
                        name: row.name || 'Mosquée',
                        address: row.address || row.adresse || '',
                        latitude: latitude,
                        longitude: longitude,
                        commune: row.commune || row.ville || '',
                        departement: departement,
                        cog: row.cog || row.COG || ''
                    });
                })
                .on('end', () => {
                    console.log(`Processing ${results.length} mosques...`);

                    if (results.length === 0) {
                        console.log('No valid mosque data found');
                        return callback(null);
                    }

                    db.run('BEGIN TRANSACTION');

                    const insertStmt = db.prepare(`
                        INSERT INTO mosques (name, address, latitude, longitude, commune, departement, cog)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `);

                    results.forEach(mosque => {
                        insertStmt.run([
                            mosque.name,
                            mosque.address,
                            mosque.latitude,
                            mosque.longitude,
                            mosque.commune,
                            mosque.departement,
                            mosque.cog
                        ]);
                        processedCount++;
                    });

                    insertStmt.finalize((err) => {
                        if (err) {
                            console.error('Error inserting mosque data:', err.message);
                            db.run('ROLLBACK');
                            return callback(err);
                        }

                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error committing mosque data:', err.message);
                                return callback(err);
                            }

                            console.log(`✓ Imported ${processedCount} mosques`);
                            callback(null);
                        });
                    });
                })
                .on('error', (error) => {
                    console.error('Error reading mosques CSV:', error.message);
                    callback(error);
                });
        });
    });
}

module.exports = { importMosques };
