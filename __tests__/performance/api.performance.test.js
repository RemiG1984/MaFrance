const request = require('supertest');
const express = require('express');

// Import route modules for performance testing
const countryRoutes = require('../../routes/countryRoutes');
const departementRoutes = require('../../routes/departementRoutes');
const communeRoutes = require('../../routes/communeRoutes');
const articleRoutes = require('../../routes/articleRoutes');
const cacheRoutes = require('../../routes/cacheRoutes');

// Mock the database for performance tests
jest.mock('../../config/db');

// Mock services
jest.mock('../../services/cacheService', () => ({
  getStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
  clear: jest.fn(),
  initializeCache: jest.fn().mockResolvedValue()
}));

jest.mock('../../services/searchService', () => ({
  searchCommunes: jest.fn().mockResolvedValue([]),
  searchCommunesGlobally: jest.fn().mockResolvedValue([]),
  getCommuneSuggestions: jest.fn().mockResolvedValue([])
}));

jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn(() => (_req, _res, next) => next())
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());

// Mount routes
app.use('/api/country', countryRoutes);
app.use('/api/departement', departementRoutes);
app.use('/api/commune', communeRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/cache', cacheRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('API Performance Tests', () => {
  beforeAll(() => {
    // Mock database responses for performance testing
    db.all.mockImplementation((_sql, _params, callback) => {
      // Simulate some processing time with immediate callback
      callback(null, [
        { country: 'France', population: 67000000 },
        { country: 'Germany', population: 83000000 }
      ]);
    });

    db.get.mockImplementation((_sql, _params, callback) => {
      callback(null, { country: 'France', population: 67000000 });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Response Time Benchmarks', () => {
    it('should respond to country details within acceptable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/country/details')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
      console.log(`Country details response time: ${responseTime}ms`);
    });

    it('should respond to department details within acceptable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/departement/details?dept=75')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
      console.log(`Department details response time: ${responseTime}ms`);
    });

    it('should respond to commune search within acceptable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/commune/search?dept=75&q=paris')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
      console.log(`Commune search response time: ${responseTime}ms`);
    });

    it('should respond to articles endpoint within acceptable time', async() => {
      // Mock the counts query
      db.get.mockImplementationOnce((_sql, _params, callback) => {
        callback(null, {
          insecurite_count: 5,
          immigration_count: 3,
          islamisme_count: 2,
          defrancisation_count: 1,
          wokisme_count: 4,
          total_count: 15
        });
      });

      // Mock the articles query
      db.all.mockImplementationOnce((_sql, _params, callback) => {
        callback(null, []);
      });

      const startTime = Date.now();

      await request(app)
        .get('/api/articles?dept=75')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 50ms
      expect(responseTime).toBeLessThan(50);
      console.log(`Articles response time: ${responseTime}ms`);
    });

    it('should respond to cache stats within acceptable time', async() => {
      const startTime = Date.now();

      await request(app)
        .get('/api/cache/stats')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 50ms (simple operation)
      expect(responseTime).toBeLessThan(50);
      console.log(`Cache stats response time: ${responseTime}ms`);
    });
  });

  describe('Concurrent Load Simulation', () => {
    it('should handle multiple concurrent requests', async() => {
      const startTime = Date.now();

      // Make 10 concurrent requests
      const promises = Array(10).fill().map(() =>
        request(app).get('/api/country/details').expect(200)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should complete within 500ms
      expect(totalTime).toBeLessThan(500);
      console.log(`10 concurrent requests total time: ${totalTime}ms`);
    });
  });
});