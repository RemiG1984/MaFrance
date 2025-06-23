const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const { importScores } = require("./setup/importScores");
const { importArticles } = require("./setup/importArticles");
const { importNames } = require("./setup/importNames");
const { importCrimeData } = require("./setup/importCrimeData");
const { importElus } = require("./setup/importElus");

const dbFile = ".data/france.db";

// List of CSV files associated with each import function
const csvFiles = {
  importScores: [
    "setup/france_scores.csv",
    "setup/departement_scores.csv",
    "setup/commune_scores.csv",
  ],
  importArticles: ["setup/fdesouche_analyzed.csv"],
  importNames: [
    "setup/analyse_prenom_france.csv",
    "setup/analyse_prenom_departement.csv",
    "setup/analyse_prenom_commune.csv",
  ],
  importCrimeData: [
    "setup/crime_data_france.csv",
    "setup/crime_data_departement.csv",
    "setup/crime_data_commune.csv",
  ],
  importElus: [
    "setup/maires_list.csv",
    "setup/prefets_list.csv",
    "setup/ministre_interieur_list.csv",
  ],
};

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
      console.error("Importation stoppée après crime data:", err.message);
      db.close((closeErr) => {
        if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
        process.exit(1);
      });
      return;
    }
    //deleteCsvFiles(csvFiles.importCrimeData); // Delete crime data CSVs
    importArticles(db, (err) => {
      if (err) {
        console.error("Importation stoppée après articles:", err.message);
        db.close((closeErr) => {
          if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
          process.exit(1);
        });
        return;
      }
      //deleteCsvFiles(csvFiles.importArticles); // Delete articles CSV
      importScores(db, (err) => {
        if (err) {
          console.error("Importation stoppée après scores:", err.message);
          db.close((closeErr) => {
            if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
            process.exit(1);
          });
          return;
        }
        //deleteCsvFiles(csvFiles.importScores); // Delete score-related CSVs
        importNames(db, (err) => {
          if (err) {
            console.error("Importation stoppée après names:", err.message);
            db.close((closeErr) => {
              if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
              process.exit(1);
            });
            return;
          }
          //deleteCsvFiles(csvFiles.importNames); // Delete names CSVs
          importElus(db, (err) => {
            if (err) {
              console.error("Importation stoppée après élus:", err.message);
              db.close((closeErr) => {
                if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
                process.exit(1);
              });
              return;
            }
            //deleteCsvFiles(csvFiles.importElus); // Delete elus CSVs
            db.close((closeErr) => {
              if (closeErr) console.error("Erreur fermeture base:", closeErr.message);
              console.log("Importation complète terminée");
              process.exit(err ? 1 : 0);
            });
          });
        });
      });
    });
  });
}

runImports();
