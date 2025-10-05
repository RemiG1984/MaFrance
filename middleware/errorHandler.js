// Error classes
class DatabaseError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'DatabaseError';
    this.status = 500;
    this.details = details;
  }
}

class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

// Error handling functions
const handleDatabaseError = (err, res, next) => {
  console.error("Database error:", err.message);
  const error = new DatabaseError("Erreur lors de la requête à la base de données", err.message);
  if (next) {
    next(error);
  } else {
    res.status(error.status).json({
      error: error.message,
      details: process.env.NODE_ENV === 'production' ? null : error.details,
    });
  }
};

const handleValidationError = (err, res, next) => {
  console.error("Validation error:", err.message);
  const error = new ValidationError(err.message || "Erreur de validation", err.details);
  if (next) {
    next(error);
  } else {
    res.status(error.status).json({
      error: error.message,
      details: process.env.NODE_ENV === 'production' ? null : error.details,
    });
  }
};

const createDbHandler = (res, next) => {
  return (err) => {
    if (err) {
      handleDatabaseError(err, res, next);
    }
  };
};

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  // Don't expose internal errors in production
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? "Erreur serveur interne" : (err.message || "Erreur serveur"),
    details: isProd ? null : err.details,
  });
};

module.exports = {
  errorHandler,
  DatabaseError,
  ValidationError,
  handleDatabaseError,
  handleValidationError,
  createDbHandler
};
