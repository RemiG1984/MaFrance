require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const db = require("./config/db");
const app = express();

// Middleware
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

// Serve Vue.js built files
const distPath = path.resolve(__dirname, "dist");
app.use(express.static(distPath));

// Routes
const communeRoutes = require("./routes/communeRoutes");
const departementRoutes = require("./routes/departementRoutes");
const countryRoutes = require("./routes/countryRoutes");
const articleRoutes = require("./routes/articleRoutes");
const subventionRoutes = require('./routes/subventionRoutes');
const migrantRoutes = require('./routes/migrantRoutes');
const otherRoutes = require("./routes/otherRoutes");
const qpvRoutes = require("./routes/qpvRoutes");
const rankingRoutes = require("./routes/rankingRoutes");

// Make database available to all routes
app.locals.db = db;

// Attach routes
app.use("/api/communes", communeRoutes);
app.use("/api/departements", departementRoutes);
app.use("/api/country", countryRoutes);
app.use("/api/articles", articleRoutes);
app.use('/api/qpv', qpvRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/subventions', subventionRoutes);
app.use('/api/migrants', migrantRoutes);
app.use("/api", otherRoutes);

// Catch-all route: redirect non-API routes to root with original path
app.get('/{*path}', (req, res) => {
  const originalUrl = req.originalUrl === '/' ? '/' : req.originalUrl;
  console.log(`Redirecting ${originalUrl} to /?redirect=${encodeURIComponent(originalUrl)}`);
  res.redirect(`/?redirect=${encodeURIComponent(originalUrl)}`);
});

// Health check and root route
app.get("/", (req, res, next) => {
  if (req.headers["user-agent"]?.includes("GoogleHC")) {
    return res.status(200).send("OK");
  }
  const filePath = path.resolve(__dirname, "dist", "index.html");
  console.log(`Attempting to serve ${filePath} for root request`);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error serving ${filePath}:`, err);
      res.status(500).json({ error: err.message, details: null });
    }
  });
});

// Error handling
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(
    `Server running at http://${config.server.host}:${config.server.port}`,
  );
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Fermeture du serveur...");
  server.close(() => {
    console.log("Serveur arrêté");
    process.exit(0);
  });
});