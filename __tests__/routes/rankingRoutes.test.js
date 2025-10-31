const request = require('supertest');
const express = require('express');
const rankingRoutes = require('../../routes/rankingRoutes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn(),
  get: jest.fn()
}));

// Mock cache service
jest.mock('../../services/cacheService', () => ({
  get: jest.fn()
}));

const db = require('../../config/db');
const cacheService = require('../../services/cacheService');

const app = express();
app.use(express.json());
app.use('/api/rankings', rankingRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Ranking Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/rankings/communes', () => {
    it('should return commune rankings for a department', async() => {
      const mockCommunes = [
        {
          COG: '75001',
          departement: '75',
          commune: 'Paris 1er',
          population: 15000,
          insecurite_score: 5.2,
          immigration_score: 8.1,
          islamisation_score: 3.4,
          defrancisation_score: 2.1,
          wokisme_score: 1.8,
          total_score: 4.12
        }
      ];

      const mockCount = { total_count: 1 };

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCount);
      });

      const response = await request(app)
        .get('/api/rankings/communes?dept=75&limit=10&sort=insecurite_score&direction=DESC')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total_count');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.total_count).toBe(1);
      expect(response.body.data[0].COG).toBe('75001');
    });

    it('should handle population range filtering', async() => {
      const mockCommunes = [];
      const mockCount = { total_count: 0 };

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockCount);
      });

      await request(app)
        .get('/api/rankings/communes?dept=75&population_range=10000-50000')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND l.population >= 10000 AND l.population <= 50000'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should handle minimum population filtering', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, { total_count: 0 });
      });

      await request(app)
        .get('/api/rankings/communes?dept=75&population_range=50000%2B') // URL encoded +
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND l.population >= 50000'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should reject invalid population range format', async() => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=75&population_range=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('Format de population invalide');
    });

    it('should reject invalid population range values', async() => {
      const response = await request(app)
        .get('/api/rankings/communes?dept=75&population_range=100000-50000')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0].msg).toContain('Plage de population invalide');
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/rankings/communes?dept=75')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/rankings/departements', () => {
    it('should return department rankings', async() => {
      const mockDepartments = [
        {
          departement: '75',
          insecurite_score: 8.5,
          immigration_score: 7.2,
          islamisation_score: 6.1,
          defrancisation_score: 5.3,
          wokisme_score: 4.8
        },
        {
          departement: '13',
          insecurite_score: 7.8,
          immigration_score: 8.1,
          islamisation_score: 7.5,
          defrancisation_score: 6.2,
          wokisme_score: 5.1
        }
      ];

      cacheService.get.mockReturnValue({
        data: mockDepartments
      });

      const response = await request(app)
        .get('/api/rankings/departements?sort=insecurite_score&direction=DESC&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      // Should be sorted by insecurite_score DESC
      expect(response.body.data[0].departement).toBe('75');
      expect(response.body.data[1].departement).toBe('13');
    });

    it('should handle sorting in ascending order', async() => {
      const mockDepartments = [
        { departement: '75', insecurite_score: 8.5 },
        { departement: '13', insecurite_score: 7.8 }
      ];

      cacheService.get.mockReturnValue({
        data: mockDepartments
      });

      const response = await request(app)
        .get('/api/rankings/departements?sort=insecurite_score&direction=ASC')
        .expect(200);

      expect(response.body.data[0].departement).toBe('13'); // Lower score first
      expect(response.body.data[1].departement).toBe('75');
    });

    it('should handle missing cache data', async() => {
      cacheService.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/rankings/departements')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});