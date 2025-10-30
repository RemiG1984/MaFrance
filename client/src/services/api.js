// Service API pour gérer les appels au backend avec cache
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '';
    this.cache = new Map();
    this.cacheExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
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
    } catch {
      // Ignore errors
    }
  }

  /**
     * Initialize persistent storage for cross-session caching
     */
  initPersistentStorage() {
    try {
      const storage = {
        get: (key) => {
          const item = localStorage.getItem(`api_cache_${key}`);
          return item ? JSON.parse(item) : null;
        },
        set: (key, value) => {
          try {
            localStorage.setItem(
              `api_cache_${key}`,
              JSON.stringify(value)
            );
          } catch {
            // Cache storage full, clearing old entries
            this.clearOldCacheEntries();
          }
        },
        remove: (key) => localStorage.removeItem(`api_cache_${key}`)
      };
      return storage;
    } catch {
      return { get: () => null, set: () => {}, remove: () => {} };
    }
  }

  /**
     * Clear old cache entries when storage is full
     */
  clearOldCacheEntries() {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('api_cache_')
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
      '_'
    );
  }

  /**
     * Determine if endpoint should be persistently cached
     */
  shouldPersistCache(endpoint) {
    const persistentPatterns = [
      '/departements',
      '/communes',
      '/country',
      '/qpv',
      '/rankings',
      '/subventions',
      '/migrants',
      '/mosques',
      '/nat1',
      '/articles'
    ];

    return persistentPatterns.some((pattern) =>
      endpoint.startsWith(pattern)
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
        this.cache.set(persistentCached, persistentCached);
        return persistentCached.data;
      } else if (persistentCached) {
        this.persistentStorage.remove(cacheKey);
      }
    }

    // Check if the exact same request (including parameters) is already in progress
    const requestKey = `${endpoint}?${new URLSearchParams(options.body ? JSON.parse(options.body) : {}).toString()}`;
    if (this.activeRequests.has(requestKey)) {
      return this.activeRequests.get(requestKey);
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const requestPromise = fetch(url, config)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        // Cache successful responses
        if (useCache && data) {
          const cacheEntry = {
            data,
            timestamp: Date.now()
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
      .catch(() => {
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
      key.startsWith('api_cache_')
    );
    keys.forEach((key) => localStorage.removeItem(key));

  }

  /**
     * Get cache statistics
     */
  getCacheStats() {
    const memorySize = this.cache.size;
    const persistentKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('api_cache_')
    );
    const persistentSize = persistentKeys.length;

    return {
      memory: memorySize,
      persistent: persistentSize,
      total: memorySize + persistentSize
    };
  }

  // Add other API methods here as needed
}

// Helper function to build query string
const buildQueryString = (params) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : '';
};

// Export singleton instance
const apiService = new ApiService();

// Convenience methods for common endpoints
const api = {
  // Country data
  getCountryDetails: () =>
    apiService.request('/country/details'),
  getCountryNames: () =>
    apiService.request('/country/names'),
  getCountryCrime: () =>
    apiService.request('/country/crime'),
  getCountryCrimeHistory: (country) =>
    apiService.request(`/country/crime_history${country ? `?country=${encodeURIComponent(country)}` : ''}`),
  getCountryNamesHistory: (country) =>
    apiService.request(`/country/names_history${country ? `?country=${encodeURIComponent(country)}` : ''}`),
  getCountryExecutive: () =>
    apiService.request('/country/ministre'),
  getCountryArticles: (country = 'France') =>
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
      `/communes/maire?cog=${encodeURIComponent(cog)}`
    ),
  getCommuneRankings: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiService.request(`/rankings/communes?${queryString}`);
  },

  // Search functionality
  searchCommunes: (query) =>
    apiService.request(
      `/communes/search?q=${encodeURIComponent(query)}`
    ),

  // Location data
  getDepartements: () => apiService.request('/departements'),
  getCommunes: (dept) => apiService.request(`/communes?dept=${dept}`),
  getLieux: (dept, cog) =>
    apiService.request(`/articles/lieux?dept=${dept}&cog=${cog}`),

  // Articles
  getArticles: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiService.request(
      `/articles?${queryString}`,
      {},
      !params.cursor
    ); // Don't cache paginated requests
  },
  getArticleCounts: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiService.request(`/articles/counts?${queryString}`);
  },

  // Subventions data
  getCountrySubventions: () =>
    apiService.request('/subventions/country'),
  getDepartementSubventions: (code) =>
    apiService.request(`/subventions/departement/${code}`),
  getCommuneSubventions: (cog) =>
    apiService.request(`/subventions/commune/${cog}`),

  // Migrant centers data
  getMigrants: (params = {}) => {
    // Remove undefined/null cursor before building query string
    const cleanParams = { ...params };
    if (cleanParams.cursor === undefined || cleanParams.cursor === null) {
      delete cleanParams.cursor;
    }

    const queryString = buildQueryString(cleanParams);
    const url = '/migrants';
    return apiService.request(
      queryString ? `${url}${queryString}` : url,
      {},
      !params.cursor
    );
  },

  // Mosque data
  getMosques: (params = {}) => {
    // Remove undefined/null cursor before building query string
    const cleanParams = { ...params };
    if (cleanParams.cursor === undefined || cleanParams.cursor === null) {
      delete cleanParams.cursor;
    }

    const queryString = buildQueryString(cleanParams);
    const url = '/mosques';
    return apiService.request(
      queryString ? `${url}${queryString}` : url,
      {},
      !params.cursor
    );
  },

  getClosestMosques: (lat, lng, limit = 5) => {
    const params = { lat, lng, limit };
    const queryString = buildQueryString(params);
    return apiService.request(`/mosques/closest${queryString}`);
  },

  // QPV data
  getQpv: (params = {}) => {
    // Remove undefined/null cursor before building query string
    const cleanParams = { ...params };
    if (cleanParams.cursor === undefined || cleanParams.cursor === null) {
      delete cleanParams.cursor;
    }

    const queryString = buildQueryString(cleanParams);
    return apiService.request(`/qpv${queryString ? queryString : ''}`);
  },

  getQpvs: () => apiService.request('/qpv/geojson'),

  getNearbyQpv: (lat, lng, limit = 5) => {
    const params = { lat, lng, limit };
    const queryString = buildQueryString(params);
    return apiService.request(`/qpv/nearby${queryString}`);
  },

  // NAT1 data
  getCountryNat1: () =>
    apiService.request('/nat1/country'),
  getDepartementNat1: (code) =>
    apiService.request(`/nat1/departement?dept=${code}`),
  getCommuneNat1: (cog) =>
    apiService.request(`/nat1/commune?cog=${cog}`),
  getNat1Summary: () =>
    apiService.request('/nat1/all'),

  // Politique data
  getPolitique: () =>
    apiService.request('/rankings/politique'),

  // Cache management
  clearCache: () => apiService.clearCache(),
  getCacheStats: () => apiService.getCacheStats()
};

// Expose clearCache to window for console access. Type "window.clearApiCache" in the browser console
window.clearApiCache = api.clearCache;

export default api;
