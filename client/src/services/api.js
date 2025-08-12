
// Service API pour gérer les appels au backend avec cache
class ApiService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL || "";
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.activeRequests = new Map();
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
                        console.warn('Cache storage full, clearing old entries');
                        this.clearOldCacheEntries();
                    }
                },
                remove: (key) => localStorage.removeItem(`api_cache_${key}`)
            };
        } catch (e) {
            return { get: () => null, set: () => {}, remove: () => {} };
        }
    }

    /**
     * Clear old cache entries when storage is full
     */
    clearOldCacheEntries() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('api_cache_'));
        const keysToRemove = keys.slice(0, Math.floor(keys.length * 0.25));
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }

    /**
     * Generate consistent cache key
     */
    generateCacheKey(endpoint, options) {
        const optionsStr = JSON.stringify(options || {});
        return btoa(encodeURIComponent(`${endpoint}_${optionsStr}`)).replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Determine if endpoint should be persistently cached
     */
    shouldPersistCache(endpoint) {
        const persistentEndpoints = [
            '/api/departements/crime_history',
            '/api/departements/names_history', 
            '/api/communes/crime_history',
            '/api/communes/names_history',
            '/api/country/crime_history',
            '/api/country/names_history',
            '/api/departements/crime',
            '/api/departements/names',
            '/api/departements/prefet',
            '/api/communes/crime',
            '/api/communes/names',
            '/api/communes/maire',
            '/api/country/crime',
            '/api/country/names',
            '/api/country/ministre',
            '/api/qpv/',
            '/api/departements/details',
            '/api/communes/details',
            '/api/country/details',
            '/api/articles/lieux',
            '/api/articles',
            '/api/articles/counts',
            '/api/departements',
            '/api/communes',
            '/api/rankings/departements',
            '/api/rankings/communes',
            '/api/communes/search',
            '/api/migrants/departement/',
            '/api/migrants/commune/',
            '/api/subventions/country/',
            '/api/subventions/departement/',
            '/api/subventions/commune/'
        ];
        
        return persistentEndpoints.some(pattern => endpoint.includes(pattern));
    }

    async request(endpoint, options = {}, useCache = true) {
        const cacheKey = this.generateCacheKey(endpoint, options);
        const url = `${this.baseURL}${endpoint}`;

        if (useCache) {
            // Check memory cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log("Using memory cached data for:", endpoint);
                    return cached.data;
                }
                this.cache.delete(cacheKey);
            }

            // Check persistent storage
            const persistentCached = this.persistentStorage.get(cacheKey);
            if (persistentCached && Date.now() - persistentCached.timestamp < this.cacheExpiry) {
                console.log("Using persistent cached data for:", endpoint);
                this.cache.set(cacheKey, persistentCached);
                return persistentCached.data;
            } else if (persistentCached) {
                this.persistentStorage.remove(cacheKey);
            }
        }

        // Check if request is already in progress
        if (this.activeRequests.has(endpoint)) {
            console.log("Request already in progress, waiting...", endpoint);
            return this.activeRequests.get(endpoint);
        }

        const config = {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        };

        const requestPromise = fetch(url, config)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then((data) => {
                // Cache successful responses
                if (useCache && data) {
                    const cacheEntry = {
                        data,
                        timestamp: Date.now(),
                    };
                    
                    // Store in memory cache
                    this.cache.set(cacheKey, cacheEntry);
                    
                    // Store in persistent cache for specific data types
                    if (this.shouldPersistCache(endpoint)) {
                        this.persistentStorage.set(cacheKey, cacheEntry);
                    }
                }
                return data;
            })
            .catch((error) => {
                console.error(`API request failed: ${endpoint}`, error);
                return null;
            })
            .finally(() => {
                this.activeRequests.delete(endpoint);
            });

        this.activeRequests.set(endpoint, requestPromise);
        return requestPromise;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        
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
const apiService = new ApiService();

// Convenience methods for common endpoints
const api = {
    // Country data
    getCountryDetails: (country = "France") =>
        apiService.request(`/api/country/details?country=${country}`),
    getCountryNames: (country = "France") =>
        apiService.request(`/api/country/names?country=${country}`),
    getCountryCrime: (country = "France") =>
        apiService.request(`/api/country/crime?country=${country}`),
    getCountryCrimeHistory: (country = "France") =>
        apiService.request(`/api/country/crime_history?country=${country}`),
    getCountryNamesHistory: (country = "France") =>
        apiService.request(`/api/country/names_history?country=${country}`),
    getCountryExecutive: (country = "France") =>
        apiService.request(`/api/country/ministre?country=${country}`),
    getCountryArticles: (country = "France") =>
        apiService.request(`/api/articles?country=${country}`),

    // Departement data
    getDepartementDetails: (code) =>
        apiService.request(`/api/departements/details?dept=${code}`),
    getDepartementNames: (code) =>
        apiService.request(`/api/departements/names?dept=${code}`),
    getDepartementCrime: (code) =>
        apiService.request(`/api/departements/crime?dept=${code}`),
    getDepartementCrimeHistory: (code) =>
        apiService.request(`/api/departements/crime_history?dept=${code}`),
    getDepartementNamesHistory: (code) =>
        apiService.request(`/api/departements/names_history?dept=${code}`),
    getDepartementQpv: (code) =>
        apiService.request(`/api/qpv/departement/${code}`),
    getDepartementExecutive: (deptCode) =>
        apiService.request(`/api/departements/prefet?dept=${deptCode}`),
    getDepartementRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/rankings/departements?${queryString}`);
    },

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
    getCommuneQpv: (code) => apiService.request(`/api/qpv/commune/${code}`),
    getCommuneExecutive: (cog) =>
        apiService.request(
            `/api/communes/maire?cog=${encodeURIComponent(cog)}`,
        ),
    getCommuneRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/rankings/communes?${queryString}`);
    },

    // Search functionality
    searchCommunes: (query) =>
        apiService.request(
            `/api/communes/search?q=${encodeURIComponent(query)}`,
        ),

    // Location data
    getDepartements: () => apiService.request("/api/departements"),
    getCommunes: (dept) => apiService.request(`/api/communes?dept=${dept}`),
    getLieux: (dept, cog) =>
        apiService.request(`/api/articles/lieux?dept=${dept}&cog=${cog}`),

    // Articles
    getArticles: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles?${queryString}`, {}, !params.cursor); // Don't cache paginated requests
    },
    getArticleCounts: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles/counts?${queryString}`);
    },

    // Subventions data
    getCountrySubventions: (country = "france") =>
        apiService.request(`/api/subventions/country/${country}`),
    getDepartementSubventions: (code) =>
        apiService.request(`/api/subventions/departement/${code}`),
    getCommuneSubventions: (cog) =>
        apiService.request(`/api/subventions/commune/${cog}`),

    // Migrant centers data
    getDepartementMigrants: (code, params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/migrants/departement/${code}`;
        return apiService.request(queryString ? `${url}?${queryString}` : url, {}, !params.cursor);
    },
    getCommuneMigrants: (cog, params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/migrants/commune/${cog}`;
        return apiService.request(queryString ? `${url}?${queryString}` : url, {}, !params.cursor);
    },

    // Cache management
    clearCache: () => apiService.clearCache(),
    getCacheStats: () => apiService.getCacheStats(),
};

export default api;
