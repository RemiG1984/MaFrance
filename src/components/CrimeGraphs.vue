
<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Graphiques de Criminalité
    </v-card-title>
    <v-card-text>
      <div class="chart-grid" v-if="chartList.length > 0">
        <div 
          v-for="chartKey in chartList" 
          :key="chartKey"
          class="chart-container"
        >
          <Graph
            :metricKey="chartKey"
            :data="aggregatedData[chartKey]"
            :dataLabels="labels"
            :chartConfig="getChartConfig(chartKey)"
          />
        </div>
      </div>
      <div v-else class="text-center py-8 text-grey">
        Aucune donnée disponible pour cette localisation
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import Graph from '../components/Graph.vue'
import { keyMapping } from '../utils/statsCalc.js'
import { chartLabels } from '../utils/metricsConfig.js'

export default {
  name: 'CrimeGraphs',
  components: {
    Graph
  },
  props: {
    location: {
      type: Object,
      // required: true
    },
    labels: {
      type: Array,
      // default: null
    },
    data: {
      type: Object,
      // default: null
    }
  },
  data() {
    return {
      levels: ['country', 'departement', 'commune'],
      chartList: [
        'violences_physiques_p1k',
        'violences_sexuelles_p1k',
        'vols_p1k',
        'destructions_p1k',
        'stupefiants_p1k',
        'escroqueries_p1k'
      ],
      // Chart configurations matching the original crimeGraphHandler.js
      chartConfigs: {
        'violences_physiques_p1k': {
          label: 'Violences physiques',
          color: '#007bff',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'violences_sexuelles_p1k': {
          label: 'Violences sexuelles',
          color: '#28a745',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'vols_p1k': {
          label: 'Vols',
          color: '#ffc107',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'destructions_p1k': {
          label: 'Destructions et dégradations',
          color: '#e83e8c',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'stupefiants_p1k': {
          label: 'Stupéfiants',
          color: '#17a2b8',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'escroqueries_p1k': {
          label: 'Escroqueries',
          color: '#fd7e14',
          yAxisTitle: 'Taux (pour mille habitants)'
        },
        'homicides_p100k': {
          label: 'Homicides',
          color: '#dc3545',
          yAxisTitle: 'Taux (pour 100k habitants)'
        }
      }
    }
  },
  mounted() {
    // console.log('data', this.data)
  },
  computed: {
    aggregatedData() {
      if (!this.data) return {}
      
      const result = {}
      
      // For each chart we want to display
      this.chartList.forEach(chartKey => {
        result[chartKey] = {}
        
        // Check if we have direct data for this key
        if (this.data[chartKey]) {
          // Copy the data structure directly
          for (const level of this.levels) {
            if (this.data[chartKey][level]) {
              result[chartKey][level] = this.data[chartKey][level]
            }
          }
        } else if (keyMapping[chartKey]) {
          // If we need to aggregate from multiple sources using keyMapping
          const sourceKeys = keyMapping[chartKey]
          
          for (const level of this.levels) {
            const inputSeries = sourceKeys
              .map(key => this.data[key] && this.data[key][level])
              .filter(serie => serie && Array.isArray(serie))

            if (inputSeries.length === 0) continue

            const seriesLength = inputSeries[0].length
            result[chartKey][level] = []

            for (let i = 0; i < seriesLength; i++) {
              let sum = 0
              inputSeries.forEach(serie => {
                const value = serie[i] === null || serie[i] === undefined ? 0 : serie[i]
                sum += value
              })
              result[chartKey][level].push(sum)
            }
          }
        }
      })
      
      return result
    }
  },
  methods: {
    getChartConfig(chartKey) {
      const config = this.chartConfigs[chartKey] || {}
      const locationName = this.location?.name || 'Localisation'
      
      return {
        type: 'line',
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 14,
                },
                color: '#343a40',
              },
            },
            title: {
              display: true,
              text: chartLabels[chartKey]?.label || config.label || chartKey,
              font: {
                family: "'Roboto', Arial, sans-serif",
                size: 18,
                weight: '700',
              },
              color: '#343a40',
              padding: {
                top: 10,
                bottom: 20,
              },
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#343a40',
              bodyColor: '#343a40',
              borderColor: '#dee2e6',
              borderWidth: 1,
              titleFont: {
                family: "'Roboto', Arial, sans-serif",
                size: 14,
              },
              bodyFont: {
                family: "'Roboto', Arial, sans-serif",
                size: 12,
              },
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  const unit = chartKey === 'homicides_p100k' 
                    ? ' (pour 100k hab.)' 
                    : ' (pour mille hab.)';
                  return label + context.parsed.y.toFixed(1) + unit;
                },
              },
            },
          },
          scales: {
            x: {
              title: {
                display: false,
              },
              ticks: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 12,
                },
                color: '#343a40',
              },
              grid: {
                color: '#ececec',
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 12,
                },
                color: '#343a40',
                callback: function (value) {
                  return value.toFixed(1);
                },
              },
              grid: {
                color: '#ececec',
              },
              title: {
                display: true,
                text: config.yAxisTitle || 'Taux',
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 14,
                  weight: '600',
                },
                color: '#343a40',
              },
            },
          },
        },
        // Dataset styling
        datasetStyles: {
          country: {
            borderColor: '#808080',
            backgroundColor: '#808080',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
          },
          departement: {
            borderColor: '#A9A9A9',
            backgroundColor: '#A9A9A9',
            borderDash: [10, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
          },
          commune: {
            borderColor: config.color || '#007bff',
            backgroundColor: config.color || '#007bff',
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          }
        }
      }
    }
  },
}
</script>

<style scoped>
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin: 20px 0;
}

@media (max-width: 768px) {
  .chart-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

.chart-container {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 400px;
}

@media (max-width: 768px) {
  .chart-container {
    padding: 15px;
    height: 300px;
  }
}
</style>
