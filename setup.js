
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const config = require("./config");
const { importScores } = require('./setup/importScores');
const { importArticles } = require('./setup/importArticles');
const { importElus } = require('./setup/importElus');
const { importNames } = require('./setup/importNames');
const { importCrimeData } = require('./setup/importCrimeData');
const { importQPV } = require('./setup/importQPV');

const dbFile = config.database.path;

// Initialize SQLite database
function initializeDatabase() {
  if (fs.existsSync(dbFile)) {
    try {
      fs.unlinkSync(dbFile);
      console.log("Existing .data/france.db deleted");
    } catch (err) {
      console.error("Error deleting existing .data/france.db:", err.message);
      process.exit(1);
    }
  }
  return new sqlite3.Database(dbFile);
}

function runImports() {
  const db = initializeDatabase();

  importScores(db, (err) => {
    if (err) {
      console.error('Échec importation scores:', err.message);
      process.exit(1);
    }
    console.log('✓ Importation scores terminée');

    importArticles(db, (err) => {
      if (err) {
        console.error('Échec importation articles:', err.message);
        process.exit(1);
      }
      console.log('✓ Importation articles terminée');

      importElus(db, (err) => {
        if (err) {
          console.error('Échec importation élus:', err.message);
          process.exit(1);
        }
        console.log('✓ Importation élus terminée');

        importNames(db, (err) => {
          if (err) {
            console.error('Échec importation noms:', err.message);
            process.exit(1);
          }
          console.log('✓ Importation noms terminée');

          importCrimeData(db, (err) => {
            if (err) {
              console.error('Échec importation données criminalité:', err.message);
              process.exit(1);
            }
            console.log('✓ Importation données criminalité terminée');

            importQPV(db, (err) => {
              if (err) {
                console.error('Échec importation données QPV:', err.message);
                process.exit(1);
              }
              console.log('✓ Importation données QPV terminée');
              console.log('🎉 Configuration de la base de données terminée !');
              db.close();
              process.exit(0);
            });
          });
        });
      });
    });
  });
}

runImports();
