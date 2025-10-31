// Mock the cache service
jest.mock('../../services/cacheService', () => ({
  getStats: jest.fn(),
  clear: jest.fn(),
  initializeCache: jest.fn()
}));

// Mock the cache middleware
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn((_keyFn) => (_req, _res, next) => {
    // For testing, just call next
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const cacheRoutes = require('../../routes/cacheRoutes');
const cacheService = require('../../services/cacheService');
// const { cacheMiddleware } = require('../../middleware/cache'); // Not used in tests

const app = express();
app.use(express.json());
app.use('/api/cache', cacheRoutes);

// Error handling middleware for tests
app.use((err, _req, res, _next) => {
  console.error('Test error:', err);
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Cache Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics', async() => {
      const mockStats = {
        hits: 100,
        misses: 20,
        size: 5,
        keys: ['key1', 'key2']
      };

      cacheService.getStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200);

      expect(response.body).toEqual(mockStats);
      expect(cacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('POST /api/cache/clear', () => {
    it('should clear the cache successfully', async() => {
      cacheService.clear.mockReturnValue();

      const response = await request(app)
        .post('/api/cache/clear')
        .expect(200);

      expect(response.body).toEqual({ message: 'Cache cleared successfully' });
      expect(cacheService.clear).toHaveBeenCalled();
    });
  });

  describe('POST /api/cache/refresh', () => {
    it('should refresh cache successfully', async() => {
      cacheService.initializeCache.mockResolvedValue();

      const response = await request(app)
        .post('/api/cache/refresh')
        .expect(200);

      expect(response.body).toEqual({ message: 'Cache refreshed successfully' });
      expect(cacheService.initializeCache).toHaveBeenCalled();
    });

    it('should handle refresh errors', async() => {
      const errorMessage = 'Database connection failed';
      cacheService.initializeCache.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/api/cache/refresh')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to refresh cache',
        details: errorMessage
      });
      expect(cacheService.initializeCache).toHaveBeenCalled();
    });
  });
});