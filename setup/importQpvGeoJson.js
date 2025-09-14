
const fs = require('fs');

function importQpvGeoJson(db, callback) {
    const geoJsonPath = 'setup/qpv2024.json'; // You'll place your GeoJSON file here
    
    if (!fs.existsSync(geoJsonPath)) {
        console.log('QPV GeoJSON file not found, skipping...');
        return callback(null);
    }

    try {
        const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
        let processedCount = 0;
        const batchSize = 1000;
        let batch = [];

        console.log('Processing QPV GeoJSON data...');

        db.serialize(() => {
            // Create table for QPV coordinates
            db.run(`
                CREATE TABLE IF NOT EXISTS qpv_coordinates (
                    code_qp TEXT PRIMARY KEY,
                    lib_qp TEXT,
                    insee_com TEXT,
                    lib_com TEXT,
                    insee_dep TEXT,
                    lib_dep TEXT,
                    latitude REAL,
                    longitude REAL,
                    geometry TEXT
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating qpv_coordinates table:', err.message);
                    return callback(err);
                }

                db.run('BEGIN TRANSACTION');

                geoJsonData.features.forEach(feature => {
                    const props = feature.properties;
                    const geometry = feature.geometry;
                    
                    // Calculate centroid from geometry
                    const centroid = calculateCentroid(geometry);
                    
                    if (centroid) {
                        batch.push([
                            props.code_qp,
                            props.lib_qp,
                            props.insee_com,
                            props.lib_com,
                            props.insee_dep,
                            props.lib_dep,
                            centroid.lat,
                            centroid.lng,
                            JSON.stringify(geometry)
                        ]);
                        processedCount++;

                        if (batch.length >= batchSize) {
                            insertBatch(db, batch);
                            batch = [];
                        }
                    }
                });

                // Insert remaining batch
                if (batch.length > 0) {
                    insertBatch(db, batch);
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing QPV coordinates:', err.message);
                        db.run('ROLLBACK');
                        return callback(err);
                    }
                    
                    console.log(`Imported ${processedCount} QPV coordinates`);
                    callback(null);
                });
            });
        });

    } catch (error) {
        console.error('Error reading QPV GeoJSON file:', error.message);
        callback(error);
    }
}

function insertBatch(db, batch) {
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const flatBatch = [].concat(...batch);
    
    db.run(
        `INSERT OR REPLACE INTO qpv_coordinates (
            code_qp, lib_qp, insee_com, lib_com, insee_dep, lib_dep, 
            latitude, longitude, geometry
        ) VALUES ${placeholders}`,
        flatBatch,
        (err) => {
            if (err) {
                console.error('Error inserting QPV coordinates batch:', err.message);
            }
        }
    );
}

function calculateCentroid(geometry) {
    try {
        if (geometry.type === 'MultiPolygon') {
            // For MultiPolygon, use the first polygon's first ring
            const coordinates = geometry.coordinates[0][0];
            return getPolygonCentroid(coordinates);
        } else if (geometry.type === 'Polygon') {
            const coordinates = geometry.coordinates[0];
            return getPolygonCentroid(coordinates);
        }
        return null;
    } catch (error) {
        console.error('Error calculating centroid:', error);
        return null;
    }
}

function getPolygonCentroid(coordinates) {
    let x = 0, y = 0;
    const len = coordinates.length;
    
    coordinates.forEach(coord => {
        x += coord[0]; // longitude
        y += coord[1]; // latitude
    });
    
    return {
        lng: x / len,
        lat: y / len
    };
}

module.exports = { importQpvGeoJson };
