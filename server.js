require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const config = require("./config");
const db = require("./config/db");
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    ['https://your-domain.com'] : // Replace with your actual domain
    true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for search endpoints
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: 'Limite de recherche atteinte, veuillez attendre.',
});

// Middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Input sanitization
const { sanitizeInput } = require('./middleware/security');
app.use(sanitizeInput);
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

// Attach routes with search rate limiting where applicable
app.use("/api/communes", searchLimiter, communeRoutes);
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