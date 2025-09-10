<template>
  <div class="correlations-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>{{ getPageTitle() }}</h1>
      <VersionSelector />
    </div>

    <!-- Controls Section -->
    <div class="controls-section">
      <v-row class="align-center mb-4">
        <v-col cols="12" md="6">
          <v-select
            v-model="selectedScope"
            :items="scopeOptions"
            label="Niveau d'analyse"
            variant="outlined"
            density="compact"
            @update:model-value="onScopeChanged"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="selectedDepartement"
            :items="departementOptions"
            :disabled="selectedScope !== 'communes_dept'"
            label="Département (si communes)"
            variant="outlined"
            density="compact"
            clearable
            @update:model-value="onSelectionChanged"
          />
        </v-col>
      </v-row>

      <!-- Metric Category Filters -->
      <v-row class="mb-3">
        <v-col cols="12">
          <v-switch
            v-model="interCategoryMode"
            label="Mode comparaison inter-catégories"
            color="primary"
            hide-details
            class="mb-3"
          ></v-switch>
        </v-col>
      </v-row>

      <v-row class="mb-3" v-if="!interCategoryMode">
        <v-col cols="12">
          <v-chip-group
            v-model="selectedCategories"
            multiple
            column
          >
            <v-chip
              v-for="category in availableCategories"
              :key="category"
              :value="category"
              variant="outlined"
              filter
            >
              {{ getCategoryLabel(category) }}
            </v-chip>
          </v-chip-group>
        </v-col>
      </v-row>

      <v-row class="mb-3" v-if="interCategoryMode">
        <v-col cols="12" md="6">
          <v-select
            v-model="categoryX"
            :items="categoryOptions"
            label="Catégorie X (axe horizontal)"
            variant="outlined"
            density="compact"
            @update:model-value="onInterCategorySelectionChanged"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="categoryY"
            :items="categoryOptions"
            label="Catégorie Y (axe vertical)"
            variant="outlined"
            density="compact"
            @update:model-value="onInterCategorySelectionChanged"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Results Section -->
    <div class="results-section">
      <div v-if="loading" class="loading">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-2">Calcul des corrélations...</p>
      </div>

      <div v-else-if="error" class="error">
        <v-alert type="error" icon="mdi-alert">
          {{ error }}
        </v-alert>
      </div>

      <div v-else-if="correlationMatrix && correlationMatrix.length > 0" class="heatmap-section">
        <!-- Heatmap Title -->
        <div class="heatmap-title">
          <h3 v-if="!interCategoryMode">Matrice des corrélations entre métriques</h3>
          <h3 v-else>Corrélations inter-catégories: {{ getCategoryLabel(categoryX) }} vs {{ getCategoryLabel(categoryY) }}</h3>
          <p class="subtitle">
            Coefficients de corrélation de Pearson ({{ currentType.toLowerCase() }}{{ selectedScope === 'communes_dept' ? ` - ${selectedDepartement}` : '' }})
          </p>
        </div>

        <!-- Heatmap Component -->
        <CorrelationHeatmap 
          :matrix="correlationMatrix"
          :labels="metricLabels"
          :title="`Corrélations - ${currentType}`"
        />

        <!-- Summary Statistics -->
        <div class="summary-stats mt-4">
          <v-row>
            <v-col cols="12" md="4">
              <v-card class="pa-3">
                <v-card-title class="text-h6">Statistiques</v-card-title>
                <v-card-text>
                  <p><strong>Nb. de métriques:</strong> {{ metricLabels.length }}</p>
                  <p><strong>Nb. d'observations:</strong> {{ dataSize }}</p>
                  <p><strong>Corrélation max:</strong> {{ maxCorrelation.toFixed(3) }}</p>
                  <p><strong>Corrélation min:</strong> {{ minCorrelation.toFixed(3) }}</p>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="8">
              <v-card class="pa-3">
                <v-card-title class="text-h6">Corrélations les plus fortes</v-card-title>
                <v-card-text>
                  <div v-for="corr in topCorrelations.slice(0, 5)" :key="corr.key" class="mb-2">
                    <strong>{{ corr.metric1 }} ↔ {{ corr.metric2 }}</strong>: {{ corr.value.toFixed(3) }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </div>

      <div v-else class="no-data">
        <v-alert type="info" icon="mdi-information">
          Sélectionnez un niveau d'analyse pour afficher les corrélations.
        </v-alert>
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
import CorrelationHeatmap from '../components/CorrelationHeatmap.vue'

export default {
  name: 'Correlations',
  components: {
    VersionSelector,
    CorrelationHeatmap
  },
  setup() {
    const store = useDataStore()

    // Reactive state
    const selectedScope = ref('departements')
    const selectedDepartement = ref('')
    const selectedCategories = ref(['général', 'insécurité', 'immigration'])
    const interCategoryMode = ref(false)
    const categoryX = ref('immigration')
    const categoryY = ref('insécurité')
    const correlationMatrix = ref([])
    const metricLabels = ref([])
    const loading = ref(false)
    const error = ref('')
    const dataSize = ref(0)

    // Options
    const scopeOptions = [
      { value: 'departements', title: 'Départements' },
      { value: 'communes_france', title: 'Communes (France entière)' },
      { value: 'communes_dept', title: 'Communes (par département)' }
    ]

    const departementOptions = computed(() => {
      return Object.entries(DepartementNames).map(([code, name]) => ({
        value: code,
        title: `${code} - ${name}`
      })).sort((a, b) => a.title.localeCompare(b.title))
    })

    const availableCategories = computed(() => {
      const categories = new Set()
      MetricsConfig.metrics.forEach(metric => {
        if (metric.category && metric.category !== 'général') {
          categories.add(metric.category)
        }
      })
      return Array.from(categories).sort()
    })

    const categoryOptions = computed(() => {
      return availableCategories.value.map(category => ({
        value: category,
        title: getCategoryLabel(category)
      }))
    })

    // Computed properties
    const currentType = computed(() => {
      return selectedScope.value === 'departements' ? 'Départements' : 'Communes'
    })

    const maxCorrelation = computed(() => {
      if (!correlationMatrix.value.length) return 0
      let max = -Infinity
      for (let i = 0; i < correlationMatrix.value.length; i++) {
        for (let j = 0; j < correlationMatrix.value[i].length; j++) {
          const val = correlationMatrix.value[i][j]
          // Skip diagonal (i === j) and null values, find highest positive correlation
          if (i !== j && val !== null && !isNaN(val) && val > max) {
            max = val
          }
        }
      }
      return max === -Infinity ? 0 : max
    })

    const minCorrelation = computed(() => {
      if (!correlationMatrix.value.length) return 0
      let min = Infinity
      for (let i = 0; i < correlationMatrix.value.length; i++) {
        for (let j = 0; j < correlationMatrix.value[i].length; j++) {
          const val = correlationMatrix.value[i][j]
          // Skip diagonal (i === j) and null values, find lowest (most negative) correlation
          if (i !== j && val !== null && !isNaN(val) && val < min) {
            min = val
          }
        }
      }
      return min === Infinity ? 0 : min
    })

    const topCorrelations = computed(() => {
      if (!correlationMatrix.value.length) return []
      const correlations = []
      
      if (interCategoryMode.value && metricLabels.value.x && metricLabels.value.y) {
        // Inter-category mode
        const labelsX = metricLabels.value.x
        const labelsY = metricLabels.value.y
        
        for (let i = 0; i < correlationMatrix.value.length; i++) {
          for (let j = 0; j < correlationMatrix.value[i].length; j++) {
            const value = correlationMatrix.value[i][j]
            if (value !== null && !isNaN(value) && Math.abs(value) > 0.1) {
              correlations.push({
                key: `${i}-${j}`,
                metric1: labelsX[j],
                metric2: labelsY[i],
                value: value
              })
            }
          }
        }
      } else {
        // Standard mode
        for (let i = 0; i < correlationMatrix.value.length; i++) {
          for (let j = i + 1; j < correlationMatrix.value[i].length; j++) {
            const value = correlationMatrix.value[i][j]
            if (value !== null && !isNaN(value) && Math.abs(value) > 0.1) {
              correlations.push({
                key: `${i}-${j}`,
                metric1: metricLabels.value[i],
                metric2: metricLabels.value[j],
                value: value
              })
            }
          }
        }
      }
      
      return correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    })

    // Methods
    const getPageTitle = () => {
      const labelState = store.labelState || 0
      const titles = {
        0: "Corrélations entre métriques",
        1: "Analyse des liens inclusifs",
        2: "Matrice des corrélations identitaires"
      }
      return titles[labelState] || titles[0]
    }

    const getCategoryLabel = (category) => {
      const labels = {
        'général': 'Général',
        'insécurité': 'Insécurité',
        'immigration': 'Immigration',
        'islamisation': 'Islamisation',
        'défrancisation': 'Défrancisation',
        'wokisme': 'Wokisme'
      }
      return labels[category] || category
    }

    const getSelectedMetrics = () => {
      const currentLevel = selectedScope.value === 'departements' ? 'departement' : 'commune'
      
      if (interCategoryMode.value) {
        // In inter-category mode, get metrics from both selected categories
        const metricsX = MetricsConfig.metrics.filter(metric => {
          const isAvailable = MetricsConfig.isMetricAvailable(metric.value, currentLevel)
          const isFromCategoryX = metric.category === categoryX.value
          const notPopulation = metric.value !== 'population'
          return isAvailable && isFromCategoryX && notPopulation
        })
        
        const metricsY = MetricsConfig.metrics.filter(metric => {
          const isAvailable = MetricsConfig.isMetricAvailable(metric.value, currentLevel)
          const isFromCategoryY = metric.category === categoryY.value
          const notPopulation = metric.value !== 'population'
          return isAvailable && isFromCategoryY && notPopulation
        })
        
        return { metricsX, metricsY }
      } else {
        // Standard mode - return all metrics from selected categories
        return MetricsConfig.metrics.filter(metric => {
          const isAvailable = MetricsConfig.isMetricAvailable(metric.value, currentLevel)
          const categorySelected = selectedCategories.value.length === 0 || 
                                  selectedCategories.value.includes(metric.category)
          const notPopulation = metric.value !== 'population'
          
          return isAvailable && categorySelected && notPopulation
        })
      }
    }

    const calculatePearsonCorrelation = (x, y) => {
      if (x.length !== y.length || x.length === 0) return null
      
      const n = x.length
      const sumX = x.reduce((a, b) => a + b, 0)
      const sumY = y.reduce((a, b) => a + b, 0)
      const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0)
      const sumXX = x.reduce((acc, val) => acc + val * val, 0)
      const sumYY = y.reduce((acc, val) => acc + val * val, 0)
      
      const numerator = n * sumXY - sumX * sumY
      const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
      
      if (denominator === 0) return null
      return numerator / denominator
    }

    const calculateCorrelationMatrix = (data, metricsData) => {
      if (interCategoryMode.value && metricsData.metricsX && metricsData.metricsY) {
        // Inter-category correlation matrix
        const { metricsX, metricsY } = metricsData
        const matrix = []
        const labelsX = metricsX.map(metric => MetricsConfig.getMetricLabel(metric.value))
        const labelsY = metricsY.map(metric => MetricsConfig.getMetricLabel(metric.value))
        
        for (let i = 0; i < metricsY.length; i++) {
          const row = []
          for (let j = 0; j < metricsX.length; j++) {
            const validPairs = data.filter(item => {
              const xVal = parseFloat(item[metricsX[j].value])
              const yVal = parseFloat(item[metricsY[i].value])
              return !isNaN(xVal) && isFinite(xVal) && !isNaN(yVal) && isFinite(yVal)
            })
            
            if (validPairs.length < 20) {
              row.push(null)
            } else {
              const xValues = validPairs.map(item => parseFloat(item[metricsX[j].value]))
              const yValues = validPairs.map(item => parseFloat(item[metricsY[i].value]))
              const correlation = calculatePearsonCorrelation(xValues, yValues)
              row.push(isNaN(correlation) ? null : correlation)
            }
          }
          matrix.push(row)
        }
        
        return { matrix, labels: { x: labelsX, y: labelsY } }
      } else {
        // Standard correlation matrix
        const metrics = metricsData
        const matrix = []
        const labels = []
        
        metrics.forEach(metric => {
          labels.push(MetricsConfig.getMetricLabel(metric.value))
        })
        
        for (let i = 0; i < metrics.length; i++) {
          const row = []
          for (let j = 0; j < metrics.length; j++) {
            if (i === j) {
              row.push(1) // Self correlation is always 1
            } else {
              const validPairs = data.filter(item => {
                const xVal = parseFloat(item[metrics[i].value])
                const yVal = parseFloat(item[metrics[j].value])
                return !isNaN(xVal) && isFinite(xVal) && !isNaN(yVal) && isFinite(yVal)
              })
              
              if (validPairs.length < 20) {
                row.push(null)
              } else {
                const xValues = validPairs.map(item => parseFloat(item[metrics[i].value]))
                const yValues = validPairs.map(item => parseFloat(item[metrics[j].value]))
                const correlation = calculatePearsonCorrelation(xValues, yValues)
                row.push(isNaN(correlation) ? null : correlation)
              }
            }
          }
          matrix.push(row)
        }
        
        return { matrix, labels }
      }
    }

    const fetchDepartmentData = async () => {
      let departmentData = store.country?.departementsRankings?.data
      
      if (!departmentData) {
        // Fallback: fetch département data from API if not in store
        try {
          console.log('Department data not in store, fetching from API...')
          const response = await api.getDepartementRankings({
            limit: 100, // Get all departments
            offset: 0,
            sort: 'population',
            direction: 'DESC'
          })
          departmentData = response?.data || []
          
          if (departmentData.length === 0) {
            throw new Error("Aucune donnée de département trouvée.")
          }
          
          console.log(`Loaded ${departmentData.length} départements from API`)
        } catch (err) {
          throw new Error(`Erreur lors du chargement des données de département : ${err.message}`)
        }
      }
      
      return departmentData.filter(dept => dept && typeof dept === 'object')
    }

    const fetchCommuneData = async (deptCode = '') => {
      try {
        const requestParams = {
          dept: deptCode,
          limit: 1000, // Get a good sample size
          offset: 0,
          sort: 'population',
          direction: 'DESC'
        }

        const response = await api.getCommuneRankings(requestParams)
        return response?.data || []
      } catch (err) {
        throw new Error(`Erreur lors du chargement des données communales: ${err.message}`)
      }
    }

    const updateCorrelations = async () => {
      if (selectedCategories.value.length === 0) {
        error.value = "Veuillez sélectionner au moins une catégorie de métriques."
        return
      }

      loading.value = true
      error.value = ''

      try {
        let rawData = []
        
        if (selectedScope.value === 'departements') {
          rawData = await fetchDepartmentData()
        } else if (selectedScope.value === 'communes_france') {
          rawData = await fetchCommuneData('')
        } else if (selectedScope.value === 'communes_dept') {
          if (!selectedDepartement.value) {
            error.value = "Veuillez sélectionner un département."
            return
          }
          rawData = await fetchCommuneData(selectedDepartement.value)
        }

        if (rawData.length === 0) {
          error.value = "Aucune donnée disponible pour l'analyse."
          return
        }

        const selectedMetrics = getSelectedMetrics()
        
        if (interCategoryMode.value) {
          if (!selectedMetrics.metricsX || !selectedMetrics.metricsY || 
              selectedMetrics.metricsX.length === 0 || selectedMetrics.metricsY.length === 0) {
            error.value = "Il faut sélectionner deux catégories avec des métriques disponibles."
            return
          }
        } else {
          if (selectedMetrics.length < 2) {
            error.value = "Il faut au moins 2 métriques pour calculer des corrélations."
            return
          }
        }

        // Filter data to only include rows with valid values for selected metrics
        const validData = rawData.filter(item => {
          return selectedMetrics.some(metric => {
            const value = parseFloat(item[metric.value])
            return !isNaN(value) && value !== null && value !== undefined
          })
        })

        if (validData.length < 10) {
          error.value = "Pas assez de données valides pour une analyse statistique fiable."
          return
        }

        const { matrix, labels } = calculateCorrelationMatrix(validData, selectedMetrics)
        
        correlationMatrix.value = matrix
        metricLabels.value = labels
        dataSize.value = validData.length

      } catch (err) {
        error.value = `Erreur lors du calcul des corrélations : ${err.message}`
        console.error('Erreur updateCorrelations:', err)
      } finally {
        loading.value = false
      }
    }

    const onScopeChanged = () => {
      correlationMatrix.value = []
      metricLabels.value = []
      error.value = ''
      
      if (selectedScope.value === 'departements') {
        selectedDepartement.value = ''
      }
      
      updateCorrelations()
    }

    const onSelectionChanged = () => {
      if (selectedScope.value === 'communes_dept' && selectedDepartement.value) {
        updateCorrelations()
      }
    }

    const onInterCategorySelectionChanged = () => {
      if (interCategoryMode.value && categoryX.value && categoryY.value && categoryX.value !== categoryY.value) {
        updateCorrelations()
      }
    }

    // Watchers
    watch(selectedCategories, () => {
      if (!interCategoryMode.value) {
        updateCorrelations()
      }
    }, { deep: true })

    watch(interCategoryMode, () => {
      correlationMatrix.value = []
      metricLabels.value = interCategoryMode.value ? { x: [], y: [] } : []
      error.value = ''
      if (interCategoryMode.value) {
        onInterCategorySelectionChanged()
      } else {
        updateCorrelations()
      }
    })

    watch(() => store.labelState, () => {
      // Update labels when label state changes
      if (correlationMatrix.value.length > 0) {
        const selectedMetrics = getSelectedMetrics()
        if (interCategoryMode.value && selectedMetrics.metricsX && selectedMetrics.metricsY) {
          metricLabels.value = {
            x: selectedMetrics.metricsX.map(metric => MetricsConfig.getMetricLabel(metric.value)),
            y: selectedMetrics.metricsY.map(metric => MetricsConfig.getMetricLabel(metric.value))
          }
        } else {
          metricLabels.value = selectedMetrics.map(metric => MetricsConfig.getMetricLabel(metric.value))
        }
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

      // Initial load with default selections
      updateCorrelations()
    })

    return {
      selectedScope,
      selectedDepartement,
      selectedCategories,
      interCategoryMode,
      categoryX,
      categoryY,
      correlationMatrix,
      metricLabels,
      loading,
      error,
      dataSize,
      scopeOptions,
      departementOptions,
      availableCategories,
      categoryOptions,
      currentType,
      maxCorrelation,
      minCorrelation,
      topCorrelations,
      getPageTitle,
      getCategoryLabel,
      onScopeChanged,
      onSelectionChanged,
      onInterCategorySelectionChanged,
      updateCorrelations
    }
  }
}
</script>

<style scoped>
.correlations-container {
  max-width: 1400px;
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
  padding: 60px 40px;
}

.error {
  margin-bottom: 20px;
}

.no-data {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px;
}

.heatmap-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.heatmap-title {
  text-align: center;
  margin-bottom: 20px;
}

.heatmap-title h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.heatmap-title .subtitle {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.summary-stats {
  margin-top: 20px;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    gap: 15px;
  }
  
  .correlations-container {
    padding: 15px;
  }
}
</style>