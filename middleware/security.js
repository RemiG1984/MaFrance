
const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MINUTES } = require('../constants');

// Additional security middleware for file uploads and large payloads
const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: 'Limite d\'upload atteinte'
});

// Sanitize input to prevent XSS
const sanitizeInput = (req, _res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Use safer string replacement instead of complex regex
      return obj.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        // Only sanitize own properties to prevent prototype pollution
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          obj[key] = sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  req.query = sanitize(req.query);
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);

  next();
};

module.exports = {
  uploadLimiter,
  sanitizeInput
};
