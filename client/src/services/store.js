import { defineStore } from "pinia";
import api from "./api.js";
import { DepartementNames } from "../utils/departementNames.js";
import { MetricsConfig } from "../utils/metricsConfig.js";

export const useDataStore = defineStore("data", {
  state: () => ({
    currentLevel: null,
    labelState: parseInt(localStorage.getItem("metricsLabelState") || "0"),
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
      articlesCounts: null,
      namesSeries: null,
      crimeSeries: null,
      crimeAggreg: null,
      subventions: null,
      migrants: null,
    },
    commune: {
      details: null,
      crime: null,
      crimeHistory: null,
      qpv: null,
      executive: null,
      articles: null,
      articlesCounts: null,
      crimeSeries: null,
      crimeAggreg: null,
      subventions: null,
      migrants: null,
    },
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
          api.getDepartementQpv(code),
          api.getDepartementExecutive(code),
          api.getCommuneRankings({
            dept: code,
            limit: 1000,
            sort: "total_score",
            direction: "DESC",
          }),
          api.getArticles({
            dept: code,
          }),
          api.getArticleCounts({
            dept: code,
          }),
          api.getDepartementSubventions(code),
          api.getDepartementMigrants(code),
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
        departement.articles = results[8];
        departement.articlesCounts = results[9];
        departement.subventions = results[10];
        departement.migrants = results[11];
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
          api.getCommuneQpv(code),
          api.getCommuneExecutive(code),
          api.getArticles({
            cog: code,
            dept: deptCode,
          }),
          api.getArticleCounts({
            cog: code,
            dept: deptCode,
          }),
          api.getCommuneSubventions(code),
          api.getCommuneMigrants(code),
        ]);

        const commune = {};
        commune.details = results[0];
        commune.crime = results[1];
        commune.crimeHistory = results[2];
        commune.qpv = results[3];
        commune.executive = results[4];
        commune.articles = results[5];
        commune.articlesCounts = results[6];
        commune.subventions = results[7];
        commune.migrants = results[8];
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
    clearCountryData() {
      this.country = {
        details: null,
        names: null,
        crime: null,
        crimeHistory: null,
        namesHistory: null,
        qpv: null,
        executive: null,
        subventions: null,
        migrants: null,
      };
      this.errors.country = null;
    },

    clearDepartementData() {
      this.departement = {
        details: null,
        names: null,
        crime: null,
        crimeHistory: null,
        namesHistory: null,
        qpv: null,
        executive: null,
        subventions: null,
        migrants: null,
      };
      this.errors.departement = null;
    },

    clearCommuneData() {
      this.commune = {
        details: null,
        names: null,
        crime: null,
        crimeHistory: null,
        namesHistory: null,
        qpv: null,
        executive: null,
        subventions: null,
        migrants: null,
      };
      this.errors.commune = null;
    },

    clearAllData() {
      this.clearCountryData();
      this.clearDepartementData();
      this.clearCommuneData();
    },

    // Initialize store and sync with MetricsConfig
    initializeStore() {
      // Sync labelState with MetricsConfig
      MetricsConfig.labelState = this.labelState;
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

    getCommuneName: (state) => () => {
      // FIXME: le nom de la commune devrait être à un endroit clean dans les données
      return state.commune?.qpv[0]?.lib_com;
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
  },
});
