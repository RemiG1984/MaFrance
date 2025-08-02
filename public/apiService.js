/**
 * Centralized API service with caching and error handling.
 */

class ApiService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours - longer cache for reduced data transfer
        this.activeRequests = new Set();
        this.persistentStorage = this.initPersistentStorage();
    }

    /**
     * Initialize persistent storage for cross-session caching
     */
    initPersistentStorage() {
        try {
            return {
                get: (key) => {
                    const item = localStorage.getItem(`api_cache_${key}`);
                    return item ? JSON.parse(item) : null;
                },
                set: (key, value) => {
                    try {
                        localStorage.setItem(`api_cache_${key}`, JSON.stringify(value));
                    } catch (e) {
                        // Handle quota exceeded errors
                        console.warn('Cache storage full, clearing old entries');
                        this.clearOldCacheEntries();
                    }
                },
                remove: (key) => localStorage.removeItem(`api_cache_${key}`)
            };
        } catch (e) {
            // Fallback if localStorage is not available
            return { get: () => null, set: () => {}, remove: () => {} };
        }
    }

    /**
     * Clear old cache entries when storage is full
     */
    clearOldCacheEntries() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('api_cache_'));
        // Remove oldest 25% of cached items
        const keysToRemove = keys.slice(0, Math.floor(keys.length * 0.25));
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Makes cached API requests with consistent error handling.
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @param {boolean} useCache - Whether to use caching
     * @returns {Promise} API response data
     */
    async request(url, options = {}, useCache = true) {
        const cacheKey = this.generateCacheKey(url, options);

        if (useCache) {
            // Check memory cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log("Using memory cached data for:", url);
                    return cached.data;
                }
                this.cache.delete(cacheKey);
            }

            // Check persistent storage
            const persistentCached = this.persistentStorage.get(cacheKey);
            if (persistentCached && Date.now() - persistentCached.timestamp < this.cacheExpiry) {
                console.log("Using persistent cached data for:", url);
                // Also store in memory cache for faster subsequent access
                this.cache.set(cacheKey, persistentCached);
                return persistentCached.data;
            } else if (persistentCached) {
                // Remove expired persistent cache
                this.persistentStorage.remove(cacheKey);
            }
        }

        // Check if request is already in progress
        if (this.activeRequests.has(url)) {
            console.log("Request already in progress, waiting...", url);
            return new Promise((resolve, reject) => {
                const checkRequest = () => {
                    if (!this.activeRequests.has(url)) {
                        // Request completed, try cache again
                        if (this.cache.has(cacheKey)) {
                            resolve(this.cache.get(cacheKey).data);
                        } else {
                            reject(new Error("Request completed but no cached result"));
                        }
                    } else {
                        setTimeout(checkRequest, 100);
                    }
                };
                setTimeout(checkRequest, 100);
            });
        }

        try {
            this.activeRequests.add(url);

            const response = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }

            const data = await response.json();

            // Cache successful responses
            if (useCache && data) {
                const cacheEntry = {
                    data,
                    timestamp: Date.now(),
                };
                
                // Store in memory cache
                this.cache.set(cacheKey, cacheEntry);
                
                // Store in persistent cache for specific data types
                if (this.shouldPersistCache(url)) {
                    this.persistentStorage.set(cacheKey, cacheEntry);
                }
            }

            return data;
        } catch (error) {
            console.error("API request failed:", {
                url,
                error: error.message || error,
            });
            throw error;
        } finally {
            this.activeRequests.delete(url);
        }
    }

    /**
     * Generate consistent cache key
     */
    generateCacheKey(url, options) {
        const optionsStr = JSON.stringify(options || {});
        return btoa(encodeURIComponent(`${url}_${optionsStr}`)).replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Determine if data should be persistently cached
     */
    shouldPersistCache(url) {
        const persistentEndpoints = [
            '/api/departements/crime_history',
            '/api/departements/names_history', 
            '/api/communes/crime_history',
            '/api/communes/names_history',
            '/api/country/crime_history',
            '/api/country/names_history',
            '/api/qpv/',
            '/api/departements/details',
            '/api/communes/details',
            '/api/country/details',
            '/api/articles/lieux'
        ];
        
        return persistentEndpoints.some(endpoint => url.includes(endpoint));
    }

    /**
     * Clears the API cache.
     */
    clearCache() {
        this.cache.clear();
        
        // Clear persistent cache
        const keys = Object.keys(localStorage).filter(key => key.startsWith('api_cache_'));
        keys.forEach(key => localStorage.removeItem(key));
        
        console.log("All caches cleared");
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const memorySize = this.cache.size;
        const persistentKeys = Object.keys(localStorage).filter(key => key.startsWith('api_cache_'));
        const persistentSize = persistentKeys.length;
        
        return {
            memory: memorySize,
            persistent: persistentSize,
            total: memorySize + persistentSize
        };
    }
}

