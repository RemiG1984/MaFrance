// Import the route module to get the class
const routeModule = require('../../routes/countryRoutes');
const CountryRoute = routeModule.CountryRoute;

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

describe('CountryRoute Handlers', () => {
  let countryRoute;

  beforeEach(() => {
    countryRoute = new CountryRoute();
    jest.clearAllMocks();
  });

  describe('handleGetDetails', () => {
    it('should return all countries when no country specified', async() => {
      const mockCountries = [
        { country: 'France', population: 67000000 },
        { country: 'Germany', population: 83000000 }
      ];

      const mockHandler = jest.fn().mockResolvedValue(mockCountries);
      countryRoute.createDbHandler.mockReturnValue(mockHandler);

      const result = await countryRoute.handleGetDetails({ query: {} });

      expect(result).toEqual(mockCountries);
    });

    it('should filter by specific country', async() => {
      const mockCountry = [{ country: 'France', population: 67000000 }];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockCountry));

      const result = await countryRoute.handleGetDetails({ query: { country: 'France' } });

      expect(result).toEqual(mockCountry);
    });
  });

  describe('handleGetNames', () => {
    it('should return latest names data for all countries', async() => {
      const mockNames = [
        { country: 'France', musulman_pct: 8.5, annais: 2022 },
        { country: 'Germany', musulman_pct: 6.2, annais: 2022 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockNames));

      const result = await countryRoute.handleGetNames({ query: {} });

      expect(result).toEqual(mockNames);
    });

    it('should filter by specific country', async() => {
      const mockNames = [{ country: 'France', musulman_pct: 8.5, annais: 2022 }];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockNames));

      const result = await countryRoute.handleGetNames({ query: { country: 'France' } });

      expect(result).toEqual(mockNames);
    });
  });

  describe('handleGetNamesHistory', () => {
    it('should return names history for all countries', async() => {
      const mockHistory = [
        { country: 'France', annais: 2020, musulman_pct: 7.8 },
        { country: 'France', annais: 2021, musulman_pct: 8.1 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockHistory));

      const result = await countryRoute.handleGetNamesHistory({ query: {} });

      expect(result).toEqual(mockHistory);
    });

    it('should filter history by specific country', async() => {
      const mockHistory = [
        { country: 'France', annais: 2020, musulman_pct: 7.8 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockHistory));

      const result = await countryRoute.handleGetNamesHistory({ query: { country: 'France' } });

      expect(result).toEqual(mockHistory);
    });
  });

  describe('handleGetCrime', () => {
    it('should return latest crime data for all countries', async() => {
      const mockCrime = [
        { country: 'France', homicides_p100k: 1.2, annee: 2022 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockCrime));

      const result = await countryRoute.handleGetCrime({ query: {} });

      expect(result).toEqual(mockCrime);
    });

    it('should filter by specific country', async() => {
      const mockCrime = [{ country: 'France', homicides_p100k: 1.2, annee: 2022 }];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockCrime));

      const result = await countryRoute.handleGetCrime({ query: { country: 'France' } });

      expect(result).toEqual(mockCrime);
    });
  });

  describe('handleGetCrimeHistory', () => {
    it('should return crime history for all countries', async() => {
      const mockHistory = [
        { country: 'France', annee: 2020, homicides_p100k: 1.0 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockHistory));

      const result = await countryRoute.handleGetCrimeHistory({ query: {} });

      expect(result).toEqual(mockHistory);
    });

    it('should filter history by specific country', async() => {
      const mockHistory = [
        { country: 'France', annee: 2020, homicides_p100k: 1.0 }
      ];

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockHistory));

      const result = await countryRoute.handleGetCrimeHistory({ query: { country: 'France' } });

      expect(result).toEqual(mockHistory);
    });
  });

  describe('handleGetMinistre', () => {
    it('should return minister information for France', async() => {
      const mockMinister = {
        country: 'France',
        prenom: 'Gérald',
        nom: 'Darmanin',
        date_mandat: '2020-01-01',
        famille_nuance: 'LR',
        nuance_politique: 'LR'
      };

      countryRoute.createDbHandler.mockReturnValue(jest.fn().mockResolvedValue(mockMinister));

      const result = await countryRoute.handleGetMinistre({ query: {} });

      expect(result).toEqual(mockMinister);
    });
  });
});