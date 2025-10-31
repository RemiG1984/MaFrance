const request = require('supertest');
const express = require('express');
const subventionRoutes = require('../../routes/subventionRoutes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn(),
  get: jest.fn()
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());
app.locals.db = db; // Provide db in app locals as expected by the route
app.use('/api/subventions', subventionRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('Subvention Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/subventions/country', () => {
    it('should return all country subventions', async() => {
      const mockSubventions = [
        {
          country: 'France',
          etat_central: 1000000,
          autres_organismes_publics: 500000,
          total_subv_commune: 2000000,
          total_subv_EPCI: 1500000,
          total_subv_dept: 1200000,
          total_subv_region: 800000,
          total_subventions_parHab: 150.5
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockSubventions);
      });

      const response = await request(app)
        .get('/api/subventions/country')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(mockSubventions[0]);
    });

    it('should return 404 when no data found', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/subventions/country')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données de subventions non trouvées'
      });
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/subventions/country')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/subventions/departement/:dept', () => {
    it('should return subventions for a department', async() => {
      const mockData = {
        subvention_region_distributed: 500000,
        subvention_departement: 300000,
        total_subventions_parHab: 120.5
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      const response = await request(app)
        .get('/api/subventions/departement/75')
        .expect(200);

      expect(response.body).toEqual({
        subvention_region_distributed: 500000,
        subvention_departement: 300000,
        total_subventions_parHab: 120.5
      });
    });

    it('should return 404 when department not found', async() => {
      db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/subventions/departement/75')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données de subventions non trouvées pour ce département'
      });
    });

    it('should validate department parameter', async() => {
      const response = await request(app)
        .get('/api/subventions/departement/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/subventions/commune/:cog', () => {
    it('should return subventions for a commune', async() => {
      const mockData = {
        subvention_EPCI_distributed: 200000,
        subvention_commune: 150000,
        total_subventions_parHab: 95.3
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      const response = await request(app)
        .get('/api/subventions/commune/75001')
        .expect(200);

      expect(response.body).toEqual({
        subvention_EPCI_distributed: 200000,
        subvention_commune: 150000,
        total_subventions_parHab: 95.3
      });
    });

    it('should return 404 when commune not found', async() => {
      db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/subventions/commune/75001')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données de subventions non trouvées pour cette commune'
      });
    });

    it('should validate COG parameter', async() => {
      const response = await request(app)
        .get('/api/subventions/commune/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });
});