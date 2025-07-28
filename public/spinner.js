
/**
 * Spinner utility for showing loading states during data fetching
 */

class SpinnerManager {
    constructor() {
        this.spinners = new Map();
    }

    /**
     * Shows a spinner in the specified container
     * @param {string|HTMLElement} container - Container element or selector
     * @param {string} message - Optional loading message
     * @returns {string} Spinner ID for removal
     */
    show(container, message = 'Chargement...') {
        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!element) {
            console.warn('Spinner container not found:', container);
            return null;
        }

        const spinnerId = this.generateId();
        const spinnerHtml = this.createSpinnerHtml(message, spinnerId);
        
        // Store original content and display
        const originalContent = element.innerHTML;
        const originalDisplay = element.style.display;
        
        this.spinners.set(spinnerId, {
            element,
            originalContent,
            originalDisplay
        });

        // Show spinner
        element.innerHTML = spinnerHtml;
        element.style.display = 'flex';
        element.classList.add('loading-container');

        return spinnerId;
    }

    /**
     * Hides the spinner and restores original content
     * @param {string} spinnerId - Spinner ID returned from show()
     */
    hide(spinnerId) {
        if (!spinnerId || !this.spinners.has(spinnerId)) {
            return;
        }

        const spinner = this.spinners.get(spinnerId);
        const { element, originalContent, originalDisplay } = spinner;

        // Restore original content and display
        element.innerHTML = originalContent;
        element.style.display = originalDisplay;
        element.classList.remove('loading-container');

        this.spinners.delete(spinnerId);
    }

    /**
     * Creates spinner HTML
     * @param {string} message - Loading message
     * @param {string} spinnerId - Unique spinner ID
     * @returns {string} Spinner HTML
     */
    createSpinnerHtml(message, spinnerId) {
        return `
            <div class="spinner-container" data-spinner-id="${spinnerId}">
                <div class="spinner"></div>
                <div class="spinner-message">${message}</div>
            </div>
        `;
    }

    /**
     * Generates unique spinner ID
     * @returns {string} Unique ID
     */
    generateId() {
        return 'spinner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Wraps an async function with spinner display
     * @param {string|HTMLElement} container - Container for spinner
     * @param {Function} asyncFn - Async function to execute
     * @param {string} message - Loading message
     * @returns {Promise} Result of async function
     */
    async wrap(container, asyncFn, message = 'Chargement...') {
        const spinnerId = this.show(container, message);
        try {
            const result = await asyncFn();
            return result;
        } finally {
            this.hide(spinnerId);
        }
    }
}

// Export singleton instance
export const spinner = new SpinnerManager();
