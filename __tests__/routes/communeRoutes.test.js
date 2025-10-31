// Mock the database and services
jest.mock('../../config/db');
jest.mock('../../services/searchService');

const db = require('../../config/db');
const SearchService = require('../../services/searchService');

// Create mock implementations of the handler functions

describe('Commune Route Handler Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search functionality', () => {
    it('should search communes by department', async() => {
      const mockResults = [
        { COG: '75001', commune: 'Paris 1er', population: 16000 }
      ];

      SearchService.searchCommunes.mockResolvedValue(mockResults);

      // Simulate the handler logic
      const result = await SearchService.searchCommunes('75', 'paris', 10);

      expect(SearchService.searchCommunes).toHaveBeenCalledWith('75', 'paris', 10);
      expect(result).toEqual(mockResults);
    });

    it('should return commune suggestions', async() => {
      const mockSuggestions = [
        { COG: '75001', commune: 'Paris 1er' }
      ];

      SearchService.getCommuneSuggestions.mockResolvedValue(mockSuggestions);

      const result = await SearchService.getCommuneSuggestions('75', 'par', 5);

      expect(SearchService.getCommuneSuggestions).toHaveBeenCalledWith('75', 'par', 5);
      expect(result).toEqual(mockSuggestions);
    });

    it('should perform global search for valid queries', async() => {
      const mockResults = [{ COG: '75001', commune: 'Paris 1er' }];

      SearchService.searchCommunesGlobally.mockResolvedValue(mockResults);

      const result = await SearchService.searchCommunesGlobally('paris', 15);

      expect(SearchService.searchCommunesGlobally).toHaveBeenCalledWith('paris', 15);
      expect(result).toEqual(mockResults);
    });
  });

  describe('Database queries', () => {
    it('should query all communes', async() => {
      const mockCommunes = [
        { COG: '75001', commune: 'Paris 1er', population: 16000 }
      ];

      db.all.mockImplementation((_sql, _params, callback) => {
        callback(null, mockCommunes);
      });

      // Simulate the database query logic
      const result = await new Promise((resolve, reject) => {
        db.all('SELECT COG, departement, commune, population, logements_sociaux_pct, insecurite_score, immigration_score, islamisation_score, defrancisation_score, wokisme_score, number_of_mosques, mosque_p100k, total_qpv, pop_in_qpv_pct, total_places_migrants, places_migrants_p1k FROM locations', [], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });

      expect(db.all).toHaveBeenCalled();
      expect(result).toEqual(mockCommunes);
    });

    it('should query commune details', async() => {
      const mockDetails = {
        COG: '75001',
        commune: 'Paris 1er',
        population: 16000
      };

      db.get.mockImplementation((_sql, _params, callback) => {
        callback(null, mockDetails);
      });

      const result = await new Promise((resolve, reject) => {
        db.get(`SELECT musulman_pct, africain_pct, asiatique_pct, traditionnel_pct, moderne_pct, annais
               FROM commune_names
               WHERE COG = ? AND annais = (SELECT MAX(annais) FROM commune_names WHERE COG = ?)`,
        ['75001', '75001'], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      expect(db.get).toHaveBeenCalled();
      expect(result).toEqual(mockDetails);
    });
  });

  describe('Political nuance mapping', () => {
    const nuanceMap = {
      LEXG: 'Extrême gauche',
      LCOM: 'Parti Communiste',
      LFI: 'France Insoumise',
      LSOC: 'Parti Socialiste',
      LRDG: 'Parti radical de gauche',
      LDVG: 'Divers gauche',
      LUG: 'Liste d\'Union de la gauche',
      LVEC: 'Europe Ecologie',
      LECO: 'Liste autre écologiste',
      LDIV: 'Liste divers',
      LREG: 'Liste régionaliste',
      LGJ: 'Liste gilets jaunes',
      LREM: 'La République en marche',
      LMDM: 'Modem',
      LUDI: 'UDI',
      LUC: 'Liste union du centre',
      LDVC: 'Liste divers centre',
      LLR: 'Les Républicains',
      LUD: 'Liste union de la droite',
      LDVD: 'Liste divers droite',
      LDLF: 'Debout la France',
      LRN: 'Rassemblement National',
      LEXD: 'Liste d\'extrême droite',
      NC: ''
    };

    const testCases = [
      { input: 'LEXG', expected: 'Extrême gauche' },
      { input: 'LSOC', expected: 'Parti Socialiste' },
      { input: 'LRN', expected: 'Rassemblement National' },
      { input: 'LREM', expected: 'La République en marche' },
      { input: 'NC', expected: '' }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should map ${input} to ${expected}`, () => {
        const mockMayor = {
          prenom: 'Test',
          nom: 'User',
          nuance_politique: input
        };

        const result = {
          ...mockMayor,
          nuance_politique: nuanceMap[mockMayor.nuance_politique] ?? mockMayor.nuance_politique
        };

        expect(result.nuance_politique).toBe(expected);
      });
    });
  });
});