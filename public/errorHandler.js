/**
 * Simple error handling utility
 */

export function displayError(container, message) {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

export function showLoading(container, message = 'Chargement...') {
    container.innerHTML = `<div class="loading">${message}</div>`;
}

export function hideLoading(container) {
    const loading = container.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}

// Simple default export
export default {
    displayError,
    showLoading,
    hideLoading
};