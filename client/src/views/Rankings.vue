<template>
  <div class="rankings-container">

    <!-- Controls Section -->
    <div class="controls-section">
      <!-- All controls moved to RankingFilters -->
      <RankingFilters
        :selectedScope="selectedScope"
        :selectedDepartement="selectedDepartement"
        :selectedMetric="selectedMetric"
        :filters="filters"
        @filters-changed="onFiltersChanged"
        @selection-changed="onSelectionChanged"
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
        Sélectionnez une métrique pour voir le classement.
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
    const currentLevel = ref('departement')
    const rankings = ref([])
    const loading = ref(false)
    const error = ref('')
    const filters = ref({
      popLower: null,
      popUpper: null,
      topLimit: 10
    })

    // Computed properties
    const currentType = computed(() => {
      return currentLevel.value === 'commune' ? 'Commune' : 'Département'
    })

    const fetchDepartmentRankings = async (metric, limit) => {
      // Use store data for departementsRankings
      let departmentData = store.country?.departementsRankings?.data;

      if (!departmentData) {
        error.value = "Données de classement départemental non disponibles dans le store.";
        return [];
      }

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
        // Use pre-calculated values directly from store data (like MapComponent)
        MetricsConfig.metrics.forEach(metricConfig => {
          const metricKey = metricConfig.value;
          ranking[metricKey] = dept[metricKey] || 0;
        });
        return ranking;
      });

      // Get bottom rankings - take the last items from the sorted array
      const bottomRankings = sortedByMetricDesc
        .slice(-limit)
        .map((dept, index) => {
          const ranking = {
            deptCode: dept.departement,
            name: DepartementNames[dept.departement] || dept.departement,
            population: dept.population,
            rank: totalDepartments - limit + index + 1,
          };
          // Use pre-calculated values directly from store data (like MapComponent)
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            ranking[metricKey] = dept[metricKey] || 0;
          });
          return ranking;
        });

      return [...topRankings, ...bottomRankings];
    };

    const fetchCommuneRankings = async (deptCode, metric, limit, populationRange) => {
      try {
        const requestParams = {
          dept: deptCode,
          limit: limit,
          offset: 0,
          sort: metric,
          direction: 'DESC'
        };

        // Add population range if specified
        if (populationRange) {
          requestParams.population_range = populationRange;
        }

        // Get top rankings
        const topResponse = await api.getCommuneRankings(requestParams);

        if (!topResponse?.data) {
          error.value = "Aucune donnée communale disponible pour ce département.";
          return [];
        }

        const totalCommunes = topResponse.total_count || 0;

        // Get bottom rankings - calculate offset for last N items
        const bottomOffset = Math.max(0, totalCommunes - limit);
        const bottomParams = {
          ...requestParams,
          limit: limit,
          offset: bottomOffset
        };

        const bottomResponse = await api.getCommuneRankings(bottomParams);

        // Process top rankings
        const topRankings = topResponse.data.map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: index + 1,
          };
          // Use pre-calculated values directly from API data
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            ranking[metricKey] = commune[metricKey] || 0;
          });
          return ranking;
        });

        // Process bottom rankings
        const bottomRankings = (bottomResponse?.data || []).map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: bottomOffset + index + 1,
          };
          // Use pre-calculated values directly from API data
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            ranking[metricKey] = commune[metricKey] || 0;
          });
          return ranking;
        });

        return [...topRankings, ...bottomRankings];
      } catch (err) {
        error.value = `Erreur lors du chargement des communes département: ${err.message}`;
        console.error('Erreur fetchCommuneRankings:', err);
        return [];
      }
    };

    const fetchCommunesFranceRankings = async (metric, limit, populationRange) => {
      try {
        const requestParams = {
          dept: '', // Empty dept to get all communes from France
          limit: limit,
          offset: 0,
          sort: metric,
          direction: 'DESC'
        };

        // Add population range if specified
        if (populationRange) {
          requestParams.population_range = populationRange;
        }

        // Get top rankings
        const topResponse = await api.getCommuneRankings({
          dept: '', // Empty dept for France-wide search
          ...requestParams
        });

        if (!topResponse?.data) {
          error.value = "Aucune donnée communale disponible pour la France entière.";
          loading.value = false;
          return;
        }

        // Get bottom rankings
        const totalCount = topResponse.total_count || 0;
        const limit = Math.min(parseInt(requestParams.limit), totalCount);
        const bottomOffset = Math.max(0, totalCount - limit);

        const bottomParams = {
          dept: '', // Empty dept for France-wide search
          sort: requestParams.sort,
          limit,
          population_range: requestParams.population_range,
          direction: 'DESC',
          offset: bottomOffset
        };

        const bottomResponse = await api.getCommuneRankings(bottomParams);

        // Process top rankings
        const topRankings = topResponse.data.map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: index + 1,
          };
          // Use pre-calculated values directly from API data
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            ranking[metricKey] = commune[metricKey] || 0;
          });
          return ranking;
        });

        // Process bottom rankings
        const bottomRankings = (bottomResponse?.data || []).map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: bottomOffset + index + 1,
          };
          // Use pre-calculated values directly from API data
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value;
            ranking[metricKey] = commune[metricKey] || 0;
          });
          return ranking;
        });

        return [...topRankings, ...bottomRankings];
      } catch (err) {
        error.value = `Erreur lors du chargement des communes France: ${err.message}`;
        console.error('Erreur fetchCommunesFranceRankings:', err);
        return [];
      }
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
          // This is the corrected call for France-wide commune rankings
          rankings.value = await fetchCommunesFranceRankings(selectedMetric.value, limit, populationRange)
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

    const onSelectionChanged = (selection) => {
      selectedScope.value = selection.scope
      selectedDepartement.value = selection.departement
      selectedMetric.value = selection.metric
      currentLevel.value = selection.level

      // Clear previous results and errors
      rankings.value = []
      error.value = ''

      // Reset population filters when changing scope
      if (selection.scope === 'departements') {
        filters.value.popLower = null
        filters.value.popUpper = null
      }

      // Update rankings if metric is selected
      if (selectedMetric.value) {
        updateRankings()
      }
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

    // Removed problematic watcher that was causing infinite loops
    // Rankings will update when user makes selections via onSelectionChanged

    return {
      store,
      selectedScope,
      selectedDepartement,
      selectedMetric,
      currentLevel,
      rankings,
      loading,
      error,
      filters,
      currentType,
      updateRankings,
      onSelectionChanged,
      onFiltersChanged
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
}
</style>