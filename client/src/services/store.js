import { defineStore } from "pinia";
import api from "./api.js";
import { DepartementNames } from "../utils/departementNames.js";
import { MetricsConfig } from "../utils/metricsConfig.js";
import { serializeStats, aggregateStats } from "../utils/utils.js";

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
    locationCache: JSON.parse(localStorage.getItem('locationCache') || '{}'),
  }),

  actions: {
    async searchCommunes(query) {
      return await api.searchCommunes(query);
    },



    // Requêtes globales getAll()
    async fetchCountryData() {
      try {
        const results = await Promise.all([
          api.getCountryDetails(),
          api.getCountryNames(),
          api.getCountryCrime(),
          api.getCountryCrimeHistory("france metro"),
          api.getCountryNamesHistory("france metro"),
          api.getCountryExecutive(),
          api.getDepartementRankings({
            limit: 101,
            sort: "total_score",
            direction: "DESC",
          }),
          api.getCountrySubventions(),
          api.getArticles({ limit: 10 }),
          api.getMigrants({ limit: 10 }),
          api.getQpv({ limit: 10 }),
          api.getCountryNat1(),
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
        country.namesSeries = serializeStats(country.namesHistory);
        country.crimeSeries = serializeStats(country.crimeHistory);
        country.crimeAggreg = aggregateStats(country.crimeSeries.data, MetricsConfig.calculatedMetrics);

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
        departement.namesSeries = serializeStats(departement.namesHistory);
        departement.crimeSeries = serializeStats(results[3]);
        departement.crimeAggreg = aggregateStats(
          departement.crimeSeries.data,
          MetricsConfig.calculatedMetrics,
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
        commune.crimeSeries = serializeStats(results[2]);
        commune.crimeAggreg = aggregateStats(commune.crimeSeries.data, MetricsConfig.calculatedMetrics);

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
          let version
          if (params.v === 'en') {
            version = 3
          } else {
            version = parseInt(params.v)
          }
          if (version >= 0 && version <= 3) {
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
      const newState = (this.labelState + 1) % 4;
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
        }
        
        // Remove undefined cursor parameter
        if (migrantParams.cursor === undefined || migrantParams.cursor === null) {
          delete migrantParams.cursor;
        }

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
        }
        
        // Remove undefined cursor parameter
        if (qpvParams.cursor === undefined || qpvParams.cursor === null) {
          delete qpvParams.cursor;
        }

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
        case 3:
          return "english";
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
  },
});