<template>
  <div class="rankings-container">

    <!-- Controls Section -->
    <div class="controls-section">
      <div class="main-controls">
        <div class="form-group">
          <label for="scopeSelect">Portée :</label>
          <select id="scopeSelect" v-model="selectedScope" @change="onScopeChange">
            <option value="departements">Départements</option>
            <option value="communes_france">Communes (France)</option>
            <option value="communes_dept">Communes (par département)</option>
          </select>
        </div>

        <div v-show="selectedScope === 'communes_dept'" class="form-group">
          <label for="departementSelect">Département :</label>
          <select id="departementSelect" v-model="selectedDepartement" @change="updateRankings">
            <option value="">-- Tous les départements --</option>
            <option
              v-for="dept in departments"
              :key="dept.code"
              :value="dept.code"
            >
              {{ dept.code }} - {{ dept.name }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="metricSelect">Métrique :</label>
          <select id="metricSelect" v-model="selectedMetric" @change="updateRankings">
            <option value="">-- Choisir une métrique --</option>
            <option
              v-for="option in availableMetrics"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Tweaking controls -->
      <RankingFilters
        @filters-changed="onFiltersChanged"
        ref="rankingFilters"
      />
    </div>

    <!-- Results Section -->
    <div class="results-section">
      <div v-if="loading" class="loading">
        Chargement...
      </div>

      <div v-else-if="error" class="error">
        {{ error }}
      </div>

      <RankingResults
        v-else-if="rankings.length > 0"
        :rankings="rankings"
        :metric="selectedMetric"
        :type="currentType"
        :limit="filters.topLimit"
      />

      <div v-else class="no-data">
        Veuillez sélectionner une métrique pour afficher les classements.
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useDataStore } from '../services/store.js'
import api from '../services/api.js'
import { MetricsConfig } from '../utils/metricsConfig.js'
import { DepartementNames } from '../utils/departementNames.js'
import VersionSelector from '../components/VersionSelector.vue'
import RankingFilters from '../components/RankingFilters.vue'
import RankingResults from '../components/RankingResults.vue'
import { mapStores } from 'pinia'

