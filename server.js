require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const DB_PATH = process.env.DB_PATH || ".data/france.db";
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    }
    console.log("Connected to SQLite database");
});

// Store database instance in app locals
app.locals.db = db;

// Import routes
const countryRoutes = require("./routes/countryRoutes");
const departementRoutes = require("./routes/departementRoutes");
const communeRoutes = require("./routes/communeRoutes");
const qpvRoutes = require("./routes/qpvRoutes");
const articleRoutes = require("./routes/articleRoutes");
const debugRoutes = require("./routes/debugRoutes");
const otherRoutes = require("./routes/otherRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const subventionRoutes = require("./routes/subventionRoutes");
const migrantRoutes = require("./routes/migrantRoutes");

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html"))
        res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (filePath.endsWith(".css"))
        res.setHeader("Content-Type", "text/css; charset=utf-8");
      if (filePath.endsWith(".js"))
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    },
  }),
);

// Servir les fichiers Vue buildés
app.use(express.static(path.join(__dirname, "dist")));

// Attach routes
app.use("/api/communes", communeRoutes);
app.use("/api/departements", departementRoutes);
app.use("/api/country", countryRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/debug", debugRoutes);
app.use('/api/qpv', qpvRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/subventions', subventionRoutes);
app.use('/api/migrants', migrantRoutes);
app.use("/api", otherRoutes);
app.use("/api/rankings", rankingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    console.error("Stack trace:", err.stack);
    res.status(err.status || 500).json({
        error: err.message || "Une erreur interne s'est produite",
        ...(process.env.NODE_ENV === "development" && { details: err.details }),
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://0.0.0.0:${PORT} to view the application`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Fermeture du serveur...");
  server.close(() => {
    console.log("Serveur arrêté");
    process.exit(0);
  });
});