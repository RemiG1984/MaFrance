const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const config = require('./config');
const { importScores } = require('./setup/importScores');
const { importArticles } = require('./setup/importArticles');
const { importElus } = require('./setup/importElus');
const { importNames } = require('./setup/importNames');
const { importCrimeData } = require('./setup/importCrimeData');
const { importQPV } = require('./setup/importQPV');
const { importQpvGeoJson } = require('./setup/importQpvGeoJson.js');
const { importSubventions } = require('./setup/importSubventions');
const { importMigrants } = require('./setup/importMigrants');
const { importNat1 } = require('./setup/importNat1');
const { importMosques } = require('./setup/importMosques');

const dbFile = config.database.path;

// Initialize SQLite database
function initializeDatabase() {
  // Create .data directory if it doesn't exist
  const path = require('path');
  const dbDir = path.dirname(dbFile);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbFile)) {
    try {
      fs.unlinkSync(dbFile);
    } catch {
      process.exit(1);
    }
  }
  return new sqlite3.Database(dbFile);
}

function runImports() {
  const db = initializeDatabase();

  const imports = [
    { name: 'scores', fn: importScores },
    { name: 'articles', fn: importArticles },
    { name: 'élus', fn: importElus },
    { name: 'noms', fn: importNames },
    { name: 'données criminalité', fn: importCrimeData },
    { name: 'données QPV', fn: importQPV },
    { name: 'QPV GeoJSON', fn: importQpvGeoJson },
    { name: 'données subventions', fn: importSubventions },
    { name: 'données centres migrants', fn: importMigrants },
    { name: 'données mosquées', fn: importMosques },
    { name: 'données NAT1', fn: importNat1 }
  ];

  function runNextImport(index) {
    if (index >= imports.length) {
      // All imports completed, create search indexes
      createSearchIndexes()
        .then(() => {
          db.close();
          process.exit(0);
        })
        .catch((_indexErr) => {
          db.close();
          process.exit(1);
        });
      return;
    }

    const { fn } = imports[index];
    fn(db, (err) => {
      if (err) {
        process.exit(1);
      }
      runNextImport(index + 1);
    });
  }

  runNextImport(0);
}

runImports();

// Create indexes for better search performance
async function createSearchIndexes() {
  return new Promise((resolve, reject) => {
    const sqlite = require('sqlite3').verbose();
    const indexDb = new sqlite.Database(config.database.path);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_locations_commune ON locations(commune)',
      'CREATE INDEX IF NOT EXISTS idx_locations_dept_commune ON locations(departement, commune)',
      'CREATE INDEX IF NOT EXISTS idx_locations_search ON locations(commune COLLATE NOCASE)'
    ];

    let completed = 0;

    indexes.forEach(indexQuery => {
      indexDb.run(indexQuery, (err) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === indexes.length) {
          indexDb.close();
          resolve();
        }
      });
    });
  });
}