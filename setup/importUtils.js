/**
 * Common utility functions used across import modules.
 * Provides helpers for date parsing, geographic code normalization,
 * and data transformation.
 */

/**
 * Regular expression for validating French department codes.
 * Matches: 01-95, 2A, 2B, 971-976
 */
const DEPARTMENT_CODE_REGEX = /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/;

/**
 * Parses French date format (DD/MM/YYYY) to a Date object.
 * @param {string} dateStr - Date string in DD/MM/YYYY format.
 * @returns {Date|null} Parsed Date object or null if invalid.
 */
function parseFrenchDate(dateStr) {
  if (!dateStr) {
    return null;
  }
  const frenchDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (frenchDateMatch) {
    const [, day, month, year] = frenchDateMatch;
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    // Validate the date is valid
    if (date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day) {
      return date;
    }
  }
  return null;
}

/**
 * Parses date in YYYY-MM-DD format.
 * @param {string} dateStr - Date string in YYYY-MM-DD format.
 * @returns {string|null} Validated date string or null if invalid.
 */
function parseISODate(dateStr) {
  if (!dateStr) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return dateStr;
    }
  }
  return null;
}

/**
 * Parses date in DD/MM/YY format to YYYY-MM-DD.
 * @param {string} dateStr - Date string in DD/MM/YY format.
 * @returns {string|null} Date string in YYYY-MM-DD format or null if invalid.
 */
function parseShortFrenchDate(dateStr) {
  if (!dateStr) {
    return null;
  }
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = `20${year}`;
    const date = new Date(`${fullYear}-${month}-${day}`);
    if (date.getFullYear() === fullYear && date.getMonth() + 1 === month && date.getDate() === day) {
      return `${fullYear}-${month}-${day}`;
    }
  }
  return null;
}

/**
 * Normalizes department code to standard format.
 * @param {string} code - Department code to normalize.
 * @returns {string|null} Normalized department code or null if invalid.
 */
function normalizeDepartmentCode(code) {
  if (!code) {
    return null;
  }
  let normalized = code.trim().toUpperCase();
  // Pad numeric codes with leading zero
  if (/^\d+$/.test(normalized)) {
    normalized = normalized.padStart(2, '0');
  }
  // Validate against known department codes
  if (DEPARTMENT_CODE_REGEX.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Validates COG (Code Officiel Géographique) - 5-digit commune code.
 * @param {string} cog - COG code to validate.
 * @returns {boolean} True if valid COG code.
 */
function validateCOG(cog) {
  return cog && /^\d{5}$/.test(cog.trim());
}

/**
 * Parses a numeric field with validation.
 * @param {string|number} value - Value to parse.
 * @param {boolean} allowNull - Whether to allow null/undefined values.
 * @returns {number|null} Parsed number or null if invalid.
 */
function parseNumericField(value, allowNull = true) {
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : NaN;
  }
  const num = parseFloat(value);
  return !isNaN(num) ? num : (allowNull ? null : NaN);
}

/**
 * Parses an integer field with validation.
 * @param {string|number} value - Value to parse.
 * @param {boolean} allowNull - Whether to allow null/undefined values.
 * @returns {number|null} Parsed integer or null if invalid.
 */
function parseIntegerField(value, allowNull = true) {
  if (value === null || value === undefined || value === '') {
    return allowNull ? null : NaN;
  }
  const num = parseInt(value, 10);
  return !isNaN(num) ? num : (allowNull ? null : NaN);
}

/**
 * Parses boolean field from various representations.
 * @param {string|number|boolean} value - Value to parse.
 * @returns {number} 1 for true, 0 for false.
 */
function parseBooleanField(value) {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'number') {
    return value === 1 ? 1 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', '1.0', 'true', 'yes', 'oui'].includes(normalized) ? 1 : 0;
  }
  return 0;
}

/**
 * Trims and normalizes a string field.
 * @param {string} value - String to trim.
 * @param {boolean} allowNull - Whether to allow null/undefined values.
 * @returns {string|null} Trimmed string or null if empty and allowNull is true.
 */
function trimField(value, allowNull = true) {
  if (value === null || value === undefined) {
    return allowNull ? null : '';
  }
  const trimmed = value.trim();
  return trimmed || (allowNull ? null : '');
}

/**
 * Validates required fields in a row object.
 * @param {Object} row - Row object to validate.
 * @param {Array<string>} requiredFields - List of required field names.
 * @returns {Array<string>} Array of missing field names.
 */
function validateRequiredFields(row, requiredFields) {
  return requiredFields.filter(field => !row[field] || row[field].trim() === '');
}

/**
 * Validates sexe field (M/F).
 * @param {string} sexe - Sexe value to validate.
 * @returns {string|null} Uppercase M/F or null if invalid.
 */
function validateSexe(sexe) {
  if (!sexe) {
    return null;
  }
  const normalized = sexe.trim().toUpperCase();
  return ['M', 'F'].includes(normalized) ? normalized : null;
}

/**
 * Normalizes country code to uppercase.
 * @param {string} country - Country code to normalize.
 * @returns {string|null} Uppercase country code or null if empty.
 */
function normalizeCountryCode(country) {
  return country ? country.trim().toUpperCase() : null;
}

module.exports = {
  DEPARTMENT_CODE_REGEX,
  parseFrenchDate,
  parseISODate,
  parseShortFrenchDate,
  normalizeDepartmentCode,
  validateCOG,
  parseNumericField,
  parseIntegerField,
  parseBooleanField,
  trimField,
  validateRequiredFields,
  validateSexe,
  normalizeCountryCode
};