export default {
  name: 'Rankings',
  components: {
    VersionSelector,
    RankingFilters,
    RankingResults
  },
  setup() {
    const store = useDataStore()

    // Reactive state
    const selectedScope = ref('departements')
    const selectedDepartement = ref('')
    const selectedMetric = ref('')
    const rankings = ref([])
    const loading = ref(false)
    const error = ref('')
    const departments = ref([])
    const filters = ref({
      popLower: null,
      popUpper: null,
      topLimit: 10
    })

    // Computed properties
    const currentLevel = computed(() => {
      return (selectedScope.value === 'communes_france' || selectedScope.value === 'communes_dept')
        ? 'commune'
        : 'departement'
    })

    const currentType = computed(() => {
      return currentLevel.value === 'commune' ? 'Commune' : 'Département'
    })

    const availableMetricOptions = computed(() => {
      return MetricsConfig.getAvailableMetricOptions(currentLevel.value)
    })

    // Methods
    const loadDepartements = async () => {
      try {
        // Directly use store data if available, otherwise fetch
        if (!store.country?.departements) {
          await store.setCountry();
        }

        if (store.country?.departements) {
          departments.value = store.country.departements.map(dept => {
            let deptCode = dept.departement.trim().toUpperCase();
            if (/^\d+$/.test(deptCode)) {
              deptCode = deptCode.padStart(2, '0');
            }
            // Basic validation for department codes
            if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(deptCode)) {
              return null;
            }
            return {
              code: deptCode,
              name: DepartementNames[deptCode] || deptCode
            };
          }).filter(Boolean);
        } else {
          throw new Error("Données de départements non disponibles dans le store.");
        }
      } catch (err) {
        error.value = `Erreur : ${err.message}`;
        console.error('Erreur chargement départements:', err);
      }
    }

    const fetchDepartmentRankings = async (metric, limit) => {
      // Use store data for departementsRankings
      let departmentData = store.country?.departementsRankings?.data;

      if (!departmentData) {
        // Optionally fetch if not in store, but the goal is to use store.
        // For now, we'll assume it should be there or error out.
        error.value = "Données de classement départemental non disponibles dans le store.";
        return [];
      }

      // Simulate API call logic using store data
      const totalDepartments = departmentData.length;

      // Sort by the selected metric (DESC order for top rankings)
      const sortedByMetricDesc = [...departmentData].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
      const topRankings = sortedByMetricDesc.slice(0, limit).map((dept, index) => {
        const ranking = {
          deptCode: dept.departement,
          name: DepartementNames[dept.departement] || dept.departement,
          population: dept.population,
          rank: index + 1,
        };
        // Add all metrics from MetricsConfig
        MetricsConfig.metrics.forEach(metricConfig => {
          const metricKey = metricConfig.value;
          if (MetricsConfig.calculatedMetrics[metricKey]) {
            ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, dept);
          } else {
            ranking[metricKey] = dept[metricKey] || 0;
          }
        });
        return ranking;
      });

      // Get bottom rankings
      const topDeptCodes = new Set(topRankings.map(d => d.deptCode));
      const filteredBottomData = sortedByMetricDesc.filter(
        dept => !topDeptCodes.has(dept.departement)
      );

      const bottomRankings = filteredBottomData
        .slice(0, limit) // Take the next 'limit' items after filtering
        .map((dept, index) => {
          const ranking = {
            deptCode: dept.departement,
            name: DepartementNames[dept.departement] || dept.departement,
            population: dept.population,
            rank: totalDepartments - filteredBottomData.length + index + 1, // Recalculate rank
          };
          // Add all metrics from MetricsConfig
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            if (MetricsConfig.calculatedMetrics[metricKey]) {
              ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, dept);
            } else {
              ranking[metricKey] = dept[metricKey] || 0;
            }
          });
          return ranking;
        });

      return [...topRankings, ...bottomRankings];
    };

    const fetchCommuneRankings = async (deptCode, metric, limit, populationRange) => {
      // Use store data for communesRankings
      let communeData = null;
      if (deptCode) {
        // Need specific department's commune rankings
        if (!store.departement || store.getDepartementCode() !== deptCode || !store.departement?.communesRankings) {
          await store.setDepartement(deptCode);
        }
        communeData = store.departement?.communesRankings?.data;
      } else {
        // For communes_france, we need to aggregate or have a specific endpoint
        // Assuming store.country.communesRankings would exist for France-wide
        // For now, let's rely on department-specific data if available.
        // If no specific deptCode is given, and we need France-wide, this logic might need adjustment
        // based on how store.country.communesRankings is populated.
        // For this example, we'll focus on the deptCode case.
        error.value = "Classement des communes pour toute la France non implémenté via le store dans cet exemple.";
        return [];
      }

      if (!communeData) {
        error.value = "Données de classement communal non disponibles dans le store.";
        return [];
      }

      // Simulate API call logic using store data
      const totalCommunes = communeData.length;

      // Filter by population range if specified
      let filteredByPopulation = communeData;
      if (populationRange) {
        // This requires parsing populationRange string and applying logic, which was in constructPopulationRange
        // For simplicity, let's assume populationRange is handled before this function or is not strictly needed from API params
        // and focus on the core data retrieval and processing.
        // If populationRange needs to be applied here, it would require the logic from constructPopulationRange.
      }

      // Sort by the selected metric (DESC order for top rankings)
      const sortedByMetricDesc = [...filteredByPopulation].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
      const topRankings = sortedByMetricDesc.slice(0, limit).map((commune, index) => {
        const ranking = {
          deptCode: commune.departement,
          name: commune.commune,
          population: commune.population,
          rank: index + 1,
        };
        // Add all metrics from MetricsConfig
        MetricsConfig.metrics.forEach(metricConfig => {
          const metricKey = metricConfig.value;
          if (MetricsConfig.calculatedMetrics[metricKey]) {
            ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, commune);
          } else {
            ranking[metricKey] = commune[metricKey] || 0;
          }
        });
        return ranking;
      });

      const topNames = new Set(topRankings.map(c => c.name));
      const filteredBottomData = sortedByMetricDesc.filter(
        commune => !topNames.has(commune.commune)
      );

      const bottomRankings = filteredBottomData
        .slice(0, limit) // Take the next 'limit' items after filtering
        .map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: totalCommunes - filteredBottomData.length + index + 1, // Recalculate rank
          };
          // Add all metrics from MetricsConfig
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            if (MetricsConfig.calculatedMetrics[metricKey]) {
              ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, commune);
            } else {
              ranking[metricKey] = commune[metricKey] || 0;
            }
          });
          return ranking;
        });

      return [...topRankings, ...bottomRankings];
    };

    const updateRankings = async () => {
      if (!selectedMetric.value) {
        error.value = "Veuillez sélectionner une métrique."
        return
      }

      // Validate metric availability for current scope
      if (!MetricsConfig.isMetricAvailable(selectedMetric.value, currentLevel.value)) {
        error.value = `Erreur : La métrique sélectionnée n'est pas disponible au niveau ${currentLevel.value === 'commune' ? 'communal' : 'départemental'}.`
        return
      }

      loading.value = true
      error.value = ''

      try {
        let populationRange = constructPopulationRange()
        let limit = Math.min(filters.value.topLimit || 10, 100)

        if (selectedScope.value === 'departements') {
          rankings.value = await fetchDepartmentRankings(selectedMetric.value, limit)
        } else if (selectedScope.value === 'communes_france') {
          // For communes_france, we would need a specific store entry or aggregate.
          // Assuming we can use the department selection for this, or a general store entry.
          // For now, it might fall back to needing a selected department if not handled.
          error.value = "La visualisation des communes de toute la France via le store n'est pas encore entièrement supportée dans cet exemple."
          rankings.value = [] // Clear previous results if this is not supported
        } else if (selectedScope.value === 'communes_dept') {
          if (!selectedDepartement.value) {
            error.value = "Veuillez sélectionner un département."
            return
          }
          rankings.value = await fetchCommuneRankings(selectedDepartement.value, selectedMetric.value, limit, populationRange)
        }
      } catch (err) {
        error.value = `Erreur lors de la mise à jour des classements : ${err.message}`
        console.error('Erreur updateRankings:', err)
      } finally {
        loading.value = false
      }
    }

    const constructPopulationRange = () => {
      const { popLower, popUpper } = filters.value

      if (popLower !== null && popUpper !== null) {
        if (popLower === 1000) {
          if (popUpper === 10000) return "1-10k"
          else if (popUpper === 100000) return "1-100k"
        } else if (popLower === 10000 && popUpper === 100000) {
          return "10-100k"
        }
      } else if (popLower !== null) {
        if (popLower === 1000) return "1k+"
        else if (popLower === 10000) return "10k+"
        else if (popLower === 100000) return "100k+"
      } else if (popUpper !== null) {
        if (popUpper === 1000) return "0-1k"
        else if (popUpper === 10000) return "0-10k"
        else if (popUpper === 100000) return "0-100k"
      }
      return ""
    }

    const onScopeChange = () => {
      selectedDepartement.value = ''
      selectedMetric.value = ''
      rankings.value = []
      error.value = ''
    }

    const onFiltersChanged = (newFilters) => {
      filters.value = { ...newFilters }
      if (selectedMetric.value) {
        updateRankings()
      }
    }

    // Watchers
    watch(() => store.labelState, () => {
      // Refresh when label state changes
      if (selectedMetric.value) {
        updateRankings()
      }
    })

    // Listen for label state changes from MetricsConfig
    onMounted(() => {
      const handleLabelChange = (event) => {
        if (selectedMetric.value) {
          updateRankings()
        }
      }

      window.addEventListener('metricsLabelsToggled', handleLabelChange)

      // Cleanup listener when component unmounts
      return () => {
        window.removeEventListener('metricsLabelsToggled', handleLabelChange)
      }
    })

    // Lifecycle
    onMounted(() => {
      loadDepartements()

      // Set initial state from URL parameter (if applicable)
      const urlParams = new URLSearchParams(window.location.search)
      const labelState = urlParams.get('labelState')
      if (labelState) {
        store.setLabelState(parseInt(labelState))
      }

      // Initial load of rankings based on default/URL params if any
      // For now, it waits for user selection or updates.
      // If you want it to load based on default metric, call updateRankings() here.
    })

    // Watch for store data changes that might affect rankings
    watch(() => [store.country?.departementsRankings, store.departement?.communesRankings, store.getDepartementCode()], () => {
      // Only update if a metric is already selected to avoid unnecessary loads
      if (selectedMetric.value) {
        updateRankings();
      }
    }, { deep: true, immediate: false }); // immediate: false to not trigger on initial setup

    return {
      store,
      selectedScope,
      selectedDepartement,
      selectedMetric,
      rankings,
      loading,
      error,
      departments,
      filters,
      currentLevel,
      currentType,
      availableMetricOptions,
      updateRankings,
      onScopeChange,
      onFiltersChanged
    }
  },
  computed: {
    ...mapStores(useDataStore),
    currentLevel() {
      return this.dataStore.currentLevel;
    },
    labelKey() {
      // Return the appropriate label key based on current label state
      const labelStateName = this.dataStore.getLabelStateName();
      switch (labelStateName) {
        case 'alt1':
          return 'alt1Label';
        case 'alt2':
          return 'alt2Label';
        default:
          return 'label';
      }
    },
    availableData() {
      const level = this.currentLevel;
      if (level === 'country') {
        return this.dataStore.country?.departementsRankings;
      } else if (level === 'departement') {
        return this.dataStore.departement?.communesRankings;
      }
      return null;
    },
    processedRankings() {
      if (!this.availableData?.data) return [];

      return this.availableData.data.map(item => {
        const processedItem = { ...item };

        // Calculate metrics using MetricsConfig - same logic as MapComponent
        Object.keys(MetricsConfig.calculatedMetrics).forEach(metricKey => {
          if (MetricsConfig.isMetricAvailable(metricKey, this.currentLevel)) {
            processedItem[metricKey] = MetricsConfig.calculateMetric(metricKey, item);
          }
        });

        return processedItem;
      });
    },
    availableMetrics() {
      // Get metrics with dynamic labels based on current state - same as MapComponent
      const metrics = MetricsConfig.getAvailableMetricOptions(this.currentLevel);
      return metrics.map(metric => {
        const metricConfig = MetricsConfig.getMetricByValue(metric.value);
        if (!metricConfig) return metric;

        // Use the appropriate label based on current state
        const labelStateName = this.dataStore.getLabelStateName();
        let label;
        switch (labelStateName) {
          case 'alt1':
            label = metricConfig.alt1Label || metricConfig.label;
            break;
          case 'alt2':
            label = metricConfig.alt2Label || metricConfig.label;
            break;
          default:
            label = metricConfig.label;
        }

        return {
          ...metric,
          label: label,
          alt1Label: metricConfig.alt1Label,
          alt2Label: metricConfig.alt2Label
        };
      });
    }
  },
  watch: {
    // Watch for label state changes to update display
    'dataStore.labelState': {
      handler() {
        // Force reactivity update when labels change
        this.$forceUpdate();
      }
    },
    // Watch for data changes - same pattern as MapComponent
    currentLevel(newLevel, oldLevel) {
      if (newLevel !== oldLevel) {
        // Data will be automatically updated through computed properties
        // Reset filters if needed
        this.resetFilters();
      }
    },
    // Watch for available data changes
    availableData(newData, oldData) {
      if (newData !== oldData) {
        // Data has changed, update rankings
        this.updateRankings();
      }
    }
  },
  methods: {
    onFiltersChanged(filters) {
      this.filters = { ...filters };
      this.applyFilters();
    },

    applyFilters() {
      this.loading = true;

      // Apply filters logic here
      setTimeout(() => {
        this.loading = false;
      }, 500);
    },

    resetFilters() {
      // Reset filters when data changes
      this.filters = {
        popLower: null,
        popUpper: null,
        topLimit: 20
      };
    },

    updateRankings() {
      // Method to handle ranking updates when data changes
      // Similar to MapComponent's updateData method
      if (this.availableData?.data) {
        this.loading = false;
      }
    },

    // Get metric label with current label state - same as MapComponent
    getMetricLabel(metricKey) {
      const metricConfig = MetricsConfig.getMetricByValue(metricKey);
      if (!metricConfig) return metricKey;

      const labelStateName = this.dataStore.getLabelStateName();
      switch (labelStateName) {
        case 'alt1':
          return metricConfig.alt1Label || metricConfig.label;
        case 'alt2':
          return metricConfig.alt2Label || metricConfig.label;
        default:
          return metricConfig.label;
      }
    },

    // Format metric values - same as MapComponent
    formatMetricValue(value, metricKey) {
      return MetricsConfig.formatMetricValue(value, metricKey);
    }
  }
}
</script>

<style scoped>
.rankings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-section h1 {
  margin: 0;
  font-size: 2rem;
  color: #333;
}

.controls-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.main-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
}

.form-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.results-section {
  min-height: 400px;
}

.loading {
  text-align: center;
  font-size: 18px;
  color: #666;
  padding: 40px;
}

.error {
  background: #fee;
  border: 1px solid #fcc;
  padding: 15px;
  border-radius: 4px;
  color: #c00;
  margin-bottom: 20px;
}

.no-data {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    gap: 15px;
  }

  .main-controls {
    flex-direction: column;
  }

  .form-group {
    min-width: auto;
  }
}
</style>