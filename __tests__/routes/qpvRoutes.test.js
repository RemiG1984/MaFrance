const request = require('supertest');
const express = require('express');
const qpvRoutes = require('../../routes/qpvRoutes');

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
app.use('/api/qpv', qpvRoutes);

// Error handling middleware for tests
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('QPV Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/qpv', () => {
    it('should return all QPV data without filters', async() => {
      const mockQpvData = [
        {
          rowid: 1,
          COG: '75001',
          lib_com: 'Paris 1er',
          codeQPV: 'QP001',
          lib_qp: 'QPV Paris Centre',
          popMuniQPV: 15000,
          indiceJeunesse: 85,
          partPopEt: 12.5,
          partPopImmi: 18.3,
          nombre_logements_sociaux: 2000,
          taux_logements_sociaux: 45.2,
          taux_d_emploi: 65.8,
          taux_pauvrete_60: 28.4,
          personnes_couvertes_CAF: 12000,
          allocataires_CAF: 4500,
          RSA_socle: 1200
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv')
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).toEqual({
        COG: '75001',
        lib_com: 'Paris 1er',
        codeQPV: 'QP001',
        lib_qp: 'QPV Paris Centre',
        popMuniQPV: 15000,
        indiceJeunesse: 85,
        partPopEt: 12.5,
        partPopImmi: 18.3,
        nombre_logements_sociaux: 2000,
        taux_logements_sociaux: 45.2,
        taux_d_emploi: 65.8,
        taux_pauvrete_60: 28.4,
        personnes_couvertes_CAF: 12000,
        allocataires_CAF: 4500,
        RSA_socle: 1200
      });
    });

    it('should filter by department', async() => {
      const mockQpvData = [
        {
          rowid: 1,
          COG: '75001',
          lib_com: 'Paris 1er',
          codeQPV: 'QP001',
          lib_qp: 'QPV Paris Centre',
          popMuniQPV: 15000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?dept=75')
        .expect(200);

      expect(response.body).toHaveLength(1); // Returns array directly when filtered
      expect(response.body[0].COG).toBe('75001');
      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE insee_dep = ?'),
        ['75', 21],
        expect.any(Function)
      );
    });

    it('should filter by commune name', async() => {
      const mockQpvData = [
        {
          rowid: 1,
          COG: '75001',
          lib_com: 'Paris 1er',
          codeQPV: 'QP001',
          lib_qp: 'QPV Paris Centre',
          popMuniQPV: 15000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockQpvData);
      });

      const response = await request(app)
        .get('/api/qpv?commune=paris')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE LOWER(lib_com) LIKE LOWER(?)'),
        ['%paris%', 21],
        expect.any(Function)
      );
    });

    it('should reject requests with both dept and cog', async() => {
      const response = await request(app)
        .get('/api/qpv?dept=75&cog=75001')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Cannot specify both dept and cog'
      });
    });

    it('should handle pagination with cursor for country-level requests', async() => {
      const mockQpvData = [
        {
          rowid: 101,
          COG: '75001',
          lib_com: 'Paris 1er',
          codeQPV: 'QP001',
          lib_qp: 'QPV Paris Centre',
          popMuniQPV: 15000
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockQpvData);
      });

      await request(app)
        .get('/api/qpv?cursor=100&limit=10')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('WHERE rowid > ?'),
        [100, 11],
        expect.any(Function)
      );
    });

    it('should handle database errors', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/qpv')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/qpv/geojson', () => {
    it('should return QPV GeoJSON data', async() => {
      const mockGeoData = [
        {
          code_qp: 'QP001',
          lib_qp: 'QPV Paris Centre',
          insee_com: '75001',
          lib_com: 'Paris 1er',
          insee_dep: '75',
          lib_dep: 'Paris',
          geometry: '{"type":"Polygon","coordinates":[[[2.3,48.8],[2.4,48.8],[2.4,48.9],[2.3,48.9],[2.3,48.8]]]}'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockGeoData);
      });

      const response = await request(app)
        .get('/api/qpv/geojson')
        .expect(200);

      expect(response.body).toHaveProperty('geojson');
      expect(response.body.geojson.type).toBe('FeatureCollection');
      expect(response.body.geojson.features).toHaveLength(1);
      expect(response.body.geojson.features[0].properties.code_qp).toBe('QP001');
      expect(response.body.geojson.features[0].geometry.type).toBe('Polygon');
    });

    it('should handle database errors for geojson', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(new Error('Database error'), null);
      });

      const response = await request(app)
        .get('/api/qpv/geojson')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle JSON parsing errors', async() => {
      const mockGeoData = [
        {
          code_qp: 'QP001',
          lib_qp: 'QPV Paris Centre',
          insee_com: '75001',
          lib_com: 'Paris 1er',
          insee_dep: '75',
          lib_dep: 'Paris',
          geometry: 'invalid json'
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockGeoData);
      });

      const response = await request(app)
        .get('/api/qpv/geojson')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/qpv/closest', () => {
    it('should return closest QPVs to coordinates', async() => {
      const mockResults = [
        {
          code_qp: 'QP001',
          lib_qp: 'QPV Paris Centre',
          insee_com: '75001',
          lib_com: 'Paris 1er',
          insee_dep: '75',
          lib_dep: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          distance_sq: 0.01
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const response = await request(app)
        .get('/api/qpv/closest?lat=48.8566&lng=2.3522&limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('list');
      expect(response.body.list).toHaveLength(1);
      expect(response.body.list[0]).toHaveProperty('distance');
      expect(response.body.list[0].code_qp).toBe('QP001');
    });

    it('should require latitude and longitude', async() => {
      const response = await request(app)
        .get('/api/qpv/closest')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Latitude and longitude are required'
      });
    });

    it('should handle large limit values', async() => {
      db.all.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });

      await request(app)
        .get('/api/qpv/closest?lat=48.8566&lng=2.3522&limit=50')
        .expect(200);

      expect(db.all).toHaveBeenCalledWith(
        expect.any(String),
        ['48.8566', '48.8566', '2.3522', '2.3522', 50],
        expect.any(Function)
      );
    });
  });

  describe('GET /api/qpv/nearby', () => {
    it('should return nearby QPVs with detailed data', async() => {
      const mockResults = [
        {
          code_qp: 'QP001',
          lib_qp: 'QPV Paris Centre',
          lib_com: 'Paris 1er',
          lib_dep: 'Paris',
          latitude: 48.8566,
          longitude: 2.3522,
          popMuniQPV: 15000,
          indiceJeunesse: 85,
          partPopEt: 12.5,
          partPopImmi: 18.3,
          taux_logements_sociaux: 45.2,
          taux_d_emploi: 65.8,
          taux_pauvrete_60: 28.4,
          distance_km: 0.5
        }
      ];

      db.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });

      const response = await request(app)
        .get('/api/qpv/nearby?lat=48.8566&lng=2.3522&limit=5')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        code_qp: 'QP001',
        lib_qp: 'QPV Paris Centre',
        commune: 'Paris 1er',
        departement: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        distance_km: 0.5,
        population: 15000,
        indice_jeunesse: 85,
        part_pop_etrangere: 12.5,
        part_pop_immigree: 18.3,
        taux_logements_sociaux: 45.2,
        taux_emploi: 65.8,
        taux_pauvrete: 28.4
      });
    });

    it('should require latitude and longitude for nearby', async() => {
      const response = await request(app)
        .get('/api/qpv/nearby')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Latitude and longitude are required'
      });
    });

    it('should validate coordinates are numbers', async() => {
      const response = await request(app)
        .get('/api/qpv/nearby?lat=invalid&lng=2.3522')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid coordinates'
      });
    });
  });
});