// Export singleton instance
export const apiService = new ApiService();

// Convenience methods for common endpoints
export const api = {
    // Department data
    getDepartmentDetails: (code) =>
        apiService.request(`/api/departements/details?dept=${code}`),
    getDepartmentCrimeHistory: (code) =>
        apiService.request(`/api/departements/crime_history?dept=${code}`),
    getDepartmentNamesHistory: (code) =>
        apiService.request(`/api/departements/names_history?dept=${code}`),

    // Commune data
    getCommuneDetails: (cog) =>
        apiService.request(`/api/communes/details?cog=${cog}`),
    getCommuneNames: (cog) =>
        apiService.request(`/api/communes/names?cog=${cog}`),
    getCommuneCrime: (cog) =>
        apiService.request(`/api/communes/crime?cog=${cog}`),
    getCommuneCrimeHistory: (cog) =>
        apiService.request(`/api/communes/crime_history?cog=${cog}`),
    getCommuneNamesHistory: (cog) =>
        apiService.request(`/api/communes/names_history?cog=${cog}`),

    // Additional department data
    getDepartmentNames: (code) =>
        apiService.request(`/api/departements/names?dept=${code}`),
    getDepartmentCrime: (code) =>
        apiService.request(`/api/departements/crime?dept=${code}`),

    // Country data
    getCountryDetails: (country = "France") =>
        apiService.request(`/api/country/details?country=${country}`),
    getCountryExecutive: (country = "France") =>
        apiService.request(`/api/country/ministre?country=${country}`),
    getCountryNames: (country = "France") =>
        apiService.request(`/api/country/names?country=${country}`),
    getCountryCrime: (country = "France") =>
        apiService.request(`/api/country/crime?country=${country}`),
    getCountryCrimeHistory: (country = "France") =>
        apiService.request(`/api/country/crime_history?country=${country}`),
    getCountryNamesHistory: (country = "France") =>
        apiService.request(`/api/country/names_history?country=${country}`),

    // Location data
    getDepartments: () => apiService.request("/api/departements"),
    getCommunes: (dept) => apiService.request(`/api/communes?dept=${dept}`),
    getLieux: (dept, cog) =>
        apiService.request(`/api/articles/lieux?dept=${dept}&cog=${cog}`),

    // QPV data
    getQpvDepartment: (code) =>
        apiService.request(`/api/qpv/departement/${code}`),
    getQpvCommune: (code) => apiService.request(`/api/qpv/commune/${code}`),

    // Executive data
    getDepartmentExecutive: (deptCode) =>
        apiService.request(`/api/departements/prefet?dept=${deptCode}`),
    getCommuneExecutive: (cog) =>
        apiService.request(
            `/api/communes/maire?cog=${encodeURIComponent(cog)}`,
        ),

    // Search functionality
    searchCommunes: (query) =>
        apiService.request(
            `/api/communes/search?q=${encodeURIComponent(query)}`,
        ),

    // Crime history data
    getCountryCrimeHistory: (country) =>
        apiService.request(
            `/api/country/crime_history?country=${encodeURIComponent(country)}`,
        ),
    getDepartmentCrimeHistory: (deptCode) =>
        apiService.request(`/api/departements/crime_history?dept=${deptCode}`),
    getCommuneCrimeHistory: (cog) =>
        apiService.request(`/api/communes/crime_history?cog=${cog}`),

    // Rankings data
    getDepartmentRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/rankings/departements?${queryString}`);
    },
    getCommuneRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/rankings/communes?${queryString}`);
    },

    // Articles
    getArticles: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles?${queryString}`);
    },
    getArticleCounts: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles/counts?${queryString}`);
    },
};
