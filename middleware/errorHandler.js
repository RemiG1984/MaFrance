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
const handleDatabaseError = (err, res) => {
  const error = new DatabaseError('Erreur lors de la requête à la base de données', err.message);
  res.status(error.status).json({
    error: error.message,
    details: process.env.NODE_ENV === 'production' ? null : error.details
  });
};

const handleValidationError = (err, res) => {
  const error = new ValidationError(err.message || 'Erreur de validation', err.details);
  res.status(error.status).json({
    error: error.message,
    details: process.env.NODE_ENV === 'production' ? null : error.details
  });
};

const createDbHandler = (res) => (err, result) => {
  if (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  } else {
    res.json(result);
  }
};

const errorHandler = (err, _req, res) => {
  // Don't expose internal errors in production
  const isProd = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    error: isProd ? 'Erreur serveur interne' : (err.message || 'Erreur serveur'),
    details: isProd ? null : err.details
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
