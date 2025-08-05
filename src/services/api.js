// Service API pour gérer les appels au backend
class ApiService {
    constructor() {
        //this.baseURL = 'http://127.0.0.1:3000'
        this.baseURL = "/api";
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        };

        return fetch(url, config)
            .then((response) => response.json())
            .catch(function (error) {
                // throw error
                console.error(`API request failed: ${endpoint}`, error);
                return null;
            });
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
        return apiService.request(`/api/articles?${queryString}`);
    },
    getArticleCounts: (params) => {
        const queryString = new URLSearchParams(params).toString();
        return apiService.request(`/api/articles/counts?${queryString}`);
    },
};

export default api;
