
const db = require('./config/db');
const fs = require('fs');
const csv = require('csv-parser');

function setupDatabase() {
  return new Promise((resolve, reject) => {
    // Create francocides table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS francocides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prenom TEXT NOT NULL,
        nom TEXT,
        age INTEGER,
        sexe TEXT NOT NULL,
        date_deces TEXT NOT NULL,
        cog TEXT NOT NULL,
        photo TEXT,
        resume TEXT,
        source1 TEXT,
        source2 TEXT,
        tags TEXT
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        return reject(err);
      }
      console.log('✓ Francocides table created/verified');

      // Create locations table for location data
      const createLocationsSQL = `
        CREATE TABLE IF NOT EXISTS locations (
          COG TEXT PRIMARY KEY,
          commune TEXT,
          departement TEXT,
          population INTEGER
        )
      `;

      db.run(createLocationsSQL, (err) => {
        if (err) {
          console.error('Error creating locations table:', err);
          return reject(err);
        }
        console.log('✓ Locations table created/verified');
        resolve();
      });
    });
  });
}

function importFrancocides() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync('francocides_valides.csv')) {
      console.log('No francocides data file found. Skipping import.');
      return resolve();
    }

    const francocidesData = [];
    
    fs.createReadStream('francocides_valides.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (row.prenom && row.sexe && row.date_deces && row.cog) {
          francocidesData.push({
            prenom: row.prenom || '',
            nom: row.nom || '',
            age: row.age ? parseInt(row.age) : null,
            sexe: row.sexe || '',
            date_deces: row.date_deces || '',
            cog: row.cog || '',
            photo: row.photo || null,
            resume: row.resume || null,
            source1: row.source1 || null,
            source2: row.source2 || null,
            tags: row.tags || null
          });
        }
      })
      .on('end', () => {
        if (francocidesData.length === 0) {
          console.log('No valid francocides data to import');
          return resolve();
        }

        const placeholders = francocidesData.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        const insertSQL = `INSERT INTO francocides (prenom, nom, age, sexe, date_deces, cog, photo, resume, source1, source2, tags) VALUES ${placeholders}`;

        const values = [];
        francocidesData.forEach(row => {
          values.push(
            row.prenom, row.nom, row.age, row.sexe, row.date_deces,
            row.cog, row.photo, row.resume, row.source1, row.source2, row.tags
          );
        });

        db.run(insertSQL, values, function(err) {
          if (err) {
            console.error('Error importing francocides:', err);
            return reject(err);
          }
          console.log(`✓ Imported ${francocidesData.length} francocides records`);
          resolve();
        });
      })
      .on('error', reject);
  });
}

// Run setup
setupDatabase()
  .then(() => importFrancocides())
  .then(() => {
    console.log('✓ Memorial database setup complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
