<template>
  <div class="correlations-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>{{ store.labelState === 3 ? 'Statistical correlations between different metrics' : 'Corrélations statistiques entre les différentes métriques' }}</h1>
    </div>

    <!-- Controls Section -->
    <div class="controls-section">
      <v-expansion-panels v-model="expandedPanels" multiple>
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon left>mdi-cog</v-icon>
            Paramètres
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row class="align-center mb-4">
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedScope"
                  :items="scopeOptions"
                  :label="store.labelState === 3 ? 'Analysis level' : 'Niveau d\'analyse'"
                  variant="outlined"
                  density="compact"
                  @update:model-value="onScopeChanged"
                />
              </v-col>
              <v-col cols="12" md="6">
                <!-- Department selection removed - now handled automatically -->
              </v-col>
            </v-row>

            <!-- Correlation Explanation -->
            <v-row class="mb-4">
              <v-col cols="12">
                <v-alert
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="text-body-2"
                >
                  <div class="text-subtitle-2 mb-2">{{ store.labelState === 3 ? 'Correlation principle' : 'Principe de la corrélation' }}</div>
                  {{ store.labelState === 3 ? 
                    'Statistical correlation measures the relationship between two variables, i.e., whether they evolve together in a certain way. For example, if we observe that when one variable increases, the other also increases (or decreases), we speak of correlation. The Pearson coefficient, denoted r, is a number between -1 and 1 that quantifies this relationship. If r is close to 1, the variables increase together (strong positive correlation); if r is close to -1, one increases when the other decreases (strong negative correlation); if r is close to 0, there is no clear link. It is a simple tool to spot trends, but it does not prove that one causes the other.' :
                    'La corrélation statistique mesure le lien entre deux variables, c\\'est-à-dire si elles évoluent ensemble d\\'une certaine manière. Par exemple, si on observe que quand une variable augmente, l\\'autre augmente aussi (ou diminue), on parle de corrélation. Le coefficient de Pearson, noté r, est un nombre entre -1 et 1 qui quantifie cette relation. Si r est proche de 1, les variables augmentent ensemble (corrélation positive forte) ; si r est proche de -1, l\\'une augmente quand l\\'autre diminue (corrélation négative forte) ; si r est proche de 0, il n\\'y a pas de lien clair. C\\'est un outil simple pour repérer des tendances, mais il ne prouve pas que l\\'une cause l\\'autre.'
                  }}
                </v-alert>
              </v-col>
            </v-row>

            <!-- Metric Axis Selection -->
            <v-row class="mb-3">
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedMetricsY"
                  :items="availableMetricOptions"
                  :label="store.labelState === 3 ? 'Y-Axis Metrics (vertical)' : 'Métriques Axe Y (vertical)'"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  closable-chips
                  @update:model-value="onAxisSelectionChanged"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedMetricsX"
                  :items="availableMetricOptions"
                  :label="store.labelState === 3 ? 'X-Axis Metrics (horizontal)' : 'Métriques Axe X (horizontal)'"
                  variant="outlined"
                  density="compact"
                  multiple
                  chips
                  closable-chips
                  @update:model-value="onAxisSelectionChanged"
                />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Results Section -->
    <div class="results-section">
      <div v-if="loading" class="loading">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-2">{{ store.labelState === 3 ? 'Calculating correlations...' : 'Calcul des corrélations...' }}</p>
      </div>

      <div v-else-if="error" class="error">
        <v-alert type="error" icon="mdi-alert">
          {{ error }}
        </v-alert>
      </div>

      <div v-else-if="correlationMatrix && correlationMatrix.length > 0" class="heatmap-section">
        <!-- Heatmap Component -->
        <CorrelationHeatmap 
          :matrix="correlationMatrix"
          :labels="metricLabels"
          :title="`Coefficients de corrélation de Pearson - ${currentType}`"
          @correlation-hover="handleCorrelationHover"
          @correlation-click="handleCorrelationClick"
        />

        <!-- Scatter Plot Section -->
        <ScatterPlot
          :selectedMetrics="selectedScatterMetrics"
          :rawData="rawData"
          :correlationValue="selectedCorrelationValue"
        />

        <!-- Summary Statistics -->
        <div class="summary-stats mt-4">
          <v-row>
            <v-col cols="12" md="4">
              <v-card class="pa-3">
                <v-card-title class="text-h6">{{ store.labelState === 3 ? 'Statistics' : 'Statistiques' }}</v-card-title>
                <v-card-text>
                  <p><strong>{{ store.labelState === 3 ? 'Nb. of observations:' : 'Nb. d\\'observations:' }}</strong> {{ dataSize }}</p>
                  <p><strong>{{ store.labelState === 3 ? 'Max correlation:' : 'Corrélation max:' }}</strong> {{ maxCorrelation.toFixed(3) }}</p>
                  <p><strong>{{ store.labelState === 3 ? 'Min correlation:' : 'Corrélation min:' }}</strong> {{ minCorrelation.toFixed(3) }}</p>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="8">
              <v-card class="pa-3">
                <v-card-title class="text-h6">{{ store.labelState === 3 ? 'Strongest correlations' : 'Corrélations les plus fortes' }}</v-card-title>
                <v-card-text>
                  <p v-for="corr in topCorrelations.slice(0, 5)" :key="corr.key" class="mb-2">
                    <strong>{{ corr.metric1 }} ↔ {{ corr.metric2 }}:</strong> {{ corr.value.toFixed(3) }}
                  </p>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </div>

      <div v-else class="no-data">
        <v-alert type="info" icon="mdi-information">
          {{ store.labelState === 3 ? 'Select an analysis level to display correlations.' : 'Sélectionnez un niveau d\\'analyse pour afficher les corrélations.' }}
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

import CorrelationHeatmap from '../components/CorrelationHeatmap.vue'
import ScatterPlot from '../components/ScatterPlot.vue'

export default {
  name: 'Correlations',
  components: {
    CorrelationHeatmap,
    ScatterPlot
  },
  setup() {
    const store = useDataStore()

    // Reactive state
    const selectedScope = ref('departements')
    const expandedPanels = ref([]) // Collapsed by default

    const selectedMetricsX = ref(['prenom_francais_pct', 'musulman_pct', 'naturalises_pct', 'francais_de_naissance_pct', 'etrangers_pct', 'europeens_pct', 'africains_pct', 'maghrebins_pct' ])
    const selectedMetricsY = ref(['homicides_total_p100k', 'violences_physiques_p1k', 'violences_sexuelles_p1k', 'vols_p1k','destructions_p1k', 'stupefiants_p1k', 'escroqueries_p1k'])
    const correlationMatrix = ref([])
    const metricLabels = ref([])
    const loading = ref(false)
    const error = ref('')
    const dataSize = ref(0)

    // Scatter plot state
    const selectedScatterMetrics = ref({ metric1: null, metric2: null })
    const selectedCorrelationValue = ref(null)
    const rawData = ref([])

    // Options
    const scopeOptions = computed(() => [
      { 
        value: 'departements', 
        title: store.labelState === 3 ? 'Departments' : 'Départements' 
      },
      { 
        value: 'communes_france', 
        title: store.labelState === 3 ? 'Municipalities (population > 50k)' : 'Communes (population > 50k)' 
      }
    ])



    const availableMetricOptions = computed(() => {
      const currentLevel = selectedScope.value === 'departements' ? 'departement' : 'commune'

      return MetricsConfig.metrics
        .filter(metric => {
          const isAvailable = MetricsConfig.isMetricAvailable(metric.value, currentLevel)
          const notPopulation = metric.value !== 'population'
          return isAvailable && notPopulation
        })
        .map(metric => ({
          value: metric.value,
          title: MetricsConfig.getMetricLabel(metric.value),
          group: getCategoryLabel(metric.category)
        }))
        .sort((a, b) => {
          // Sort by group first, then by title
          if (a.group !== b.group) {
            return a.group.localeCompare(b.group)
          }
          return a.title.localeCompare(b.title)
        })
    })

    // Computed properties
    const currentType = computed(() => {
      if (store.labelState === 3) {
        return selectedScope.value === 'departements' ? 'Departments' : 'Municipalities'
      }
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
      if (!correlationMatrix.value.length || !metricLabels.value.x || !metricLabels.value.y) return []
      const correlations = []

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

      return correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    })

    // Methods

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

      const metricsX = MetricsConfig.metrics.filter(metric => {
        return selectedMetricsX.value.includes(metric.value) &&
               MetricsConfig.isMetricAvailable(metric.value, currentLevel)
      })

      const metricsY = MetricsConfig.metrics.filter(metric => {
        return selectedMetricsY.value.includes(metric.value) &&
               MetricsConfig.isMetricAvailable(metric.value, currentLevel)
      })

      return { metricsX, metricsY }
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

      return { 
        matrix, 
        labels: { 
          x: labelsX, 
          y: labelsY,
          xKeys: metricsX.map(m => m.value),
          yKeys: metricsY.map(m => m.value)
        } 
      }
    }

    const fetchDepartmentData = async () => {
      let departmentData = store.country?.departementsRankings?.data

      if (!departmentData) {
        // Fallback: fetch département data from API if not in store
        try {
          const response = await api.getDepartementRankings({
            limit: 101, // Get all departments
            offset: 0,
            sort: 'population',
            direction: 'DESC'
          })
          departmentData = response?.data || []

          if (departmentData.length === 0) {
            throw new Error("Aucune donnée de département trouvée.")
          }
        } catch (err) {
          throw new Error(`Erreur lors du chargement des données de département : ${err.message}`)
        }
      }

      // Filter out overseas départements (971, 972, 973, 974, 976)
      const overseasDepts = ['971', '972', '973', '974', '976']
      return departmentData.filter(dept => {
        if (!dept || typeof dept !== 'object') return false
        const deptCode = dept.departement || dept.code || ''
        return !overseasDepts.includes(deptCode.toString())
      })
    }

    const fetchCommuneData = async () => {
      try {
        const requestParams = {
          dept: '', // All départements
          limit: 1000, // Get more data to filter properly
          offset: 0,
          sort: 'population',
          direction: 'DESC',
          population_range: '50000+' // Only communes with population > 50k
        }

        const response = await api.getCommuneRankings(requestParams)
        let communeData = response?.data || []

        // Filter out overseas départements
        const overseasDepts = ['971', '972', '973', '974', '976']
        communeData = communeData.filter(commune => {
          const deptCode = commune.departement || ''
          return !overseasDepts.includes(deptCode.toString())
        })

        return communeData
      } catch (err) {
        throw new Error(`Erreur lors du chargement des données communales: ${err.message}`)
      }
    }

    const updateCorrelations = async () => {
      if (selectedMetricsX.value.length === 0 || selectedMetricsY.value.length === 0) {
        error.value = "Veuillez sélectionner au moins une métrique pour chaque axe."
        return
      }

      loading.value = true
      error.value = ''

      try {
        let fetchedData = []

        if (selectedScope.value === 'departements') {
          fetchedData = await fetchDepartmentData()
        } else if (selectedScope.value === 'communes_france') {
          fetchedData = await fetchCommuneData()
        }

        if (fetchedData.length === 0) {
          error.value = "Aucune donnée disponible pour l'analyse."
          rawData.value = []
          return
        }

        // Store raw data for scatter plot
        rawData.value = fetchedData

        const selectedMetrics = getSelectedMetrics()

        if (!selectedMetrics.metricsX || !selectedMetrics.metricsY || 
            selectedMetrics.metricsX.length === 0 || selectedMetrics.metricsY.length === 0) {
          error.value = "Il faut sélectionner des métriques disponibles pour chaque axe."
          return
        }

        // Filter data to only include rows with valid values for selected metrics
        const allMetrics = [...selectedMetrics.metricsX, ...selectedMetrics.metricsY]
        const validData = fetchedData.filter(item => {
          return allMetrics.some(metric => {
            const value = parseFloat(item[metric.value])
            return !isNaN(value) && isFinite(value) && !isNaN(value) && value !== null && value !== undefined
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
        rawData.value = []
      } finally {
        loading.value = false
      }
    }

    const onScopeChanged = () => {
      correlationMatrix.value = []
      metricLabels.value = []
      error.value = ''

      updateCorrelations()
    }

    const onAxisSelectionChanged = () => {
      if (selectedMetricsX.value.length > 0 && selectedMetricsY.value.length > 0) {
        updateCorrelations()
      }
    }

    // Scatter plot methods
    const handleCorrelationHover = (data) => {
      // Optional: Could show additional info on hover
    }

    const handleCorrelationClick = (data) => {
      selectedScatterMetrics.value = {
        metric1: data.metric1,
        metric2: data.metric2
      }
      selectedCorrelationValue.value = data.correlation
    }

    // Watchers
    watch([selectedMetricsX, selectedMetricsY], () => {
      onAxisSelectionChanged()
    }, { deep: true })

    watch(() => store.labelState, () => {
      // Update labels when label state changes
      if (correlationMatrix.value.length > 0) {
        const selectedMetrics = getSelectedMetrics()
        if (selectedMetrics.metricsX && selectedMetrics.metricsY) {
          metricLabels.value = {
            x: selectedMetrics.metricsX.map(metric => MetricsConfig.getMetricLabel(metric.value)),
            y: selectedMetrics.metricsY.map(metric => MetricsConfig.getMetricLabel(metric.value))
          }
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
      expandedPanels,

      selectedMetricsX,
      selectedMetricsY,
      correlationMatrix,
      metricLabels,
      loading,
      error,
      dataSize,
      scopeOptions,

      availableMetricOptions,
      currentType,
      maxCorrelation,
      minCorrelation,
      topCorrelations,
      getCategoryLabel,
      onScopeChanged,

      onAxisSelectionChanged,
      updateCorrelations,
      // Scatter plot
      selectedScatterMetrics,
      selectedCorrelationValue,
      rawData,
      handleCorrelationHover,
      handleCorrelationClick
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

.heatmap-title .axis-info {
  color: #888;
  font-size: 0.8rem;
  margin: 5px 0 0 0;
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

/* Custom styles for the parameters panel to match Rankings.vue */
.parameters-panel {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
}

.parameters-title {
  background-color: #1976d2 !important;
  color: white !important;
}

.parameters-title .v-expansion-panel-title__overlay {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>