const { query, param, validationResult } = require('express-validator');
const {
  HTTP_BAD_REQUEST,
  MAX_PAGINATION_LIMIT,
  MAX_POPULATION_RANGE,
  MAX_LIEU_LENGTH,
  MIN_SEARCH_QUERY_LENGTH
} = require('../constants');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const { ValidationError } = require('./errorHandler');
    const error = new ValidationError('Erreur de validation', errors.array());
    return next(error);
  }
  next();
};

// Validation for French department codes (e.g., 01-95, 2A, 2B, 971-976)
const validateDepartement = [
  query('dept')
    .notEmpty()
    .withMessage('Département requis')
    .custom((value) => {
      if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(value)) {
        throw new Error('Code département invalide');
      }
      return true;
    }),
  handleValidationErrors
];

// Validation for French department codes in path parameters
const validateDepartementParam = [
  param('dept')
    .notEmpty()
    .withMessage('Département requis')
    .custom((value) => {
      if (value.toLowerCase() === 'all') {
        return true; // Allow 'all' as a special case
      }
      if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(value)) {
        throw new Error('Code département invalide');
      }
      return true;
    }),
  handleValidationErrors
];

// Validation for COG (French commune code, 4 or 5-digit or specific formats)
const validateCOG = [
  query('cog')
    .notEmpty()
    .withMessage('COG requis')
    .matches(/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/)
    .withMessage('Code COG invalide'),
  handleValidationErrors
];

// Validation for COG in path parameters
const validateCOGParam = [
  param('cog')
    .notEmpty()
    .withMessage('COG requis')
    .matches(/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/)
    .withMessage('Code COG invalide'),
  handleValidationErrors
];

function validateOptionalCOG(req, res, next) {
  const { cog } = req.query;
  if (
    cog &&
    !/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/.test(cog)
  ) {
    const { ValidationError } = require('./errorHandler');
    const error = new ValidationError('Erreur de validation', [{
      type: 'field',
      value: cog,
      msg: 'Code COG invalide',
      path: 'cog',
      location: 'query'
    }]);
    return next(error);
  }
  next();
}

// Validation for sort parameter in rankings
const validateSort = [
  query('sort')
    .optional()
    .isIn([
      'total_score',
      'population',
      'insecurite_score',
      'immigration_score',
      'islamisation_score',
      'defrancisation_score',
      'wokisme_score',
      'number_of_mosques',
      'mosque_p100k',
      'musulman_pct',
      'africain_pct',
      'asiatique_pct',
      'traditionnel_pct',
      'moderne_pct',
      'homicides_p100k',
      'violences_physiques_p1k',
      'violences_sexuelles_p1k',
      'vols_p1k',
      'destructions_p1k',
      'stupefiants_p1k',
      'escroqueries_p1k',
      'extra_europeen_pct',
      'prenom_francais_pct',
      'total_qpv',
      'pop_in_qpv_pct',
      'logements_sociaux_pct',
      'total_subventions_parHab',
      'Total_places_migrants',
      'places_migrants_p1k',
      // NAT1 calculated metrics
      'etrangers_pct',
      'francais_de_naissance_pct',
      'naturalises_pct',
      'europeens_pct',
      'maghrebins_pct',
      'africains_pct',
      'autres_nationalites_pct',
      'non_europeens_pct'
    ])
    .withMessage('Paramètre de tri invalide'),
  handleValidationErrors
];

// Validation for direction
const validateDirection = [
  query('direction')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Direction doit être ASC ou DESC'),
  handleValidationErrors
];

// Validation for limit and offset
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: MAX_PAGINATION_LIMIT + 1 })
    .withMessage(`Limit doit être un entier entre 1 et ${MAX_PAGINATION_LIMIT}`)
    .toInt(),
  query('cursor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cursor doit être un entier positif')
    .toInt(),
  handleValidationErrors
];

// Validation for population range - integer format only
const validatePopulationRange = [
  query('population_range')
    .optional()
    .custom((value) => {
      // Integer format validation: "min-max", "min+", or "0-max"
      const rangeMatch = value.match(/^(\d+)-(\d+)$/);
      const minOnlyMatch = value.match(/^(\d+)\+$/);
      const maxOnlyMatch = value.match(/^0-(\d+)$/);

      if (rangeMatch) {
        const minPop = parseInt(rangeMatch[1], 10);
        const maxPop = parseInt(rangeMatch[2], 10);
        if (minPop >= 0 && maxPop > minPop && maxPop <= MAX_POPULATION_RANGE) {
          return true;
        }
        throw new Error(`Plage de population invalide. Format: 'min-max' où min < max et max <= ${MAX_POPULATION_RANGE}`);
      } else if (minOnlyMatch) {
        const minPop = parseInt(minOnlyMatch[1], 10);
        if (minPop >= 0 && minPop <= MAX_POPULATION_RANGE) {
          return true;
        }
        throw new Error(`Population minimum invalide. Doit être entre 0 et ${MAX_POPULATION_RANGE}`);
      } else if (maxOnlyMatch) {
        const maxPop = parseInt(maxOnlyMatch[1], 10);
        if (maxPop > 0 && maxPop <= MAX_POPULATION_RANGE) {
          return true;
        }
        throw new Error(`Population maximum invalide. Doit être entre 1 et ${MAX_POPULATION_RANGE}`);
      }

      throw new Error(
        'Format de population invalide. Formats acceptés: \'1000-50000\', \'10000+\', \'0-100000\''
      );
    }),
  handleValidationErrors
];

// Validation for country
const validateCountry = [
  query('country')
    .optional()
    .isIn(['france metro', 'france entiere'])
    .withMessage('Pays doit être france entiere ou metro'),
  handleValidationErrors
];

// Validation for lieu
const validateLieu = [
  query('lieu')
    .optional()
    .trim()
    .escape()
    .isLength({ max: MAX_LIEU_LENGTH })
    .withMessage('Lieu trop long'),
  handleValidationErrors
];

// New middleware for optional department validation
const validateOptionalDepartement = (req, res, next) => {
  const { dept } = req.query;
  if (dept && !/^\d{1,3}$/.test(dept)) {
    const { ValidationError } = require('./errorHandler');
    const error = new ValidationError('Erreur de validation', [{
      type: 'field',
      value: dept,
      msg: 'Le paramètre dept doit être un nombre',
      path: 'dept',
      location: 'query'
    }]);
    return next(error);
  }
  next();
};

function validateSearchQuery(req, res, next) {
  const { q } = req.query;
  if (
    !q ||
    q === '' ||
    typeof q !== 'string' ||
    q.length < MIN_SEARCH_QUERY_LENGTH ||
    q.length > MAX_LIEU_LENGTH
  ) {
    const { ValidationError } = require('./errorHandler');
    const error = new ValidationError('Erreur de validation', [{
      type: 'field',
      value: q,
      msg: `La requête doit contenir entre ${MIN_SEARCH_QUERY_LENGTH} et ${MAX_LIEU_LENGTH} caractères`,
      path: 'q',
      location: 'query'
    }]);
    return next(error);
  }
  next();
}

module.exports = {
  validateDepartement,
  validateDepartementParam,
  validateCOG,
  validateCOGParam,
  validateOptionalCOG,
  validateOptionalDepartement,
  validateSearchQuery,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
  validateCountry,
  validateLieu
};