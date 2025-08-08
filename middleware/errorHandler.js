const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);
  
  // Don't expose internal errors in production
  const isProd = process.env.NODE_ENV === 'production';
  
  res.status(err.status || 500).json({
    error: isProd ? "Erreur serveur interne" : (err.message || "Erreur serveur"),
    details: isProd ? null : err.details,
  });
};
module.exports = errorHandler;
