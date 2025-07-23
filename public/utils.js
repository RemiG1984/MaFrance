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
    code = code.padStart(2, '0');
  }
  return code;
}

/**
 * Formats a number with French locale or returns 'N/A' if invalid.
 * @param {number|null|undefined} value - The value to format.
 * @returns {string} Formatted number or 'N/A'.
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return 'N/A';
  return value.toLocaleString('fr-FR');
}

/**
 * Formats a percentage with one decimal or returns 'N/A' if invalid.
 * @param {number|null|undefined} value - The value to format.
 * @returns {string} Formatted percentage or 'N/A'.
 */
export function formatPercentage(value) {
  if (value == null || isNaN(value)) return 'N/A';
  return value.toFixed(1) + '%';
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
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formats metric values based on type (e.g., percentage, score).
 * @param {number|null|undefined} value - The value to format.
 * @param {string} metric - The metric key.
 * @returns {string} Formatted value.
 */
export function formatMetricValue(value, metric) {
  if (value == null) return 'N/A';
  if (metric === 'pop_in_qpv_pct') return formatPercentage(value, 0);
  if (metric === 'total_qpv') return value.toString();
  if (metric.includes('_pct')) return `${value.toFixed(0)}%`;
  if (metric.includes('_p100k') || metric.includes('_p1k')) return value.toFixed(1);
  if (metric.includes('_score')) return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return value.toString();
}