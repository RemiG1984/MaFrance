// utils.js
/**
 * Utility functions for common operations across the application.
 * This file promotes DRY principle by centralizing reusable logic.
 */

/**
 * Normalizes a department code by trimming, uppercasing, and padding with zero if numeric.
 * @param {string} code - The department code to normalize.
 * @returns {string} The normalized department code.
 */
export function normalizeDept(code) {
  code = code.trim().toUpperCase();
  if (/^\d+$/.test(code)) {
    code = code.padStart(2, "0");
  }
  return code;
}

/**
 * Formats a percentage with one decimal or returns 'N/A' if invalid.
 * @param {number|null|undefined} value - The value to format.
 * @returns {string} Formatted percentage or 'N/A'.
 */
export function formatPercentage(value) {
  if (value == null || isNaN(value)) return "N/A";
  return value.toFixed(1) + "%";
}

/**
 * Debounces a function to limit execution rate.
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Formats a date from YYYY-MM-DD to DD/MM/YYYY.
 * @param {string} dateStr - The date string to format.
 * @returns {string} Formatted date or empty string if invalid.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Formats numbers with French locale formatting
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(number) {
  if (number == null || isNaN(number)) return "N/A";
  return number.toLocaleString("fr-FR");
}

// Import department names
import './departmentNames.js';
const DepartmentNames = window.DepartmentNames || {};

// Re-export DepartmentNames for backward compatibility
export { DepartmentNames };