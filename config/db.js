
const sqlite3 = require("sqlite3").verbose();
const config = require('./index');

const db = new sqlite3.Database(
  config.database.path,
  (err) => {
    if (err) {
      console.error("Database connection error:", err.message);
      process.exit(1);
    }
    console.log("Connected to SQLite database");
  },
);

// Set database timeout
db.configure("busyTimeout", config.api.timeouts.connection);

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Erreur fermeture base:", err.message);
    }
    console.log("Base de données fermée");
  });
});

module.exports = db;
