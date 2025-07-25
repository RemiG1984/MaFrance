/**
 * Centralized API service with caching and error handling.
 */

class ApiService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Makes cached API requests with consistent error handling.
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @param {boolean} useCache - Whether to use caching
     * @returns {Promise} API response data
     */
    async request(url, options = {}, useCache = true) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;

        // Check cache first
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                console.log('Using cached data for:', url);
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cache successful responses
            if (useCache) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API request failed:', { url, error: error.message || error });
            throw error;
        }
    }

    /**
     * Clears the API cache.
     */
    clearCache() {
        this.cache.clear();
    }
}

// Export singleton instance
export const apiService = new ApiService();

// Convenience methods for common endpoints
export const api = {
    // Department data
    getDepartmentDetails: (code) => 
        apiService.request(`/api/departements/details/${code}`),
    getDepartmentCrimeHistory: (code) => 
        apiService.request(`/api/departements/crime_history?dept=${code}`),
    getDepartmentNamesHistory: (code) => 
        apiService.request(`/api/departements/names_history?dept=${code}`),

    // Commune data
    getCommuneDetails: (dept, cog) => 
        apiService.request(`/api/communes/details/${dept}/${cog}`),
    getCommuneCrimeHistory: (dept, cog) => 
        apiService.request(`/api/communes/crime_history?dept=${dept}&cog=${cog}`),
    getCommuneNamesHistory: (dept, cog) => 
        apiService.request(`/api/communes/names_history?dept=${dept}&cog=${cog}`),

    // Country data
    getCountryDetails: (country = 'France') => 
        apiService.request(`/api/country/details?country=${country}`),
    getCountryExecutive: (country = 'France') => 
        apiService.request(`/api/country/ministre?country=${country}`),
    getCountryCrimeHistory: (country = 'France') => 
        apiService.request(`/api/country/crime_history?country=${country}`),
    getCountryNamesHistory: (country = 'France') => 
        apiService.request(`/api/country/names_history?country=${country}`),

    // Location data
    getDepartments: () => 
        apiService.request('/api/departements'),
    getCommunes: (dept) => 
        apiService.request(`/api/communes/${dept}`),
    getLieux: (dept, cog) => 
        apiService.request(`/api/lieux/${dept}/${cog}`),

    // QPV data
    getQpvDepartment: (code) => 
        apiService.request(`/api/qpv/departement/${code}`),
    getQpvCommune: (code) => 
        apiService.request(`/api/qpv/commune/${code}`),

    // Articles
    getArticles: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles?${queryString}`);
    }
};