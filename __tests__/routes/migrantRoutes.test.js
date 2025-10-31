const request = require('supertest');
const express = require('express');
const migrantRoutes = require('../../routes/migrantRoutes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn()
}));

// Mock cache middleware
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next())
}));

const db = require('../../config/db');
// const { cacheMiddleware } = require('../../middleware/cache'); // Not used in this test

const app = express();
app.use(express.json());
app.locals.db = db; // Provide db in app locals as expected by the route
app.use('/api/migrants', migrantRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Migrant Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/migrants', () => {
    it('should return all migrant centers without filters', async() => {
      const mockCenters = [
        {
          rowid: 1,
          type: 'CADA',
          gestionnaire: 'OFPRA',
          adresse: '123 Main St',
          places: 50,
          COG: '75001',
          departement: '75',
          commune_name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCenters);
      });

      const response = await request(app)
        .get('/api/migrants')
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).toEqual({
        type: 'CADA',
        gestionnaire: 'OFPRA',
        adresse: '123 Main St',
        places: 50,
        COG: '75001',
        departement: '75',
        commune: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      });
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should filter by department', async() => {
      const mockCenters = [
        {
          rowid: 1,
          type: 'CADA',
          gestionnaire: 'OFPRA',
          adresse: '123 Main St',
          places: 50,
          COG: '75001',
          departement: '75',
          commune_name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCenters);
      });

      await request(app)
        .get('/api/migrants?dept=75')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mc.departement = ?'),
        ['75', 21, 0],
        expect.any(Function)
      );
    });

    it('should filter by COG', async() => {
      const mockCenters = [
        {
          rowid: 1,
          type: 'CADA',
          gestionnaire: 'OFPRA',
          adresse: '123 Main St',
          places: 50,
          COG: '75001',
          departement: '75',
          commune_name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCenters);
      });

      await request(app)
        .get('/api/migrants?cog=75001')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mc.COG = ?'),
        ['75001', 21, 0],
        expect.any(Function)
      );
    });

    it('should reject requests with both dept and cog', async() => {
      const response = await request(app)
        .get('/api/migrants?dept=75&cog=75001')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Cannot specify both dept and cog'
      });
    });

    it('should handle pagination with cursor', async() => {
      const mockCenters = [
        {
          rowid: 101,
          type: 'CADA',
          gestionnaire: 'OFPRA',
          adresse: '123 Main St',
          places: 50,
          COG: '75001',
          departement: '75',
          commune_name: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCenters);
      });

      await request(app)
        .get('/api/migrants?cursor=100&limit=10')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        [11, 100],
        expect.any(Function)
      );
    });

    it('should handle pagination with hasMore', async() => {
      const mockCenters = Array(21).fill().map((_, i) => ({
        rowid: i + 1,
        type: 'CADA',
        gestionnaire: 'OFPRA',
        adresse: '123 Main St',
        places: 50,
        COG: '75001',
        departement: '75',
        commune_name: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522
      }));

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCenters);
      });

      const response = await request(app)
        .get('/api/migrants?limit=20')
        .expect(200);

      expect(response.body.list).toHaveLength(20);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBe(20);
    });

    it('should reject invalid limit values', async() => {
      const response = await request(app)
        .get('/api/migrants?limit=5000')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('Limit doit être un entier entre 1 et 3000');
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/migrants')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

  });
});