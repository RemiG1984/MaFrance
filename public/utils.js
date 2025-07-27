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
 * Formats a number with French locale or returns 'N/A' if invalid.
 * @param {number|null|undefined} value - The value to format.
 * @returns {string} Formatted number or 'N/A'.
 */
export function formatNumber(value) {
  if (value == null || isNaN(value)) return "N/A";
  return value.toLocaleString("fr-FR");
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

class TextUtils {
    static normalizeText(text) {
        if (typeof text !== 'string') return '';
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }
}

/**
 * Sets up a custom autocomplete suggestion list that mimics <datalist> but with accent-insensitive and case-insensitive matching.
 * This function creates a dropdown below the input element to show filtered suggestions.
 * 
 * @param {string} inputId - The ID of the <input> element (e.g., 'searchInput').
 * @param {string} suggestionsContainerId - The ID of the <div> element for suggestions (e.g., 'suggestions'). It should be styled appropriately (e.g., position: absolute).
 * @param {Array<string>} options - The array of suggestion strings (e.g., API-fetched cities like ["Nîmes", "Paris"]).
 * 
 * Usage:
 * - In HTML: <input id="searchInput"> <div id="suggestions"></div>
 * - Call: setupCustomAutocomplete('searchInput', 'suggestions', apiCities);
 * - Update options dynamically if needed by calling the function again with new options.
 */
function setupCustomAutocomplete(inputId, suggestionsContainerId, options) {
    const inputElement = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsContainerId);

    if (!inputElement || !suggestionsContainer) {
        console.error('Input or suggestions container not found.');
        return;
    }

    // Function to show/hide and populate suggestions
    function updateSuggestions(inputValue) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';

        if (!inputValue) return;

        const normalizedInput = TextUtils.normalizeText(inputValue);
        const filteredOptions = options.filter(option => 
            TextUtils.normalizeText(option).includes(normalizedInput)
        );

        if (filteredOptions.length === 0) return;

        filteredOptions.forEach(option => {
            const suggestionItem = document.createElement('div');
            suggestionItem.textContent = option;
            suggestionItem.style.padding = '8px';
            suggestionItem.style.cursor = 'pointer';
            suggestionItem.style.borderBottom = '1px solid #eee';
            suggestionItem.addEventListener('click', () => {
                inputElement.value = option;
                suggestionsContainer.style.display = 'none';
            });
            suggestionsContainer.appendChild(suggestionItem);
        });

        suggestionsContainer.style.display = 'block';
    }

    // Event listener for input changes
    inputElement.addEventListener('input', (e) => {
        updateSuggestions(e.target.value);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== inputElement) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Optional: Hide on blur, but allow click on suggestions
    inputElement.addEventListener('blur', () => {
        setTimeout(() => {
            suggestionsContainer.style.display = 'none';
        }, 100); // Delay to allow click event on suggestions
    });
}


