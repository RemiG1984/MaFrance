require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

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
app.use("/api/country", require("./routes/countryRoutes"));
app.use("/api/departements", require("./routes/departementRoutes"));
app.use("/api/communes", require("./routes/communeRoutes"));
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api", require("./routes/otherRoutes"));

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
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Fermeture du serveur...");
  server.close(() => {
    console.log("Serveur arrêté");
    process.exit(0);
  });
});
