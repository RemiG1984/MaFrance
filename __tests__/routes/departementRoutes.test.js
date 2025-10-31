// Import the route module to get the class
const routeModule = require('../../routes/departementRoutes');
const DepartementRoute = routeModule.DepartementRoute;

// Mock the database
jest.mock('../../config/db');
// const db = require('../../config/db'); // Not used in this test

// Mock BaseRoute to avoid Express router setup
jest.mock('../../routes/base/BaseRoute', () => {
  return class MockBaseRoute {
    constructor() {
      this.router = {};
      this.createDbHandler = jest.fn();
    }
    get() {}
    getMiddleware() {
      return {};
    }
    getRouter() {
      return this.router;
    }
  };
});

describe('DepartementRoute Handlers', () => {
  let departementRoute;

  beforeEach(() => {
    departementRoute = new DepartementRoute();
    jest.clearAllMocks();
  });

  describe('handleGetAll', () => {
    it('should return all departments sorted by code', async() => {
      const mockDepartments = [
        { departement: '95' },
        { departement: '01' },
        { departement: '75' }
      ];

      const mockHandler = jest.fn().mockResolvedValue(mockDepartments);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetAll({});

      // Should be sorted by padded department code
      expect(result).toEqual([
        { departement: '01' },
        { departement: '75' },
        { departement: '95' }
      ]);
    });
  });

  describe('handleGetDetails', () => {
    it('should return department details', async() => {
      const mockDetails = {
        departement: '75',
        population: 2161000,
        insecurite_score: 7.2,
        pop_in_qpv_pct: 15.5
      };

      const mockHandler = jest.fn().mockResolvedValue(mockDetails);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetDetails({ query: { dept: '75' } });

      expect(result).toEqual(mockDetails);
    });

    it('should handle single digit department codes', async() => {
      const mockDetails = {
        departement: '01',
        population: 650000,
        insecurite_score: 3.1
      };

      const mockHandler = jest.fn().mockResolvedValue(mockDetails);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetDetails({ query: { dept: '1' } });

      expect(result).toEqual(mockDetails);
    });
  });

  describe('handleGetNames', () => {
    it('should return latest names data for department', async() => {
      const mockNames = {
        dpt: '75',
        musulman_pct: 12.5,
        africain_pct: 8.3,
        annais: 2022
      };

      const mockHandler = jest.fn().mockResolvedValue(mockNames);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetNames({ query: { dept: '75' } });

      expect(result).toEqual(mockNames);
    });
  });

  describe('handleGetNamesHistory', () => {
    it('should return names history for department', async() => {
      const mockHistory = [
        { dpt: '75', annais: 2020, musulman_pct: 11.2 },
        { dpt: '75', annais: 2021, musulman_pct: 11.8 }
      ];

      const mockHandler = jest.fn().mockResolvedValue(mockHistory);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetNamesHistory({ query: { dept: '75' } });

      expect(result).toEqual(mockHistory);
    });
  });

  describe('handleGetCrime', () => {
    it('should return latest crime data for department', async() => {
      const mockCrime = {
        dep: '75',
        homicides_p100k: 1.8,
        violences_physiques_p1k: 25.3,
        annee: 2022
      };

      const mockHandler = jest.fn().mockResolvedValue(mockCrime);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetCrime({ query: { dept: '75' } });

      expect(result).toEqual(mockCrime);
    });
  });

  describe('handleGetCrimeHistory', () => {
    it('should return crime history for department', async() => {
      const mockHistory = [
        { dep: '75', annee: 2020, homicides_p100k: 1.5 },
        { dep: '75', annee: 2021, homicides_p100k: 1.6 }
      ];

      const mockHandler = jest.fn().mockResolvedValue(mockHistory);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetCrimeHistory({ query: { dept: '75' } });

      expect(result).toEqual(mockHistory);
    });
  });

  describe('handleGetPrefet', () => {
    it('should return prefect information for department', async() => {
      const mockPrefect = {
        code: '75',
        prenom: 'Michel',
        nom: 'Delpuech',
        date_poste: '2022-01-01'
      };

      const mockHandler = jest.fn().mockResolvedValue(mockPrefect);
      departementRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await departementRoute.handleGetPrefet({ query: { dept: '75' } });

      expect(result).toEqual(mockPrefect);
    });
  });
});