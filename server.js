require("dotenv").config();
const express = require("express");
const path = require("path");
const config = require("./config");
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

// Routes
const communeRoutes = require("./routes/communeRoutes");
const departementRoutes = require("./routes/departementRoutes");
const countryRoutes = require("./routes/countryRoutes");
const articleRoutes = require("./routes/articleRoutes");
const debugRoutes = require("./routes/debugRoutes");
const subventionRoutes = require('./routes/subventionRoutes');
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
app.use("/api/debug", debugRoutes);
app.use('/api/qpv', qpvRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/subventions', subventionRoutes);
app.use("/api", otherRoutes);
app.use("/api/rankings", rankingRoutes);

// Error handling
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

// Health check
app.get("/", (req, res) => {
  if (req.headers["user-agent"]?.includes("GoogleHC")) {
    return res.status(200).send("OK");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

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