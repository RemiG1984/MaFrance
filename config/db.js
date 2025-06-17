const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
  process.env.DB_PATH || ".data/france.db",
  (err) => {
    if (err) {
      console.error("Database connection error:", err.message);
      process.exit(1);
    }
    console.log("Connected to SQLite database");
  },
);

process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Erreur fermeture base:", err.message);
    }
    console.log("Base de données fermée");
  });
});

module.exports = db;
