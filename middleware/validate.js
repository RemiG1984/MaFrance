const { query, param, validationResult } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation for French department codes (e.g., 01-95, 2A, 2B, 971-976)
const validateDepartement = [
  query("dept")
    .optional() // Allow dept to be empty or undefined
    .custom((value) => {
      if (value === "" || value === undefined) {
        return true; // Allow empty string for national commune rankings
      }
      if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(value)) {
        throw new Error("Code département invalide");
      }
      return true;
    }),
  handleValidationErrors,
];

// Validation for French department codes in path parameters
const validateDepartementParam = [
  param("dept")
    .notEmpty()
    .withMessage("Département requis")
    .matches(/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/)
    .withMessage("Code département invalide"),
  handleValidationErrors,
];

// Validation for COG (French commune code, 4 or 5-digit or specific formats)
const validateCOG = [
  query("cog")
    .notEmpty()
    .withMessage("COG requis")
    .matches(/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/)
    .withMessage("Code COG invalide"),
  handleValidationErrors,
];

// Validation for COG in path parameters
const validateCOGParam = [
  param("cog")
    .notEmpty()
    .withMessage("COG requis")
    .matches(/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/)
    .withMessage("Code COG invalide"),
  handleValidationErrors,
];

function validateOptionalCOG(req, res, next) {
  const { cog } = req.query;
  if (
    cog &&
    !/^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/.test(cog)
  ) {
    return res.status(400).json({
      errors: [
        {
          type: "field",
          value: cog,
          msg: "Code COG invalide",
          path: "cog",
          location: "query",
        },
      ],
    });
  }
  next();
}

// Validation for sort parameter in rankings
const validateSort = [
  query("sort")
    .optional()
    .isIn([
      "total_score",
      "population",
      "insecurite_score",
      "immigration_score",
      "islamisation_score",
      "defrancisation_score",
      "wokisme_score",
      "number_of_mosques",
      "mosque_p100k",
      "musulman_pct",
      "africain_pct",
      "asiatique_pct",
      "traditionnel_pct",
      "moderne_pct",
      "homicides_p100k",
      "violences_physiques_p1k",
      "violences_sexuelles_p1k",
      "vols_p1k",
      "destructions_p1k",
      "stupefiants_p1k",
      "escroqueries_p1k",
      "extra_europeen_pct",
      "prenom_francais_pct",
      "total_qpv",
      "pop_in_qpv_pct",
      "logements_sociaux_pct",
    ])
    .withMessage("Paramètre de tri invalide"),
  handleValidationErrors,
];

// Validation for direction
const validateDirection = [
  query("direction")
    .optional()
    .isIn(["ASC", "DESC"])
    .withMessage("Direction doit être ASC ou DESC"),
  handleValidationErrors,
];

// Validation for limit and offset
const validatePagination = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 101 })
    .withMessage("Limit doit être un entier entre 1 et 100")
    .toInt(),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset doit être un entier positif")
    .toInt(),
  handleValidationErrors,
];

// Validation for population range
const validatePopulationRange = [
  query("population_range")
    .optional()
    .isIn([
      "0-1k",
      "0-10k",
      "0-100k",
      "0+",
      "1-10k",
      "1-100k",
      "1k+",
      "10-100k",
      "10k+",
      "100k+",
    ])
    .withMessage(
      "Plage de population invalide. Valeurs autorisées : 0-1k, 0-10k, 0-100k, 0+, 1-10k, 1-100k, 1k+, 10-100k, 10k+, 100k+",
    ),
  handleValidationErrors,
];

// Validation for country
const validateCountry = [
  query("country")
    .optional()
    .isIn(["France", "FRANCE"])
    .withMessage("Pays doit être France"),
  handleValidationErrors,
];

// Validation for lieu
const validateLieu = [
  query("lieu")
    .optional()
    .trim()
    .escape()
    .isLength({ max: 100 })
    .withMessage("Lieu trop long"),
  handleValidationErrors,
];

function validateSearchQuery(req, res, next) {
  const { q } = req.query;
  if (
    q !== undefined &&
    q !== "" &&
    (typeof q !== "string" || q.length < 2 || q.length > 100)
  ) {
    return res.status(400).json({
      errors: [
        {
          type: "field",
          value: q,
          msg: "La requête doit contenir entre 2 et 100 caractères",
          path: "q",
          location: "query",
        },
      ],
    });
  }
  next();
}

module.exports = {
  validateDepartement,
  validateDepartementParam,
  validateCOG,
  validateCOGParam,
  validateOptionalCOG,
  validateSearchQuery,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
  validateCountry,
  validateLieu,
};
