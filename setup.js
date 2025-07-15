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
const csvFiles = config.setup.csvFiles;

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

// Function to delete CSV files after successful import
function deleteCsvFiles(files) {
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`Deleted ${file}`);
      } catch (err) {
        console.error(`Error deleting ${file}:`, err.message);
      }
    }
  });
}

function runImports() {
  const db = initializeDatabase();

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
                    process.exit(0);
                });
            });
        });