const request = require('supertest');
const express = require('express');
const articleRoutes = require('../../routes/articleRoutes');
const { HTTP_OK, GLOBAL_SEARCH_LIMIT } = require('../../constants');

// Mock the database
jest.mock('../../config/db', () => ({
  get: jest.fn(),
  all: jest.fn()
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());
app.use('/api/articles', articleRoutes);

// Error handling middleware for tests
app.use((err, _req, res, _next) => {
  console.error('Test error:', err);
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Article Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/articles', () => {
    it('should return articles with counts and pagination', async() => {
      const mockCountRow = {
        insecurite_count: 5,
        immigration_count: 3,
        islamisme_count: 2,
        defrancisation_count: 1,
        wokisme_count: 4,
        total_count: 15
      };

      const mockArticles = [
        {
          rowid: 1,
          date: '2023-01-01',
          title: 'Test Article',
          url: 'http://example.com',
          lieu: 'Paris',
          commune: 'Paris',
          departement: '75',
          insecurite: 1,
          immigration: 0,
          islamisme: 0,
          defrancisation: 0,
          wokisme: 0
        }
      ];

      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, mockCountRow);
      });

      db.all.mockImplementation((_sql, _params, callback) => {
        callback(null, mockArticles);
      });

      const response = await request(app)
        .get('/api/articles?dept=75&limit=10')
        .expect(HTTP_OK);

      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('counts');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.counts.total).toBe(GLOBAL_SEARCH_LIMIT);
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).not.toHaveProperty('rowid');
    });

    it('should filter by category', async() => {
      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, {
          insecurite_count: 5,
          immigration_count: 3,
          islamisme_count: 2,
          defrancisation_count: 1,
          wokisme_count: 4,
          total_count: 15
        });
      });

      db.all.mockImplementation((_sql, _params, callback) => {
        callback(null, []);
      });

      await request(app)
        .get('/api/articles?dept=75&category=insecurite')
        .expect(HTTP_OK);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND insecurite = 1'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should handle cursor pagination', async() => {
      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, {
          insecurite_count: 5,
          immigration_count: 3,
          islamisme_count: 2,
          defrancisation_count: 1,
          wokisme_count: 4,
          total_count: 15
        });
      });

      db.all.mockImplementation((_sql, _params, callback) => {
        callback(null, []);
      });

      await request(app)
        .get('/api/articles?dept=75&cursor=100&limit=5')
        .expect(HTTP_OK);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND rowid > ?'),
        ['75', '100', 6],
        expect.any(Function)
      );
    });

    it('should handle database errors', async() => {
      db.get.mockImplementation((_sql, _params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/articles?dept=75')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/articles/counts', () => {
    it('should return category counts for department', async() => {
      const mockRow = {
        insecurite_count: 5,
        immigration_count: 3,
        islamisme_count: 2,
        defrancisation_count: 1,
        wokisme_count: 4
      };

      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, mockRow);
      });

      const response = await request(app)
        .get('/api/articles/counts?dept=75')
        .expect(HTTP_OK);

      expect(response.body).toEqual({
        insecurite: 5,
        immigration: 3,
        islamisme: 2,
        defrancisation: 1,
        wokisme: 4
      });
    });

    it('should filter by cog and lieu', async() => {
      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, {
          insecurite_count: 2,
          immigration_count: 1,
          islamisme_count: 0,
          defrancisation_count: 0,
          wokisme_count: 1
        });
      });

      await request(app)
        .get('/api/articles/counts?dept=75&cog=75056&lieu=Paris')
        .expect(HTTP_OK);

      expect(db.get).toHaveBeenCalledWith(
        expect.stringContaining('AND COG = ?'),
        ['75', '75056', '%Paris%'],
        expect.any(Function)
      );
    });
  });

  describe('GET /api/articles/lieux', () => {
    it('should return distinct lieux for cog', async() => {
      const mockRows = [
        { lieu: 'Paris 1er' },
        { lieu: 'Paris 2e' },
        { lieu: 'Paris 3e' }
      ];

      db.all.mockImplementation((_sql, _params, callback) => {
        callback(null, mockRows);
      });

      const response = await request(app)
        .get('/api/articles/lieux?cog=75056&lieu=test')
        .expect(HTTP_OK);

      expect(response.body).toEqual([
        { lieu: 'Paris 1er' },
        { lieu: 'Paris 2e' },
        { lieu: 'Paris 3e' }
      ]);

      expect(db.all).toHaveBeenCalledWith(
        'SELECT DISTINCT lieu FROM lieux WHERE cog = ? ORDER BY lieu',
        ['75056'],
        expect.any(Function)
      );
    });

    it('should handle database errors for lieux', async() => {
      db.all.mockImplementation((_sql, _params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/articles/lieux?cog=75056&lieu=test')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});