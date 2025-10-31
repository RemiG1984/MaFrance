const request = require('supertest');
const express = require('express');
const otherRoutes = require('../../routes/otherRoutes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn()
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());
app.use('/api', otherRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Other Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/search', () => {
    it('should search communes by name within department', async() => {
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
          number_of_mosques: 2,
          mosque_p100k: 13.3,
          total_qpv: 1,
          pop_in_qpv_pct: 15.2
        },
        {
          COG: '75002',
          departement: '75',
          commune: 'Paris 2e',
          population: 20000,
          insecurite_score: 4.8,
          immigration_score: 7.5,
          islamisation_score: 2.9,
          defrancisation_score: 1.9,
          wokisme_score: 2.2,
          number_of_mosques: 1,
          mosque_p100k: 5.0,
          total_qpv: 0,
          pop_in_qpv_pct: 0.0
        },
        {
          COG: '75003',
          departement: '75',
          commune: 'Paris 3e',
          population: 18000,
          insecurite_score: 5.0,
          immigration_score: 8.3,
          islamisation_score: 3.1,
          defrancisation_score: 2.3,
          wokisme_score: 1.6,
          number_of_mosques: 3,
          mosque_p100k: 16.7,
          total_qpv: 2,
          pop_in_qpv_pct: 22.1
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=paris')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].commune).toBe('Paris 1er');
      expect(response.body[0]).toHaveProperty('COG');
      expect(response.body[0]).toHaveProperty('population');
      expect(response.body[0]).toHaveProperty('insecurite_score');
    });

    it('should prioritize exact matches', async() => {
      const mockCommunes = [
        {
          COG: '75001',
          departement: '75',
          commune: 'Paris',
          population: 15000
        },
        {
          COG: '75002',
          departement: '75',
          commune: 'Paris 2e',
          population: 20000
        },
        {
          COG: '75003',
          departement: '75',
          commune: 'Saint-Paris',
          population: 18000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=paris')
        .expect(200);

      expect(response.body).toHaveLength(3);
      // Exact match should come first
      expect(response.body[0].commune).toBe('Paris');
    });

    it('should prioritize startsWith matches over contains', async() => {
      const mockCommunes = [
        {
          COG: '75001',
          departement: '75',
          commune: 'Paris 1er',
          population: 15000
        },
        {
          COG: '75002',
          departement: '75',
          commune: 'Saint-Paris',
          population: 20000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=par')
        .expect(200);

      expect(response.body).toHaveLength(2);
      // startsWith should come before contains
      expect(response.body[0].commune).toBe('Paris 1er');
      expect(response.body[1].commune).toBe('Saint-Paris');
    });

    it('should handle text normalization (accents)', async() => {
      const mockCommunes = [
        {
          COG: '75001',
          departement: '75',
          commune: 'Mâcon',
          population: 15000
        },
        {
          COG: '75002',
          departement: '75',
          commune: 'Paris',
          population: 20000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=macon')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].commune).toBe('Mâcon');
    });

    it('should limit results to 10', async() => {
      const mockCommunes = Array(15).fill().map((_, i) => ({
        COG: `750${String(i + 1).padStart(2, '0')}`,
        departement: '75',
        commune: `Paris ${i + 1}e`,
        population: 15000 + i * 1000
      }));

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockCommunes);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=paris')
        .expect(200);

      expect(response.body).toHaveLength(10);
    });

    it('should handle missing dept parameter', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      // When dept is missing, the query will use undefined, resulting in no matches
      const response = await request(app)
        .get('/api/search?q=paris')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should require q parameter', async() => {
      // This should cause a 500 because the route tries to call .toLowerCase() on undefined q
      const response = await request(app)
        .get('/api/search?dept=75')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=paris')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return empty array when no matches found', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/search?dept=75&q=nonexistent')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});