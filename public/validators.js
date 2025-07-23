/**
 * Input validation utilities for form data.
 */

/**
 * Validates department code format.
 * @param {string} code - Department code to validate
 * @returns {boolean} Whether the code is valid
 */
export function isValidDepartmentCode(code) {
    if (!code || typeof code !== 'string') return false;

    const trimmed = code.trim().toUpperCase();

    // Standard department codes (01-95, 2A, 2B)
    const standardPattern = /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB])$/;

    // DOM-TOM codes
    const domTomPattern = /^(97[1-6]|98[6-8])$/;

    return standardPattern.test(trimmed) || domTomPattern.test(trimmed);
}

/**
 * Validates commune name format.
 * @param {string} name - Commune name to validate
 * @returns {boolean} Whether the name is valid
 */
export function isValidCommuneName(name) {
    if (!name || typeof name !== 'string') return false;

    const trimmed = name.trim();

    // Must be at least 2 characters, only letters, spaces, hyphens, apostrophes
    return trimmed.length >= 2 && /^[a-zA-ZÀ-ÿ\s\-']+$/.test(trimmed);
}

/**
 * Sanitizes input to prevent XSS.
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/[<>"/]/g, '') // Remove potential HTML/script characters
        .substring(0, 100); // Limit length
}

/**
 * Validates URL parameters.
 * @param {Object} params - URL parameters object
 * @returns {Object} Validation result with errors array
 */
export function validateUrlParams(params) {
    const errors = [];

    if (params.type) {
        const validTypes = ['country', 'department', 'commune'];
        if (!validTypes.includes(params.type)) {
            errors.push('Type de lieu invalide');
        }
    }

    if (params.dept && !isValidDepartmentCode(params.dept)) {
        errors.push('Code département invalide');
    }

    if (params.commune && !isValidCommuneName(params.commune)) {
        errors.push('Nom de commune invalide');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validation utilities for data integrity checks.
 */

/**
 * Validates department code format (alternative implementation).
 * @param {string} dept - Department code to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateDepartment(dept) {
    const errors = [];

    if (!dept) {
        errors.push('Department code is required');
        return { isValid: false, errors };
    }

    // Valid department codes: 01-95, 2A, 2B, 971-976
    const validPattern = /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/;

    if (!validPattern.test(dept)) {
        errors.push('Invalid department code format');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates commune name format.
 * @param {string} commune - Commune name to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateCommune(commune) {
    const errors = [];

    if (!commune) {
        errors.push('Commune name is required');
        return { isValid: false, errors };
    }

    if (commune.length < 2) {
        errors.push('Commune name must be at least 2 characters');
    }

    if (commune.length > 100) {
        errors.push('Commune name too long');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}