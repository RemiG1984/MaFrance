const request = require('supertest');
const express = require('express');
const mosqueRoutes = require('../../routes/mosqueRoutes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn()
}));

// Mock cache middleware
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next())
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());
app.locals.db = db; // Provide db in app locals as expected by the route
app.use('/api/mosques', mosqueRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Mosque Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/mosques', () => {
    it('should return all mosques without filters', async() => {
      const mockMosques = [
        {
          id: 1,
          name: 'Mosque de Paris',
          address: '123 Main St',
          latitude: 48.8566,
          longitude: 2.3522,
          commune: 'Paris',
          departement: '75',
          cog: '75001'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosques);
      });

      const response = await request(app)
        .get('/api/mosques')
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).toEqual(mockMosques[0]);
      expect(response.body.pagination.hasMore).toBe(false);
      expect(response.body.pagination.nextCursor).toBe(null);
    });

    it('should filter by department', async() => {
      const mockMosques = [
        {
          id: 1,
          name: 'Mosque de Paris',
          address: '123 Main St',
          latitude: 48.8566,
          longitude: 2.3522,
          commune: 'Paris',
          departement: '75',
          cog: '75001'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosques);
      });

      await request(app)
        .get('/api/mosques?dept=75')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE departement = ?'),
        ['75', 21, 0],
        expect.any(Function)
      );
    });

    it('should filter by COG', async() => {
      const mockMosques = [
        {
          id: 1,
          name: 'Mosque de Paris',
          address: '123 Main St',
          latitude: 48.8566,
          longitude: 2.3522,
          commune: 'Paris',
          departement: '75',
          cog: '75001'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosques);
      });

      await request(app)
        .get('/api/mosques?cog=75001')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cog = ?'),
        ['75001', 21, 0],
        expect.any(Function)
      );
    });

    it('should reject requests with both dept and cog', async() => {
      const response = await request(app)
        .get('/api/mosques?dept=75&cog=75001')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Cannot specify both dept and cog'
      });
    });

    it('should handle pagination with cursor', async() => {
      const mockMosques = [
        {
          id: 101,
          name: 'Mosque de Paris',
          address: '123 Main St',
          latitude: 48.8566,
          longitude: 2.3522,
          commune: 'Paris',
          departement: '75',
          cog: '75001'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosques);
      });

      await request(app)
        .get('/api/mosques?cursor=100&limit=10')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        [11, 100],
        expect.any(Function)
      );
    });

    it('should handle pagination with hasMore', async() => {
      const mockMosques = Array(21).fill().map((_, i) => ({
        id: i + 1,
        name: `Mosque ${i + 1}`,
        address: '123 Main St',
        latitude: 48.8566,
        longitude: 2.3522,
        commune: 'Paris',
        departement: '75',
        cog: '75001'
      }));

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMosques);
      });

      const response = await request(app)
        .get('/api/mosques?limit=20')
        .expect(200);

      expect(response.body.list).toHaveLength(20);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(response.body.pagination.nextCursor).toBe(20);
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/mosques')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/mosques/closest', () => {
    it('should return closest mosques to coordinates', async() => {
      const mockResults = [
        {
          id: 1,
          name: 'Mosque de Paris',
          address: '123 Main St',
          latitude: 48.8566,
          longitude: 2.3522,
          commune: 'Paris',
          departement: '75',
          cog: '75001',
          distance_km: 0.5
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const response = await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0].distance_km).toBe(0.5);
    });

    it('should require latitude and longitude', async() => {
      const response = await request(app)
        .get('/api/mosques/closest')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Latitude and longitude are required'
      });
    });

    it('should validate coordinates are numbers', async() => {
      const response = await request(app)
        .get('/api/mosques/closest?lat=invalid&lng=2.3522')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid coordinates'
      });
    });

    it('should cap limit at 20', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522&limit=50')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        [48.8566, 48.8566, 2.3522, 20],
        expect.any(Function)
      );
    });

    it('should handle database errors for closest', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/mosques/closest?lat=48.8566&lng=2.3522')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});