/**
 * Simple validation utilities
 */

export function validateDepartment(code) {
    if (!code) return false;
    const normalized = code.trim().toUpperCase();
    return /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(normalized);
}

export function validateCommune(name) {
    if (!name) return false;
    return name.trim().length >= 2;
}