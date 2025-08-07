
<template>
  <div class="rankings-container">
    <!-- Header with version selector -->
    <div class="header-section">
      <h1>{{ store.getCurrentPageTitle() }}</h1>
      <VersionSelector />
    </div>

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
              v-for="option in availableMetricOptions" 
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
        const departements = await api.getDepartments()
        departments.value = departements.map(dept => {
          let deptCode = dept.departement.trim().toUpperCase()
          if (/^\d+$/.test(deptCode)) {
            deptCode = deptCode.padStart(2, '0')
          }
          if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(deptCode)) {
            return null
          }
          return {
            code: deptCode,
            name: DepartementNames[deptCode] || deptCode
          }
        }).filter(Boolean)
      } catch (err) {
        error.value = `Erreur : ${err.message}`
        console.error('Erreur chargement départements:', err)
      }
    }

    const fetchDepartmentRankings = async (metric, limit) => {
      try {
        const [topResult, bottomResult] = await Promise.all([
          api.getDepartmentRankings({
            limit: limit,
            sort: metric,
            direction: 'DESC'
          }),
          api.getDepartmentRankings({
            limit: limit,
            sort: metric,
            direction: 'ASC'
          })
        ])

        const topData = topResult.data
        const bottomData = bottomResult.data
        const totalDepartments = 101

        const topRankings = topData.map((dept, index) => {
          const ranking = {
            deptCode: dept.departement,
            name: DepartementNames[dept.departement] || dept.departement,
            population: dept.population,
            rank: index + 1,
          }

          // Add all metrics from MetricsConfig
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value
            if (MetricsConfig.calculatedMetrics[metricKey]) {
              ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, dept)
            } else {
              ranking[metricKey] = dept[metricKey] || 0
            }
          })

          return ranking
        })

        const topDeptCodes = new Set(topRankings.map(d => d.deptCode))
        const filteredBottomData = bottomData.filter(
          dept => !topDeptCodes.has(dept.departement)
        )

        const bottomRankings = filteredBottomData
          .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
          .slice(0, limit)
          .map((dept, index) => {
            const ranking = {
              deptCode: dept.departement,
              name: DepartementNames[dept.departement] || dept.departement,
              population: dept.population,
              rank: totalDepartments - filteredBottomData.length + index + 1,
            }

            // Add all metrics from MetricsConfig
            MetricsConfig.metrics.forEach(metricConfig => {
              const metricKey = metricConfig.value
              if (MetricsConfig.calculatedMetrics[metricKey]) {
                ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, dept)
              } else {
                ranking[metricKey] = dept[metricKey] || 0
              }
            })

            return ranking
          })

        return [...topRankings, ...bottomRankings]
      } catch (err) {
        error.value = `Erreur : ${err.message}`
        console.error('Erreur chargement classements départements:', err)
        return []
      }
    }

    const fetchCommuneRankings = async (deptCode, metric, limit, populationRange) => {
      try {
        const baseParams = {
          limit: limit,
          sort: metric
        }
        if (deptCode) baseParams.dept = deptCode
        if (populationRange) baseParams.population_range = populationRange

        const [topResult, bottomResult] = await Promise.all([
          api.getCommuneRankings({ ...baseParams, direction: 'DESC' }),
          api.getCommuneRankings({ ...baseParams, direction: 'ASC' })
        ])

        const topData = topResult.data
        const bottomData = bottomResult.data
        const totalCommunes = topResult.total_count

        const topRankings = topData.map((commune, index) => {
          const ranking = {
            deptCode: commune.departement,
            name: commune.commune,
            population: commune.population,
            rank: index + 1,
          }

          // Add all metrics from MetricsConfig
          MetricsConfig.metrics.forEach(metricConfig => {
            const metricKey = metricConfig.value
            if (MetricsConfig.calculatedMetrics[metricKey]) {
              ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, commune)
            } else {
              ranking[metricKey] = commune[metricKey] || 0
            }
          })

          return ranking
        })

        const topNames = new Set(topRankings.map(c => c.name))
        const filteredBottomData = bottomData.filter(
          commune => !topNames.has(commune.commune)
        )

        const bottomRankings = filteredBottomData
          .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
          .slice(0, limit)
          .map((commune, index) => {
            const ranking = {
              deptCode: commune.departement,
              name: commune.commune,
              population: commune.population,
              rank: totalCommunes - filteredBottomData.length + index + 1,
            }

            // Add all metrics from MetricsConfig
            MetricsConfig.metrics.forEach(metricConfig => {
              const metricKey = metricConfig.value
              if (MetricsConfig.calculatedMetrics[metricKey]) {
                ranking[metricKey] = MetricsConfig.calculateMetric(metricKey, commune)
              } else {
                ranking[metricKey] = commune[metricKey] || 0
              }
            })

            return ranking
          })

        return [...topRankings, ...bottomRankings]
      } catch (err) {
        error.value = `Erreur : ${err.message}`
        console.error('Erreur chargement classements communes:', err)
        return []
      }
    }

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
          rankings.value = await fetchCommuneRankings(null, selectedMetric.value, limit, populationRange)
        } else if (selectedScope.value === 'communes_dept') {
          if (!selectedDepartement.value) {
            error.value = "Veuillez sélectionner un département."
            return
          }
          rankings.value = await fetchCommuneRankings(selectedDepartement.value, selectedMetric.value, limit, populationRange)
        }
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
      
      // Set initial state from URL parameter
      const urlParams = new URLSearchParams(window.location.search)
      const labelState = urlParams.get('labelState')
      if (labelState) {
        store.setLabelState(parseInt(labelState))
      }

      // Listen for label state changes from MetricsConfig
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
