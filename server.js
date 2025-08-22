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
const compression = require("compression");
const cacheService = require("./services/cacheService");

// Enable compression
app.use(compression());

// Security middleware - simplified for Replit preview compatibility
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP completely
  frameguard: false, // Allow iframe embedding
  hsts: false, // Disable HSTS for development
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
  max: 200, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
//app.use('/api/', limiter);

// Stricter rate limit for search endpoints
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 searches per minute
  message: 'Limite de recherche atteinte, veuillez attendre.',
});

// Middleware
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Input sanitization
const { sanitizeInput } = require('./middleware/security');
app.use(sanitizeInput);
app.use(
  express.static(path.join(__dirname, "dist"), {
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
const publicPath = path.resolve(__dirname, "dist");
app.use(express.static(publicPath));

// Routes
const articleRoutes = require("./routes/articleRoutes");
const communeRoutes = require("./routes/communeRoutes");
const countryRoutes = require("./routes/countryRoutes");
const departementRoutes = require("./routes/departementRoutes");
const migrantRoutes = require("./routes/migrantRoutes");
const otherRoutes = require("./routes/otherRoutes");
const qpvRoutes = require("./routes/qpvRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const subventionRoutes = require("./routes/subventionRoutes");
const cacheRoutes = require("./routes/cacheRoutes");
const nat1Routes = require('./routes/nat1Routes');


// Make database available to all routes
app.locals.db = db;

// Attach routes with search rate limiting where applicable
//app.use("/api/communes", searchLimiter, communeRoutes);
app.use("/api/communes", communeRoutes);
app.use("/api/departements", departementRoutes);
app.use("/api/country", countryRoutes);
app.use("/api/articles", articleRoutes);
app.use('/api/qpv', qpvRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/subventions', subventionRoutes);
app.use('/api/migrants', migrantRoutes);
app.use('/api/nat1', nat1Routes);
app.use("/api", otherRoutes); // Keep this commented to test
app.use("/api/cache", cacheRoutes);

// Version endpoint for cache validation
app.get("/api/version", (req, res) => {
  // Generate build hash from package.json modification time or use environment variable
  const fs = require('fs');
  const packagePath = path.join(__dirname, 'package.json');
  
  let buildHash;
  try {
    const stats = fs.statSync(packagePath);
    buildHash = stats.mtime.getTime().toString();
  } catch (error) {
    buildHash = Date.now().toString();
  }
  
  res.json({
    buildHash: process.env.BUILD_HASH || buildHash,
    timestamp: Date.now(),
    version: require('./package.json').version
  });
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

// Handle Vue.js routing - serve index.html for non-API routes
app.get('/{*path}', (req, res) => {
  // Skip for API routes and static files
  if (req.originalUrl.startsWith('/api/') ||
      req.originalUrl.startsWith('/assets/') ||
      req.originalUrl.includes('.')) {
    return res.status(404).send('Not Found');
  }

  // Serve index.html for client-side routing
  const filePath = path.resolve(__dirname, "dist", "index.html");
  res.sendFile(filePath);
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