const cacheService = require('../services/cacheService');

/**
 * Cache middleware that checks cache first, and caches the result
 * @param {function} getCacheKey - Function that takes req and returns cache key
 * @returns {function} Express middleware
 */
const cacheMiddleware = (getCacheKey) => {
  return (req, res, next) => {
    const cacheKey = getCacheKey(req);

    // Try to get cached data first
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original json method
    const originalJson = res.json;

    // Override res.json to cache the result before sending
    res.json = function(data) {
      // Cache the result
      cacheService.set(cacheKey, data);

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = {
  cacheMiddleware
};