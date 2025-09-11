
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.details })
  });
};

module.exports = errorHandler;
