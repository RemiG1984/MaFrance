const {
  validateDepartement,
  validateCOG,
  validateSearchQuery,
  validateSort,
  validateDirection,
  validatePagination,
  validatePopulationRange,
  validateCountry,
  validateLieu
} = require('../../middleware/validate');

describe('Validation Middleware', () => {
  describe('Validation Arrays Structure', () => {
    it('should export validation arrays', () => {
      expect(Array.isArray(validateDepartement)).toBe(true);
      expect(Array.isArray(validateCOG)).toBe(true);
      expect(Array.isArray(validateSort)).toBe(true);
      expect(Array.isArray(validateDirection)).toBe(true);
      expect(Array.isArray(validatePagination)).toBe(true);
      expect(Array.isArray(validatePopulationRange)).toBe(true);
      expect(Array.isArray(validateCountry)).toBe(true);
      expect(Array.isArray(validateLieu)).toBe(true);
      expect(typeof validateSearchQuery).toBe('function');
    });

    it('should have proper structure for express-validator arrays', () => {
      // Most validation arrays should have at least 2 elements (validator + error handler)
      expect(validateDepartement.length).toBeGreaterThanOrEqual(2);
      expect(validateCOG.length).toBeGreaterThanOrEqual(2);
      expect(validateSort.length).toBeGreaterThanOrEqual(2);
      expect(validateDirection.length).toBeGreaterThanOrEqual(2);
      expect(validatePagination.length).toBeGreaterThanOrEqual(2);
      expect(validatePopulationRange.length).toBeGreaterThanOrEqual(2);
      expect(validateCountry.length).toBeGreaterThanOrEqual(2);
      expect(validateLieu.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Validation Constants', () => {
    it('should validate department regex pattern', () => {
      const deptRegex = /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/;
      expect(deptRegex.test('75')).toBe(true);
      expect(deptRegex.test('01')).toBe(true);
      expect(deptRegex.test('2A')).toBe(true);
      expect(deptRegex.test('971')).toBe(true);
      expect(deptRegex.test('999')).toBe(false);
    });

    it('should validate COG regex pattern', () => {
      const cogRegex = /^(?:[0-9]{5}|2[AB][0-9]{3}|97[1-6][0-9]{2}|[0-9]{4})$/;
      expect(cogRegex.test('75001')).toBe(true);
      expect(cogRegex.test('0101')).toBe(true);
      expect(cogRegex.test('2A001')).toBe(true);
      expect(cogRegex.test('97101')).toBe(true);
      expect(cogRegex.test('invalid')).toBe(false);
    });
  });
});