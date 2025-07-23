/**
 * Centralized error handling utility for consistent error display and logging.
 */

/**
 * Displays user-friendly error messages with retry options.
 * @param {HTMLElement} container - Container to display error
 * @param {Error} error - The error object
 * @param {Function} retryCallback - Optional retry function
 */
export function displayError(container, error, retryCallback = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-container';
    errorDiv.innerHTML = `
        <div class="error-message">
            <h3>Une erreur s'est produite</h3>
            <p>${getErrorMessage(error)}</p>
            ${retryCallback ? '<button class="retry-btn" onclick="retry()">Réessayer</button>' : ''}
        </div>
    `;

    if (retryCallback) {
        errorDiv.querySelector('.retry-btn').addEventListener('click', retryCallback);
    }

    container.innerHTML = '';
    container.appendChild(errorDiv);
    console.error('Error displayed to user:', error);
}

/**
 * Gets user-friendly error message from error object.
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Problème de connexion. Vérifiez votre connexion internet.';
    }
    if (error.message.includes('404')) {
        return 'Données non trouvées pour cette sélection.';
    }
    if (error.message.includes('500')) {
        return 'Erreur du serveur. Veuillez réessayer plus tard.';
    }
    return error.message || 'Une erreur inconnue s\'est produite.';
}

/**
 * Loading state manager for better UX during API calls.
 */
export class LoadingManager {
    constructor(container) {
        this.container = container;
        this.isLoading = false;
    }

    show(message = 'Chargement...') {
        if (this.isLoading) return;
        this.isLoading = true;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-container';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;

        this.container.innerHTML = '';
        this.container.appendChild(loadingDiv);
    }

    hide() {
        this.isLoading = false;
    }
}
// Export for ES6 modules (default export)
export default function ErrorHandler() {
    return {
        handleError: (error, context) => {
            console.error(`Error in ${context}:`, error);
            displayError(document.body, error);
        }
    };
}

// Named exports
export { LoadingManager, displayError };

// Make available globally for backward compatibility
if (typeof window !== 'undefined') {
    window.ErrorHandler = function() {
        return {
            handleError: (error, context) => {
                console.error(`Error in ${context}:`, error);
                displayError(document.body, error);
            }
        };
    };
}