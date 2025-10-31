const express = require('express');
const db = require('../../config/db');
const { cacheMiddleware } = require('../../middleware/cache');
const { NotFoundError, DatabaseError } = require('../../middleware/errorHandler');
// Simple logger fallback if utils/logger doesn't exist
const logError = (error, context = {}) => {
  console.error('Error:', error.message, context);
};

/**
 * Base route factory class that provides common functionality for all API routes
 * Handles middleware setup, error handling patterns, and common utilities
 */
class BaseRoute {
  constructor(options = {}) {
    this.router = express.Router();
    this.options = {
      enableCache: options.enableCache || false,
      cachePrefix: options.cachePrefix || '',
      enableValidation: options.enableValidation !== false, // Default true
      ...options
    };

    // Common middleware imports (lazy loaded to avoid circular dependencies)
    this._middleware = {};
  }

  /**
   * Get middleware by name (lazy loading to avoid circular dependencies)
   */
  getMiddleware(name) {
    if (!this._middleware[name]) {
      switch (name) {
        case 'validate':
          this._middleware.validate = require('../../middleware/validate');
          break;
        case 'errorHandler':
          this._middleware.errorHandler = require('../../middleware/errorHandler');
          break;
        case 'cache':
          this._middleware.cache = require('../../middleware/cache');
          break;
        default:
          throw new Error(`Unknown middleware: ${name}`);
      }
    }
    return this._middleware[name];
  }

  /**
   * Create a standard route handler with common error handling
   * @param {Function} handler - The route handler function
   * @param {Object} options - Handler options
   * @returns {Function} Express route handler
   */
  createHandler(handler, options = {}) {
    return async (req, res, next) => {
      try {
        const result = await handler(req, res);
        if (result !== undefined) {
          res.json(result);
        }
      } catch (error) {
        this.handleError(error, req);
        next(error);
      }
    };
  }

  /**
   * Handle errors with consistent logging
   */
  handleError(error, req) {
    const context = {
      route: req.route?.path || req.path,
      method: req.method,
      correlationId: req.correlationId,
      query: req.query,
      params: req.params,
      body: req.body
    };

    logError(error, context);
  }

  /**
   * Create a database query handler with standard error handling
   * @param {Function} queryFn - Function that returns { sql, params }
   * @param {Object} options - Query options
   * @returns {Function} Express route handler
   */
  createDbHandler(queryFn, options = {}) {
    return async (req) => {
      const { sql, params } = queryFn(req);

      return new Promise((resolve, reject) => {
        const callback = (err, rows) => {
          if (err) {
            reject(new DatabaseError(
              options.errorMessage || 'Database query failed',
              err.message,
              { sql, params, correlationId: req.correlationId }
            ));
            return;
          }

          if (options.requireResults && (!rows || rows.length === 0)) {
            reject(new NotFoundError(
              options.notFoundMessage || 'No results found',
              { sql, params, correlationId: req.correlationId }
            ));
            return;
          }

          resolve(rows);
        };

        if (options.useGet) {
          db.get(sql, params, callback);
        } else {
          db.all(sql, params, callback);
        }
      });
    };
  }

  /**
   * Create a cached route handler
   * @param {Function} handler - The route handler
   * @param {Function} cacheKeyFn - Function to generate cache key
   * @param {Object} options - Cache options
   * @returns {Function} Express route handler
   */
  createCachedHandler(handler, cacheKeyFn, options = {}) {
    if (!this.options.enableCache) {
      return this.createHandler(handler, options);
    }

    const cacheKey = cacheKeyFn || ((req) => `${this.options.cachePrefix}_${req.path}`);
    const cacheHandler = this.getMiddleware('cache').cacheMiddleware(cacheKey);

    return [cacheHandler, this.createHandler(handler, options)];
  }

  /**
   * Add validation middleware to a route
   * @param {Array} validators - Array of validator functions
   * @returns {Array} Middleware array
   */
  withValidation(validators) {
    if (!this.options.enableValidation) {
      return [];
    }

    return validators;
  }

  /**
   * Create a standard GET route with optional caching and validation
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {Object} options - Route options
   */
  get(path, handler, options = {}) {
    const middleware = [];

    // Add validation if specified
    if (options.validators) {
      middleware.push(...this.withValidation(options.validators));
    }

    // Add caching if enabled
    if (options.cacheKey) {
      const cachedHandler = this.createCachedHandler(handler, options.cacheKey, options);
      this.router.get(path, ...middleware, ...cachedHandler);
    } else {
      middleware.push(this.createHandler(handler, options));
      this.router.get(path, ...middleware);
    }
  }

  /**
   * Create a standard POST route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {Object} options - Route options
   */
  post(path, handler, options = {}) {
    const middleware = [];

    if (options.validators) {
      middleware.push(...this.withValidation(options.validators));
    }

    middleware.push(this.createHandler(handler, options));
    this.router.post(path, ...middleware);
  }

  /**
   * Get the configured router
   * @returns {express.Router} The configured router
   */
  getRouter() {
    return this.router;
  }

  /**
   * Utility method to create standard query parameters
   * @param {Object} req - Express request object
   * @param {Array} allowedParams - Array of allowed parameter names
   * @returns {Object} Filtered parameters object
   */
  extractQueryParams(req, allowedParams = []) {
    const params = {};
    allowedParams.forEach(param => {
      if (req.query[param] !== undefined) {
        params[param] = req.query[param];
      }
    });
    return params;
  }

  /**
   * Utility method to create standard SQL WHERE clauses
   * @param {Object} conditions - Object with column-value pairs
   * @returns {Object} { where: string, params: array }
   */
  buildWhereClause(conditions) {
    const whereParts = [];
    const params = [];

    Object.entries(conditions).forEach(([column, value]) => {
      if (value !== undefined && value !== null) {
        whereParts.push(`${column} = ?`);
        params.push(value);
      }
    });

    return {
      where: whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '',
      params
    };
  }
}

module.exports = BaseRoute;