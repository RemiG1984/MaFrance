const request = require('supertest');
const express = require('express');
const nat1Routes = require('../../routes/nat1Routes');

// Mock the database
jest.mock('../../config/db', () => ({
  all: jest.fn(),
  get: jest.fn()
}));

// Mock cache middleware
jest.mock('../../middleware/cache', () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next())
}));

const db = require('../../config/db');

const app = express();
app.use(express.json());
app.use('/api/nat1', nat1Routes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('NAT1 Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/nat1/country', () => {
    it('should return all country NAT1 data', async() => {
      const mockData = [
        {
          Type: 'Country',
          Code: 'FRA',
          Ensemble: 67000000,
          Etrangers: 6700000,
          Francais_de_naissance: 40000000,
          Francais_par_acquisition: 20300000,
          Portugais: 500000,
          Italiens: 300000,
          Espagnols: 200000,
          Autres_nationalites_de_l_UE: 100000,
          Autres_nationalites_d_Europe: 50000,
          Algeriens: 800000,
          Marocains: 700000,
          Tunisiens: 300000,
          Turcs: 400000,
          Autres_nationalites_d_Afrique: 200000,
          Autres_nationalites: 100000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      const response = await request(app)
        .get('/api/nat1/country')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        Type: 'Country',
        country: 'FRA',
        Ensemble: 67000000,
        etrangers_pct: 10.00,
        francais_de_naissance_pct: 59.70,
        naturalises_pct: 30.30,
        europeens_pct: 1.72, // 500000+300000+200000+100000+50000 = 1150000 / 67000000 * 100 = 1.72
        maghrebins_pct: 3.28,
        africains_pct: 0.30,
        autres_nationalites_pct: 0.15,
        non_europeens_pct: 3.73
      });
    });

    it('should return 404 when no data found', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      const response = await request(app)
        .get('/api/nat1/country')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données NAT1 non trouvées'
      });
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/nat1/country')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/nat1/departement', () => {
    it('should return NAT1 data for a department', async() => {
      const mockData = {
        Type: 'Department',
        Code: '75',
        Ensemble: 2000000,
        Etrangers: 400000,
        Francais_de_naissance: 1200000,
        Francais_par_acquisition: 400000,
        Portugais: 20000,
        Italiens: 15000,
        Espagnols: 10000,
        Autres_nationalites_de_l_UE: 5000,
        Autres_nationalites_d_Europe: 2000,
        Algeriens: 80000,
        Marocains: 70000,
        Tunisiens: 30000,
        Turcs: 20000,
        Autres_nationalites_d_Afrique: 10000,
        Autres_nationalites: 5000
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      const response = await request(app)
        .get('/api/nat1/departement?dept=75')
        .expect(200);

      expect(response.body).toEqual({
        Type: 'Department',
        country: '75',
        Ensemble: 2000000,
        etrangers_pct: 20.00,
        francais_de_naissance_pct: 60.00,
        naturalises_pct: 20.00,
        europeens_pct: 2.60, // 52000 / 2000000 * 100 = 2.6
        maghrebins_pct: 10.00,
        africains_pct: 0.50,
        autres_nationalites_pct: 0.25,
        non_europeens_pct: 10.75
      });
    });

    it('should normalize single digit department codes', async() => {
      const mockData = {
        Type: 'Department',
        Code: '01',
        Ensemble: 1000000,
        Etrangers: 100000,
        Francais_de_naissance: 600000,
        Francais_par_acquisition: 300000,
        Portugais: 10000,
        Italiens: 5000,
        Espagnols: 5000,
        Autres_nationalites_de_l_UE: 2000,
        Autres_nationalites_d_Europe: 1000,
        Algeriens: 20000,
        Marocains: 15000,
        Tunisiens: 10000,
        Turcs: 8000,
        Autres_nationalites_d_Afrique: 5000,
        Autres_nationalites: 2000
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      await request(app)
        .get('/api/nat1/departement?dept=01')
        .expect(200);

      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM department_nat1 WHERE Code = ?',
        ['01'],
        expect.any(Function)
      );
    });

    it('should return 404 when department not found', async() => {
      db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/nat1/departement?dept=75')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données NAT1 non trouvées pour ce département'
      });
    });

    it('should require dept parameter', async() => {
      const response = await request(app)
        .get('/api/nat1/departement')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Paramètre dept requis'
      });
    });
  });

  describe('GET /api/nat1/commune', () => {
    it('should return NAT1 data for a commune', async() => {
      const mockData = {
        Type: 'Commune',
        Code: '75001',
        Ensemble: 15000,
        Etrangers: 3000,
        Francais_de_naissance: 9000,
        Francais_par_acquisition: 3000,
        Portugais: 200,
        Italiens: 100,
        Espagnols: 100,
        Autres_nationalites_de_l_UE: 50,
        Autres_nationalites_d_Europe: 20,
        Algeriens: 600,
        Marocains: 500,
        Tunisiens: 200,
        Turcs: 150,
        Autres_nationalites_d_Afrique: 100,
        Autres_nationalites: 80
      };

      db.get.mockImplementation((sql, params, callback) => {
        callback(null, mockData);
      });

      const response = await request(app)
        .get('/api/nat1/commune?cog=75001')
        .expect(200);

      expect(response.body).toEqual({
        Type: 'Commune',
        country: '75001',
        Ensemble: 15000,
        etrangers_pct: 20.00,
        francais_de_naissance_pct: 60.00,
        naturalises_pct: 20.00,
        europeens_pct: 3.13, // 470 / 15000 * 100 = 3.13
        maghrebins_pct: 9.67,
        africains_pct: 0.67,
        autres_nationalites_pct: 0.53,
        non_europeens_pct: 10.87
      });
    });

    it('should return 404 when commune not found', async() => {
      db.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });

      const response = await request(app)
        .get('/api/nat1/commune?cog=75001')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Données NAT1 non trouvées pour cette commune'
      });
    });

    it('should require cog parameter', async() => {
      const response = await request(app)
        .get('/api/nat1/commune')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('computePercentageFields function', () => {
    it('should handle zero ensemble values', () => {
      // This is tested indirectly through the API tests
      // The function returns null for zero ensemble, which gets filtered out
      const mockData = {
        Type: 'Country',
        Code: 'FRA',
        Ensemble: 0,
        Etrangers: 0,
        Francais_de_naissance: 0,
        Francais_par_acquisition: 0,
        Portugais: 0,
        Italiens: 0,
        Espagnols: 0,
        Autres_nationalites_de_l_UE: 0,
        Autres_nationalites_d_Europe: 0,
        Algeriens: 0,
        Marocains: 0,
        Tunisiens: 0,
        Turcs: 0,
        Autres_nationalites_d_Afrique: 0,
        Autres_nationalites: 0
      };

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, [mockData]);
      });

      return request(app)
        .get('/api/nat1/country')
        .expect(200)
        .then(response => {
          expect(response.body).toHaveLength(0); // Should be filtered out
        });
    });
  });
});