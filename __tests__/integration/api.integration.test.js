const request = require('supertest');
const express = require('express');
const db = require('../../config/db');
const { HTTP_NOT_FOUND, HTTP_BAD_REQUEST } = require('../../constants');

// Import route modules
const countryRoutes = require('../../routes/countryRoutes');
const departementRoutes = require('../../routes/departementRoutes');
const communeRoutes = require('../../routes/communeRoutes');

// Mock the database for integration tests
jest.mock('../../config/db');

// Create test app
const app = express();
app.use(express.json());

// Mount routes
app.use('/api/country', countryRoutes);
app.use('/api/departement', departementRoutes);
app.use('/api/commune', communeRoutes);

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Integration test error:', err);
  res.status(err.status || 500).json({
    error: err.message,
    details: process.env.NODE_ENV === 'test' ? err.details : undefined
  });
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Country Routes', () => {
    describe('GET /api/country/details', () => {
      it('should return all countries when no query params', async() => {
        const mockCountries = [
          { country: 'France', population: 67000000 },
          { country: 'Germany', population: 83000000 }
        ];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCountries);
        });

        const response = await request(app)
          .get('/api/country/details')
          .expect(200);

        expect(response.body).toEqual(mockCountries);
        expect(db.all).toHaveBeenCalled();
      });

      it('should filter by specific country', async() => {
        const mockCountry = [{ country: 'France', population: 67000000 }];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCountry);
        });

        const response = await request(app)
          .get('/api/country/details?country=france entiere')
          .expect(200);

        expect(response.body).toEqual(mockCountry);
      });
    });

    describe('GET /api/country/names', () => {
      it('should return latest names data for all countries', async() => {
        const mockNames = [
          { country: 'France', musulman_pct: 8.5, annais: 2022 }
        ];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockNames);
        });

        const response = await request(app)
          .get('/api/country/names')
          .expect(200);

        expect(response.body).toEqual(mockNames);
      });

    });

    describe('GET /api/country/crime', () => {
      it('should return latest crime data for all countries', async() => {
        const mockCrime = [
          { country: 'France', homicides_p100k: 1.2, annee: 2022 }
        ];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCrime);
        });

        const response = await request(app)
          .get('/api/country/crime')
          .expect(200);

        expect(response.body).toEqual(mockCrime);
      });
    });

    describe('GET /api/country/ministre', () => {
      it('should return minister information', async() => {
        const mockMinister = {
          country: 'France',
          prenom: 'Gérald',
          nom: 'Darmanin',
          date_mandat: '2020-01-01'
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockMinister);
        });

        const response = await request(app)
          .get('/api/country/ministre')
          .expect(200);

        expect(response.body).toEqual(mockMinister);
      });
    });
  });

  describe('Departement Routes', () => {
    describe('GET /api/departement/', () => {
      it('should return all departments sorted', async() => {
        const mockDepartments = [
          { departement: '95' },
          { departement: '01' },
          { departement: '75' }
        ];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockDepartments);
        });

        const response = await request(app)
          .get('/api/departement/')
          .expect(200);

        // Should be sorted by department code
        expect(response.body).toEqual([
          { departement: '01' },
          { departement: '75' },
          { departement: '95' }
        ]);
      });
    });

    describe('GET /api/departement/details', () => {
      it('should return department details', async() => {
        const mockDetails = {
          departement: '75',
          population: 2161000,
          insecurite_score: 7.2
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockDetails);
        });

        const response = await request(app)
          .get('/api/departement/details?dept=75')
          .expect(200);

        expect(response.body).toEqual(mockDetails);
      });

    });

    describe('GET /api/departement/names', () => {
      it('should return names data for department', async() => {
        const mockNames = {
          dpt: '75',
          musulman_pct: 12.5,
          annais: 2022
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockNames);
        });

        const response = await request(app)
          .get('/api/departement/names?dept=75')
          .expect(200);

        expect(response.body).toEqual(mockNames);
      });
    });

    describe('GET /api/departement/crime', () => {
      it('should return crime data for department', async() => {
        const mockCrime = {
          dep: '75',
          homicides_p100k: 1.8,
          annee: 2022
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCrime);
        });

        const response = await request(app)
          .get('/api/departement/crime?dept=75')
          .expect(200);

        expect(response.body).toEqual(mockCrime);
      });
    });

    describe('GET /api/departement/prefet', () => {
      it('should return prefect information', async() => {
        const mockPrefect = {
          code: '75',
          prenom: 'Michel',
          nom: 'Delpuech'
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockPrefect);
        });

        const response = await request(app)
          .get('/api/departement/prefet?dept=75')
          .expect(200);

        expect(response.body).toEqual(mockPrefect);
      });
    });
  });

  describe('Commune Routes', () => {
    describe('GET /api/commune/all', () => {
      it('should return all communes', async() => {
        const mockCommunes = [
          { COG: '75001', commune: 'Paris 1er', population: 16000 }
        ];

        db.all.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCommunes);
        });

        const response = await request(app)
          .get('/api/commune/all')
          .expect(200);

        expect(response.body).toEqual(mockCommunes);
      });
    });

    describe('GET /api/commune/details', () => {
      it('should return commune details', async() => {
        const mockDetails = {
          COG: '75001',
          commune: 'Paris 1er',
          population: 16000
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockDetails);
        });

        const response = await request(app)
          .get('/api/commune/details?cog=75001')
          .expect(200);

        expect(response.body).toEqual(mockDetails);
      });
    });

    describe('GET /api/commune/names', () => {
      it('should return names data for commune', async() => {
        const mockNames = {
          COG: '75001',
          musulman_pct: 15.2,
          annais: 2022
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockNames);
        });

        const response = await request(app)
          .get('/api/commune/names?cog=75001')
          .expect(200);

        expect(response.body).toEqual(mockNames);
      });
    });

    describe('GET /api/commune/crime', () => {
      it('should return crime data for commune', async() => {
        const mockCrime = {
          COG: '75001',
          homicides_p100k: 2.1,
          annee: 2022
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockCrime);
        });

        const response = await request(app)
          .get('/api/commune/crime?cog=75001')
          .expect(200);

        expect(response.body).toEqual(mockCrime);
      });
    });

    describe('GET /api/commune/maire', () => {
      it('should return mayor information', async() => {
        const mockMayor = {
          cog: '75001',
          prenom: 'Test',
          nom: 'Mayor',
          nuance_politique: 'LSOC'
        };

        db.get.mockImplementation((_sql, _params, callback) => {
          callback(null, mockMayor);
        });

        const response = await request(app)
          .get('/api/commune/maire?cog=75001')
          .expect(200);

        expect(response.body.nuance_politique).toBe('Parti Socialiste');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async() => {
      await request(app)
        .get('/api/unknown')
        .expect(HTTP_NOT_FOUND);
    });

    it('should handle validation errors', async() => {
      // Test with invalid parameters if validation is enabled
      await request(app)
        .get('/api/commune/details')
        .expect(HTTP_BAD_REQUEST); // Assuming validation returns 400
    });
  });
});