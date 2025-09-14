// Service API pour gérer les appels au backend avec cache
class ApiService {
    constructor() {
        this.baseURL = import.meta.env.VITE_API_BASE_URL || "";
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.activeRequests = new Map();
        this.persistentStorage = this.initPersistentStorage();
        this.lastBuildHash = localStorage.getItem('app_build_hash');
        this.buildCheckPromise = this.checkBuildVersion();
    }

    /**
     * Check if build version has changed and clear cache if needed
     */
    async checkBuildVersion() {
        try {
            // Check if we have an embedded build hash first
            const embeddedBuildHash = window.__BUILD_HASH__;

            if (embeddedBuildHash && this.lastBuildHash && this.lastBuildHash !== embeddedBuildHash) {
                console.log('New build detected (embedded hash), clearing all caches');
                this.clearCache();

                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                }

                localStorage.setItem('app_build_hash', embeddedBuildHash);
                this.lastBuildHash = embeddedBuildHash;

                // Force page reload to ensure fresh start
                setTimeout(() => {
                    window.location.reload(true);
                }, 100);
                return;
            }

            // Fallback to server check if no embedded hash
            if (!embeddedBuildHash) {
                const response = await fetch('/api/version?' + Date.now());
                if (response.ok) {
                    const versionInfo = await response.json();
                    const currentBuildHash = versionInfo.buildHash;

                    if (this.lastBuildHash && this.lastBuildHash !== currentBuildHash) {
                        console.log('New build detected (server hash), clearing all caches');
                        this.clearCache();

                        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                        }

                        localStorage.setItem('app_build_hash', currentBuildHash);
                        this.lastBuildHash = currentBuildHash;

                        setTimeout(() => {
                            window.location.reload(true);
                        }, 100);
                        return;
                    }

                    localStorage.setItem('app_build_hash', currentBuildHash);
                    this.lastBuildHash = currentBuildHash;
                }
            } else {
                // Store embedded hash if it's the first time
                if (!this.lastBuildHash) {
                    localStorage.setItem('app_build_hash', embeddedBuildHash);
                    this.lastBuildHash = embeddedBuildHash;
                }
            }
        } catch (error) {
            console.warn('Failed to check build version:', error);
        }
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
                        localStorage.setItem(
                            `api_cache_${key}`,
                            JSON.stringify(value),
                        );
                    } catch (e) {
                        console.warn(
                            "Cache storage full, clearing old entries",
                        );
                        this.clearOldCacheEntries();
                    }
                },
                remove: (key) => localStorage.removeItem(`api_cache_${key}`),
            };
        } catch (e) {
            return { get: () => null, set: () => {}, remove: () => {} };
        }
    }

    /**
     * Clear old cache entries when storage is full
     */
    clearOldCacheEntries() {
        const keys = Object.keys(localStorage).filter((key) =>
            key.startsWith("api_cache_"),
        );
        const keysToRemove = keys.slice(0, Math.floor(keys.length * 0.25));
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    /**
     * Generate consistent cache key
     */
    generateCacheKey(endpoint, options) {
        const optionsStr = JSON.stringify(options || {});
        return btoa(encodeURIComponent(`${endpoint}_${optionsStr}`)).replace(
            /[^a-zA-Z0-9]/g,
            "_",
        );
    }

    /**
     * Determine if endpoint should be persistently cached
     */
    shouldPersistCache(endpoint) {
        const persistentEndpoints = [
            "/departements/crime_history",
            "/departements/names_history",
            "/communes/crime_history",
            "/communes/names_history",
            "/country/crime_history",
            "/country/names_history",
            "/departements/crime",
            "/departements/names",
            "/departements/prefet",
            "/communes/crime",
            "/communes/names",
            "/communes/maire",
            "/country/crime",
            "/country/names",
            "/country/ministre",
            "/qpv/",
            "/departements/details",
            "/communes/details",
            "/country/details",
            "/articles/lieux",
            "/articles",
            "/articles/counts",
            "/departements",
            "/communes",
            "/rankings/departements",
            "/rankings/communes",
            "/communes/search",
            "/migrants/departement/",
            "/migrants/commune/",
            "/subventions/country/",
            "/subventions/departement/",
            "/subventions/commune/",
        ];

        return persistentEndpoints.some((pattern) =>
            endpoint.includes(pattern),
        );
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

            // Ensure build check completes before using persistent cache
            await this.buildCheckPromise;

            // Check persistent storage
            const persistentCached = this.persistentStorage.get(cacheKey);
            if (
                persistentCached &&
                Date.now() - persistentCached.timestamp < this.cacheExpiry
            ) {
                console.log("Using persistent cached data for:", endpoint);
                this.cache.set(persistentCached, persistentCached);
                return persistentCached.data;
            } else if (persistentCached) {
                this.persistentStorage.remove(cacheKey);
            }
        }

        // Check if the exact same request (including parameters) is already in progress
        const requestKey = `${endpoint}?${new URLSearchParams(options.body ? JSON.parse(options.body) : {}).toString()}`;
        if (this.activeRequests.has(requestKey)) {
            console.log("Request already in progress, waiting...", requestKey);
            return this.activeRequests.get(requestKey);
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
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`,
                    );
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
                this.activeRequests.delete(requestKey);
            });

        this.activeRequests.set(requestKey, requestPromise);
        return requestPromise;
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();

        const keys = Object.keys(localStorage).filter((key) =>
            key.startsWith("api_cache_"),
        );
        keys.forEach((key) => localStorage.removeItem(key));

        console.log("All caches cleared");
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const memorySize = this.cache.size;
        const persistentKeys = Object.keys(localStorage).filter((key) =>
            key.startsWith("api_cache_"),
        );
        const persistentSize = persistentKeys.length;

        return {
            memory: memorySize,
            persistent: persistentSize,
            total: memorySize + persistentSize,
        };
    }



    // Add other API methods here as needed
}

// Helper function to build query string
const buildQueryString = (params) => {
    const queryString = new URLSearchParams(params).toString();
    return queryString ? `?${queryString}` : "";
};

// Export singleton instance
const apiService = new ApiService();

// Convenience methods for common endpoints
const api = {
    // Country data
    getCountryDetails: (country = "France") =>
        apiService.request(`/country/details?country=${country}`),
    getCountryNames: (country = "France") =>
        apiService.request(`/country/names?country=${country}`),
    getCountryCrime: (country = "France") =>
        apiService.request(`/country/crime?country=${country}`),
    getCountryCrimeHistory: (country = "France") =>
        apiService.request(`/country/crime_history?country=${country}`),
    getCountryNamesHistory: (country = "France") =>
        apiService.request(`/country/names_history?country=${country}`),
    getCountryExecutive: (country = "France") =>
        apiService.request(`/country/ministre?country=${country}`),
    getCountryArticles: (country = "France") =>
        apiService.request(`/articles?country=${country}`),

    // Departement data
    getDepartementDetails: (code) =>
        apiService.request(`/departements/details?dept=${code}`),
    getDepartementNames: (code) =>
        apiService.request(`/departements/names?dept=${code}`),
    getDepartementCrime: (code) =>
        apiService.request(`/departements/crime?dept=${code}`),
    getDepartementCrimeHistory: (code) =>
        apiService.request(`/departements/crime_history?dept=${code}`),
    getDepartementNamesHistory: (code) =>
        apiService.request(`/departements/names_history?dept=${code}`),
    getDepartementExecutive: (deptCode) =>
        apiService.request(`/departements/prefet?dept=${deptCode}`),
    getDepartementRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/rankings/departements?${queryString}`);
    },

    // Commune data
    getCommuneDetails: (cog) =>
        apiService.request(`/communes/details?cog=${cog}`),
    getCommuneNames: (cog) =>
        apiService.request(`/communes/names?cog=${cog}`),
    getCommuneCrime: (cog) =>
        apiService.request(`/communes/crime?cog=${cog}`),
    getCommuneCrimeHistory: (cog) =>
        apiService.request(`/communes/crime_history?cog=${cog}`),
    getCommuneNamesHistory: (cog) =>
        apiService.request(`/communes/names_history?cog=${cog}`),
    getCommuneExecutive: (cog) =>
        apiService.request(
            `/communes/maire?cog=${encodeURIComponent(cog)}`,
        ),
    getCommuneRankings: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/rankings/communes?${queryString}`);
    },



    // Search functionality
    searchCommunes: (query) =>
        apiService.request(
            `/communes/search?q=${encodeURIComponent(query)}`,
        ),

    // Location data
    getDepartements: () => apiService.request("/departements"),
    getCommunes: (dept) => apiService.request(`/communes?dept=${dept}`),
    getLieux: (dept, cog) =>
        apiService.request(`/articles/lieux?dept=${dept}&cog=${cog}`),

    // Articles
    getArticles: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(
            `/articles?${queryString}`,
            {},
            !params.cursor,
        ); // Don't cache paginated requests
    },
    getArticleCounts: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/articles/counts?${queryString}`);
    },

    // Subventions data
    getCountrySubventions: (country = "france") =>
        apiService.request(`/subventions/country/${country}`),
    getDepartementSubventions: (code) =>
        apiService.request(`/subventions/departement/${code}`),
    getCommuneSubventions: (cog) =>
        apiService.request(`/subventions/commune/${cog}`),

    // Migrant centers data
    getMigrants: (params = {}) => {
        const queryString = buildQueryString(params);
        const url = `/migrants`;
        return apiService.request(
            queryString ? `${url}${queryString}` : url,
            {},
            !params.cursor,
        );
    },

    // QPV data
    getQpv: (params = {}) => {
        const queryString = buildQueryString(params);
        return apiService.request(`/qpv${queryString}`);
    },

    getQpvs: () => apiService.request('/qpv/geojson'),

    getNearbyQpv: (lat, lng, limit = 5) => {
        const params = { lat, lng, limit };
        const queryString = buildQueryString(params);
        return apiService.request(`/qpv/nearby${queryString}`);
    },

    // NAT1 data
    getCountryNat1: (country = "France") =>
        apiService.request(`/nat1/country?country=${country}`),
    getDepartementNat1: (code) =>
        apiService.request(`/nat1/departement?dept=${code}`),
    getCommuneNat1: (cog) =>
        apiService.request(`/nat1/commune?cog=${cog}`),
    getNat1Summary: () =>
        apiService.request("/nat1/all"),



    // Cache management
    clearCache: () => apiService.clearCache(),
    getCacheStats: () => apiService.getCacheStats(),
};

export default api;