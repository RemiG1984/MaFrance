import { defineStore } from "pinia";
import api from "./api.js";
import { DepartementNames } from "../utils/departementNames.js";
import { MetricsConfig } from "../utils/metricsConfig.js";

export const useDataStore = defineStore("data", {
  state: () => ({
    currentLevel: null,
    labelState: parseInt(localStorage.getItem("metricsLabelState") || "0"),
    selectedMetric: null,
    levels: {
      country: "France",
      departement: null,
      commune: null,
    },
    country: {
      details: null,
      names: null,
      crime: null,
      crimeHistory: null,
      namesHistory: null,
      qpv: null,
      executive: null,
      departementsRankings: null,
      namesSeries: null,
      crimeSeries: null,
      crimeAggreg: null,
      subventions: null,
      migrants: null,
      articles: null,
      nat1: null,
    },
    departement: {
      details: null,
      names: null,
      crime: null,
      crimeHistory: null,
      namesHistory: null,
      qpv: null,
      executive: null,
      communesRankings: null,
      articles: null,
      namesSeries: null,
      crimeSeries: null,
      crimeAggreg: null,
      subventions: null,
      migrants: null,
      nat1: null,
    },
    commune: {
      details: null,
      crime: null,
      crimeHistory: null,
      qpv: null,
      executive: null,
      articles: null,
      crimeSeries: null,
      crimeAggreg: null,
      subventions: null,
      migrants: null,
      nat1: null,
    },
    memorials: {
      victims: [],
      tags: [],
      selectedTags: [],
      sortBy: 'year_desc',
      pagination: { limit: 20, offset: 0, hasMore: true, total: 0 },
      loading: false,
    },
    locationCache: JSON.parse(localStorage.getItem('locationCache') || '{}'),
  }),

  actions: {
    async searchCommunes(query) {
      return await api.searchCommunes(query);
    },



    // Requêtes globales getAll()
    async fetchCountryData(code) {
      try {
        const results = await Promise.all([
          api.getCountryDetails(code),
          api.getCountryNames(code),
          api.getCountryCrime(code),
          api.getCountryCrimeHistory(code),
          api.getCountryNamesHistory(code),
          api.getCountryExecutive(code),
          api.getDepartementRankings({
            limit: 101,
            sort: "total_score",
            direction: "DESC",
          }),
          api.getCountrySubventions(code),
          api.getArticles({ limit: 10 }),
          api.getMigrants({ limit: 10 }),
          api.getQpv({ limit: 10 }),
          api.getCountryNat1(code),
        ]);

        const country = {};
        country.details = results[0];
        country.names = results[1];
        country.crime = results[2];
        country.crimeHistory = results[3];
        country.namesHistory = results[4];
        country.executive = results[5];
        country.departementsRankings = results[6];
        country.subventions = results[7];
        const articlesResponse = results[8];
        country.articles = articlesResponse;
        country.migrants = results[9];
        country.qpv = results[10];
        country.nat1 = results[11];
        country.namesSeries = this.serializeStats(country.namesHistory);
        country.crimeSeries = this.serializeStats(country.crimeHistory);
        country.crimeAggreg = this.aggregateStats(country.crimeSeries.data);

        return country;
      } catch (error) {
        console.error(error);
        return null;
      }
    },

    async fetchDepartementData(code) {
      try {
        const results = await Promise.all([
          api.getDepartementDetails(code),
          api.getDepartementNames(code),
          api.getDepartementCrime(code),
          api.getDepartementCrimeHistory(code),
          api.getDepartementNamesHistory(code),
          api.getQpv({ dept: code, limit: 100 }),
          api.getDepartementExecutive(code),
          api.getCommuneRankings({
            dept: code,
            limit: 1000,
            sort: "total_score",
            direction: "DESC",
          }),
          api.getArticles({
            dept: code,
            limit: 20,
          }),
          api.getDepartementSubventions(code),
          api.getMigrants({ dept: code, limit: 100 }),
          api.getDepartementNat1(code),
        ]);

        const departement = {};
        departement.details = results[0];
        departement.names = results[1];
        departement.crime = results[2];
        departement.crimeHistory = results[3];
        departement.namesHistory = results[4];
        departement.qpv = results[5];
        departement.executive = results[6];
        departement.communesRankings = results[7];
        const articlesResponse = results[8];
        departement.articles = articlesResponse;
        departement.subventions = results[9];
        departement.migrants = results[10] || [];
        departement.nat1 = results[11];
        departement.namesSeries = this.serializeStats(departement.namesHistory);
        departement.crimeSeries = this.serializeStats(results[3]);
        departement.crimeAggreg = this.aggregateStats(
          departement.crimeSeries.data,
        );

        return departement;
      } catch (error) {
        console.error(error);
        return null;
      }
    },

    async fetchCommuneData(code, deptCode) {
      try {
        const results = await Promise.all([
          api.getCommuneDetails(code),
          // api.getCommuneNames(code),
          api.getCommuneCrime(code),
          api.getCommuneCrimeHistory(code),
          // api.getCommuneNamesHistory(code),
          api.getQpv({ cog: code, limit: 100 }),
          api.getCommuneExecutive(code),
          api.getArticles({
            cog: code,
            dept: deptCode,
            limit: 20,
          }),
          api.getCommuneSubventions(code),
          api.getMigrants({ cog: code, limit: 100 }),
          api.getCommuneNat1(code),
        ]);

        const commune = {};
        commune.details = results[0];
        commune.crime = results[1];
        commune.crimeHistory = results[2];
        commune.qpv = results[3];
        commune.executive = results[4];
        const articlesResponse = results[5];
        commune.articles = articlesResponse;
        commune.subventions = results[6];
        commune.migrants = results[7] || [];
        commune.nat1 = results[8];
        commune.crimeSeries = this.serializeStats(results[2]);
        commune.crimeAggreg = this.aggregateStats(commune.crimeSeries.data);

        return commune;
      } catch (error) {
        console.error(error);
        return null;
      }
    },

    setLevel(level) {
      this.currentLevel = level;
    },

    setCountry() {
      this.fetchCountryData().then((country) => {
        this.country = country;

        // Clear lower level data when moving to country level
        this.clearDepartementData();
        this.clearCommuneData();
        this.levels.departement = null;
        this.levels.commune = null;

        this.setLevel("country");
      });
    },

    async setDepartement(deptCode) {
      const currentDeptCode = this.getDepartementCode();

      if (deptCode !== currentDeptCode) {
        const departement = await this.fetchDepartementData(deptCode);
        this.departement = departement;
        this.levels.departement = DepartementNames[deptCode];
      }

      // Clear commune data when moving to departement level
      this.clearCommuneData();
      this.levels.commune = null;

      this.setLevel("departement");
    },

    async setCommune(cog, communeName, deptCode) {

      const currentCommCode = this.getCommuneCode();
      const currentDeptCode = this.getDepartementCode();

      const promises = [];

      // Vérifier si on doit charger les données de la commune
      if (cog !== currentCommCode) {
        promises.push(this.fetchCommuneData(cog, deptCode));
      } else {
        promises.push(Promise.resolve(null)); // Placeholder pour maintenir l'ordre
      }

      // Vérifier si on doit charger les données du département
      if (deptCode != null && deptCode !== currentDeptCode) {
        promises.push(this.fetchDepartementData(deptCode));
      } else {
        promises.push(Promise.resolve(null)); // Placeholder pour maintenir l'ordre
      }

      // Exécuter toutes les requêtes en parallèle
      const [communeData, departementData] = await Promise.all(promises);

      // Mettre à jour le store une seule fois avec toutes les données
      if (communeData) {
        this.commune = communeData;
        // const communeName = this.getCommuneName()
        this.levels.commune = communeName;
      }
      if (departementData) {
        this.departement = departementData;
        this.levels.departement = DepartementNames[deptCode];
      }

      const newDeptCode = this.getDepartementCode();

      // on vérifie que le département de la commune est bien celui chargé pour être sûr
      if (this.getCommuneDepartementCode() !== this.getDepartementCode()) {
        console.log("departement code mismatch");
        this.setDepartement(this.commune.departement);
      }

      this.setLevel("commune");
    },

    aggregateStats(data) {
      // crée des stats "composites" en utilisant les formules de calculatedMetrics
      const result = {};

      // Pour chaque métrique calculée définie dans MetricsConfig
      Object.keys(MetricsConfig.calculatedMetrics).forEach((metricKey) => {
        const calculation = MetricsConfig.calculatedMetrics[metricKey];

        // Vérifier que tous les composants nécessaires sont disponibles
        const inputSeries = calculation.components
          .map((key) => data[key])
          .filter((serie) => serie); // Filtrer les séries undefined/null

        if (inputSeries.length === 0) return;

        const seriesLength = inputSeries[0].length;

        // Calculer la métrique pour chaque entrée/level en utilisant la formule
        result[metricKey] = [];

        for (let i = 0; i < seriesLength; i++) {
          // Créer un objet de données pour cette année/période
          const dataPoint = {};
          calculation.components.forEach((key) => {
            dataPoint[key] = data[key] ? data[key][i] || 0 : 0;
          });

          // Appliquer la formule
          const calculatedValue = calculation.formula(dataPoint);
          result[metricKey].push(calculatedValue);
        }
      });

      return result;
    },

    serializeStats(data) {
      // 1. Récupération de toutes les années et de toutes les clés d'indicateurs disponibles
      const allYears = new Set();
      const allKeys = new Set();

      if (data.length === 0)
        return {
          labels: [],
          data: {},
        };

      const yearKey = data[0].hasOwnProperty("annee") ? "annee" : "annais";

      // ensure years order
      data.sort((a, b) => {
        a[yearKey] - b[yearKey];
      });

      data.forEach((entry) => {
        Object.keys(entry).forEach((key) => {
          if (key === yearKey) {
            allYears.add(entry[yearKey]);
          } else if (key !== "COG" && key !== "dep" && key !== "country") {
            allKeys.add(key);
          }
        });
      });

      const labels = Array.from(allYears);

      // 2. Construction de la structure de données
      const result = {};

      for (const key of allKeys) {
        result[key] = {};

        // Création d'un map année -> valeur pour ce niveau et cette clé
        const dataMap = {};
        data.forEach((entry) => {
          if (entry[yearKey] && entry[key] !== undefined) {
            const year = entry[yearKey];
            dataMap[year] = entry[key];
          }
        });

        // Création du tableau avec null pour les années manquantes
        result[key] = labels.map((year) => dataMap[year] ?? null);
      }

      return {
        labels,
        data: result,
      };
    },

    // Actions utilitaires
    clearDepartementData() {
      this.departement = {
        details: null,
        names: null,
        crime: null,
        crimeHistory: null,
        namesHistory: null,
        qpv: null,
        executive: null,
        communesRankings: null,
        articles: null,
        namesSeries: null,
        crimeSeries: null,
        crimeAggreg: null,
        subventions: null,
        migrants: null,
        nat1: null,
      };
    },

    clearCommuneData() {
      this.commune = {
        details: null,
        crime: null,
        crimeHistory: null,
        qpv: null,
        executive: null,
        articles: null,
        crimeSeries: null,
        crimeAggreg: null,
        subventions: null,
        migrants: null,
        nat1: null,
      };
    },

    // Initialize store and sync with MetricsConfig
    initializeStore() {
      // Sync labelState with MetricsConfig
      MetricsConfig.labelState = this.labelState;

      // Handle pending navigation from shared links
      this.handlePendingNavigation();
    },

    // Handle navigation from shared URLs
    async handlePendingNavigation() {
      const pendingNav = sessionStorage.getItem('pendingNavigation')
      if (!pendingNav) {
        // If no pending navigation, trigger LocationSelector after delay to auto-zoom map
        setTimeout(() => {
          this.triggerLocationSelectorAutoZoom()
        }, 500)
        return
      }

      try {
        const params = JSON.parse(pendingNav)
        sessionStorage.removeItem('pendingNavigation')

        // Set version if specified
        if (params.v) {
          const version = parseInt(params.v)
          if (version >= 0 && version <= 2) {
            this.setLabelState(version)
          }
        }

        // Set selected metric if specified (decode compact format)
        if (params.m) {
          const decodedMetric = MetricsConfig.getMetricFromCompact(params.m)
          this.selectedMetric = decodedMetric
        }

        // Navigate to location based on 'c' parameter
        if (params.c) {
          // Simple logic: 4 or 5 characters = commune code, 3 or less = departement code
          if (params.c.length >= 4) {
            const communeDetails = await api.getCommuneDetails(params.c)
            if (communeDetails) {
              await this.setCommune(params.c, communeDetails.commune, communeDetails.departement)
            }
          } else if (params.c.length <= 3) {
            // It's a department code
            await this.setDepartement(params.c)
          }
        } else {
          // Stay at country level
          await this.setCountry()
        }

        // Trigger LocationSelector after navigation to auto-zoom map
        setTimeout(() => {
          this.triggerLocationSelectorAutoZoom()
        }, 500)
      } catch (error) {
        console.error('Error handling shared navigation:', error)
        sessionStorage.removeItem('pendingNavigation')
      }
    },

    // Trigger LocationSelector to activate map auto-zoom
    triggerLocationSelectorAutoZoom() {
      // Dispatch event that LocationSelector can listen to for auto-zoom
      window.dispatchEvent(new CustomEvent('triggerMapAutoZoom'))
    },

    // Label state management
    setLabelState(state) {
      this.labelState = state;
      // Keep MetricsConfig in sync
      MetricsConfig.labelState = state;
      localStorage.setItem("metricsLabelState", state.toString());
      // Dispatch event for components that might need to react
      window.dispatchEvent(
        new CustomEvent("metricsLabelsToggled", {
          detail: { labelState: this.labelState },
        }),
      );
    },

    cycleLabelState() {
      const newState = (this.labelState + 1) % 3;
      this.setLabelState(newState);
    },

    async loadDepartementSubventions(deptCode) {
      if (!deptCode) return

      try {
        const data = await api.getDepartementSubventions(deptCode)
        if (data) {
          this.departement.subventions = data.subventions || []
        }
      } catch (error) {
        console.error('Failed to load departement subventions:', error)
      }
    },

    async loadCommuneSubventions(cog) {
      if (!cog) return

      try {
        const data = await api.getCommuneSubventions(cog)
        if (data) {
          this.commune.subventions = data.subventions || []
        }
      } catch (error) {
        console.error('Failed to load commune subventions:', error)
      }
    },

    async fetchFilteredArticles(params, append = false) {
      try {
        const articlesResponse = await api.getArticles(params)

        if (params.cog) {
          // For commune
          if (append && this.commune.articles) {
            // Append new articles to existing list
            this.commune.articles = {
              ...articlesResponse,
              list: [...this.commune.articles.list, ...articlesResponse.list],
              counts: articlesResponse.counts // Use fresh counts
            }
          } else {
            // Replace articles list
            this.commune.articles = articlesResponse
          }
        } else if (params.dept) {
          // For departement
          if (append && this.departement.articles) {
            // Append new articles to existing list
            this.departement.articles = {
              ...articlesResponse,
              list: [...this.departement.articles.list, ...articlesResponse.list],
              counts: articlesResponse.counts // Use fresh counts
            }
          } else {
            // Replace articles list
            this.departement.articles = articlesResponse
          }
        } else if (params.country) { // Added condition for country
          // For country (no dept or cog)
          if (append && this.country.articles) {
            // Append new articles to existing list
            this.country.articles = {
              ...articlesResponse,
              list: [...this.country.articles.list, ...articlesResponse.list],
              counts: articlesResponse.counts // Use fresh counts
            }
          } else {
            // Replace articles list
            this.country.articles = articlesResponse
          }
        }

        return articlesResponse
      } catch (error) {
        console.error('Failed to fetch filtered articles:', error)
        return null
      }
    },

    async loadMoreArticles(params) {
      return this.fetchFilteredArticles(params, true)
    },

    async fetchMigrants(level, code) {
      try {
        let params = { limit: level === 'country' ? 20 : 100 };
        if (level === 'departement') {
          params.dept = code;
        } else if (level === 'commune') {
          params.cog = code;
        } // No params for country

        const migrants = await api.getMigrants(params);
        this[level].migrants = migrants || { list: [], pagination: { hasMore: false, nextCursor: null, limit: params.limit } };
      } catch (error) {
        console.error(`Error fetching ${level} migrants:`, error);
        this[level].migrants = { list: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } };
      }
    },

    async loadMoreMigrants(level, code, params) {
      try {
        let migrantParams = { ...params };
        if (level === 'departement') {
          migrantParams.dept = code;
        } else if (level === 'commune') {
          migrantParams.cog = code;
        } // No dept/cog for country

        const moreMigrants = await api.getMigrants(migrantParams);
        if (moreMigrants && moreMigrants.list) {
          this[level].migrants.list.push(...moreMigrants.list);
          this[level].migrants.pagination = moreMigrants.pagination;
        }
      } catch (error) {
        console.error(`Error loading more ${level} migrants:`, error);
      }
    },

    async fetchQpv(level, code) {
      try {
        let params = { limit: level === 'country' ? 20 : 100 };
        if (level === 'departement') {
          params.dept = code;
        } else if (level === 'commune') {
          params.cog = code;
        } // No params for country

        const qpv = await api.getQpv(params);
        this[level].qpv = qpv || { list: [], pagination: { hasMore: false, nextCursor: null, limit: params.limit } };
      } catch (error) {
        console.error(`Error fetching ${level} QPV:`, error);
        this[level].qpv = { list: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } };
      }
    },

    async loadMoreQpv(level, code, params) {
      try {
        let qpvParams = { ...params };
        if (level === 'departement') {
          qpvParams.dept = code;
        } else if (level === 'commune') {
          qpvParams.cog = code;
        } // No dept/cog for country

        const moreQpv = await api.getQpv(qpvParams);
        if (moreQpv && moreQpv.list) {
          this[level].qpv.list.push(...moreQpv.list);
          this[level].qpv.pagination = moreQpv.pagination;
        }
      } catch (error) {
        console.error(`Error loading more ${level} QPV:`, error);
      }
    },

    // Subventions actions
    async fetchCountrySubventions(country = 'france') {
        this.subventionsCountry = await api.getCountrySubventions(country) || {
            list: [],
            pagination: { hasMore: false, nextCursor: null, limit: 20 }
        }
    },

    // Memorial actions
    async fetchVictims(params = {}, append = false) {
      try {
        this.memorials.loading = true;
        
        const apiParams = { 
          ...params,
          limit: this.memorials.pagination.limit,
          offset: append ? this.memorials.pagination.offset : 0,
        };
        
        // Add selected tags to request
        if (this.memorials.selectedTags.length) {
          apiParams.tags = this.memorials.selectedTags.join(',');
        }
        
        const response = await api.getFrancocides(apiParams);
        
        if (response && response.list) {
          this.memorials.victims = append ? [...this.memorials.victims, ...response.list] : response.list;
          this.memorials.pagination = {
            limit: response.pagination?.limit || 20,
            offset: (append ? this.memorials.pagination.offset : 0) + response.list.length,
            hasMore: response.pagination?.hasMore || response.list.length === response.pagination?.limit,
            total: response.pagination?.total || response.list.length,
          };
        } else {
          this.memorials.victims = append ? this.memorials.victims : [];
          this.memorials.pagination = { ...this.memorials.pagination, hasMore: false };
        }
      } catch (error) {
        console.error('Error fetching victims:', error);
        this.memorials.victims = append ? this.memorials.victims : [];
        this.memorials.pagination = { ...this.memorials.pagination, hasMore: false };
      } finally {
        this.memorials.loading = false;
      }
    },

    async fetchTags() {
      try {
        // Use api cache for tags
        const response = await api.getFrancocidesTags();
        this.memorials.tags = response.tags || [];
      } catch (error) {
        console.error('Error fetching tags:', error);
        this.memorials.tags = [];
      }
    },

    async fetchLocationData(cogs) {
      const uncachedCogs = cogs.filter(cog => !this.locationCache[cog]);
      if (uncachedCogs.length) {
        try {
          const results = await Promise.allSettled(uncachedCogs.map(cog => api.getCommuneDetails(cog)));
          results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.commune) {
              this.locationCache[uncachedCogs[i]] = `${result.value.commune} (${result.value.departement})`;
            }
          });
          localStorage.setItem('locationCache', JSON.stringify(this.locationCache));
        } catch (error) {
          console.error('Error fetching location data:', error);
        }
      }
    },

    toggleSelectedTag(tag) {
      const index = this.memorials.selectedTags.indexOf(tag);
      if (index > -1) {
        this.memorials.selectedTags.splice(index, 1);
      } else {
        this.memorials.selectedTags.push(tag);
      }
      this.resetPaginationAndFetch();
    },

    clearSelectedTags() {
      this.memorials.selectedTags = [];
      this.resetPaginationAndFetch();
    },

    resetPaginationAndFetch() {
      this.memorials.pagination.offset = 0;
      this.fetchVictims();
    },

    setSortBy(sort) {
      this.memorials.sortBy = sort;
      this.resetPaginationAndFetch();
    },

    async loadMoreVictims() {
      if (this.memorials.pagination.hasMore) {
        await this.fetchVictims({}, true);
      }
    },
  },

  getters: {
    // Getters pour vérifier si les données sont chargées
    isCountryDataLoaded: (state) => {
      return Object.values(state.country).some((value) => value !== null);
    },

    isDepartementDataLoaded: (state) => {
      return Object.values(state.departement).some((value) => value !== null);
    },

    isCommuneDataLoaded: (state) => {
      return Object.values(state.commune).some((value) => value !== null);
    },

    // Getters pour obtenir des données spécifiques
    getCountryData: (state) => (dataType) => {
      return state.country[dataType];
    },

    getDepartementData: (state) => (dataType) => {
      return state.departement[dataType];
    },

    getCommuneData: (state) => (dataType) => {
      return state.commune[dataType];
    },

    getDepartementCode: (state) => () => {
      return state.departement?.details?.departement;
    },

    getCommuneCode: (state) => () => {
      return state.commune?.details?.COG;
    },

    getCommuneDepartementCode: (state) => () => {
      return state.commune?.details?.departement;
    },

    // Label state getters
    getLabelStateName: (state) => () => {
      switch (state.labelState) {
        case 1:
          return "alt1";
        case 2:
          return "alt2";
        default:
          return "standard";
      }
    },

    getCurrentVersionLabel: (state) => () => {
      const stateName = state.getLabelStateName();
      return MetricsConfig.versionLabels?.[stateName] || "Version Standard";
    },

    getCurrentPageTitle: (state) => () => {
      const stateName = state.getLabelStateName();
      return (
        MetricsConfig.pageTitles?.[stateName] || "Ma France: état des lieux"
      );
    },

    getMetricLabel: (state) => (metricKey) => {
      return MetricsConfig.getMetricLabel
        ? MetricsConfig.getMetricLabel(metricKey)
        : metricKey;
    },

    getCurrentMigrants() {
      const level = this.currentLevel
      return this[level]?.migrants || { list: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } }
    },

    // Getters for memorial page
    sortedVictims: (state) => {
      if (!state.memorials.victims.length) return [];
      let sorted = [...state.memorials.victims];
      switch (state.memorials.sortBy) {
        case 'year_desc':
          return sorted.sort((a, b) => new Date(b.date_deces) - new Date(a.date_deces));
        case 'year_asc':
          return sorted.sort((a, b) => new Date(a.date_deces) - new Date(b.date_deces));
        case 'location_asc':
          return sorted.sort((a, b) => (a.cog || '').localeCompare(b.cog || ''));
        default:
          return sorted;
      }
    },

    filteredVictims: (state) => (query) => {
      if (!query) return state.sortedVictims;
      const lowerQuery = query.toLowerCase();
      return state.sortedVictims.filter(victim =>
        `${victim.prenom} ${victim.nom}`.toLowerCase().includes(lowerQuery) ||
        state.locationCache[victim.cog]?.toLowerCase().includes(lowerQuery)
      );
    },
  },
});