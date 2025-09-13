<template>
  <div class="scatter-plot-container">
    <div v-if="!selectedMetrics.metric1 || !selectedMetrics.metric2" class="no-selection">
      <v-card class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-scatter-plot</v-icon>
        <h3 class="text-grey-darken-1 mt-4">Cliquez sur une cellule du tableau de corrélation</h3>
        <p class="text-grey">pour afficher le nuage de points correspondant</p>
      </v-card>
    </div>

    <div v-else class="chart-wrapper">
      <div class="chart-header">
        <h3>{{ getMetricDisplayName(selectedMetrics.metric1) }} vs {{ getMetricDisplayName(selectedMetrics.metric2) }}</h3>
        <div class="correlation-info">
          <v-chip
            :color="getCorrelationColor(correlationValue)"
            :variant="Math.abs(correlationValue) < 0.3 ? 'outlined' : 'elevated'"
            size="large"
          >
            r = {{ correlationValue?.toFixed(3) || 'N/A' }}
          </v-chip>
        </div>
      </div>
      <canvas ref="chartCanvas" :id="chartId" class="scatter-chart"></canvas>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import chroma from 'chroma-js'
import { MetricsConfig } from '../utils/metricsConfig.js'

// Register Chart.js components
Chart.register(...registerables)

// Placeholder for DepartementNames mapping
// In a real application, this would be imported from a dedicated file like 'departementNames.js'
const DepartementNames = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
  "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube",
  "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal",
  "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
  "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne",
  "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
  "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault",
  "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura",
  "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique",
  "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire",
  "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle",
  "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
  "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
  "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
  "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
  "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse",
  "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne",
  "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis",
  "94": "Val-de-Marne", "95": "Val-d'Oise", "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
  "974": "La Réunion", "976": "Mayotte"
}


export default {
  name: 'ScatterPlot',
  props: {
    selectedMetrics: {
      type: Object,
      default: () => ({ metric1: null, metric2: null })
    },
    rawData: {
      type: Array,
      default: () => []
    },
    correlationValue: {
      type: Number,
      default: null
    }
  },
  setup(props) {
    const chartCanvas = ref(null)
    const chartId = `scatter-plot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let chartInstance = null

    // Color scale for correlations (same as heatmap)
    const createColorScale = () => {
      return chroma.scale([
        '#2c7fb8',  // Strong negative correlation
        '#41b6c4',  // Moderate negative
        '#7fcdbb',  // Weak negative  
        '#c7e9b4',  // Very weak negative
        '#ffffb2',  // No correlation
        '#fecc5c',  // Very weak positive
        '#fd8d3c',  // Weak positive
        '#e31a1c',  // Moderate positive
        '#b10026'   // Strong positive correlation
      ]).domain([-0.7, -0.5, -0.3, -0.1, 0, 0.1, 0.3, 0.5, 0.7])
    }

    const getCorrelationColor = (value) => {
      if (!value || isNaN(value)) return '#grey'
      const colorScale = createColorScale()
      return colorScale(value).hex()
    }

    const calculateTrendLine = (data) => {
      if (!data || data.length < 2) return []

      // Calculate linear regression
      const n = data.length
      const sumX = data.reduce((sum, point) => sum + point.x, 0)
      const sumY = data.reduce((sum, point) => sum + point.y, 0)
      const sumXY = data.reduce((sum, point) => sum + (point.x * point.y), 0)
      const sumXX = data.reduce((sum, point) => sum + (point.x * point.x), 0)

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      // Find min and max X values
      const xValues = data.map(point => point.x)
      const minX = Math.min(...xValues)
      const maxX = Math.max(...xValues)

      return [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept }
      ]
    }

    const createScatterData = () => {
      if (!props.selectedMetrics.metric1 || !props.selectedMetrics.metric2 || !props.rawData.length) {
        return { points: [], trendLine: [] }
      }

      const points = []
      const metric1Key = props.selectedMetrics.metric1
      const metric2Key = props.selectedMetrics.metric2

      let validCount = 0
      let invalidCount = 0

      for (const item of props.rawData) {
        // Ensure item exists and is an object
        if (!item || typeof item !== 'object') {
          invalidCount++
          continue
        }

        const x = parseFloat(item[metric1Key])
        const y = parseFloat(item[metric2Key])

        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
          // Format label based on data type
          let label = 'Point'

          if (item.commune && item.departement) {
            // Commune data: "Commune Name (Dept Code)"
            label = `${item.commune} (${item.departement})`
          } else if (item.departement_name && item.departement_code) {
            // Departement data: "Dept Name (Dept Code)"
            label = `${item.departement_name} (${item.departement_code})`
          } else if (item.name && item.departement_code) {
            // Alternative departement format using DepartementNames
            const deptName = DepartementNames[item.departement_code] || item.name
            label = `${deptName} (${item.departement_code})`
          } else if (item.departement_code) {
            // Just département code, get name from mapping
            const deptName = DepartementNames[item.departement_code] || item.departement_code
            label = `${deptName} (${item.departement_code})`
          } else {
            // Fallback to any available name
            label = item.name || item.departement_name || item.commune || item.departement || 'Point'
          }

          points.push({
            x: x,
            y: y,
            label: label
          })
          validCount++
        } else {
          invalidCount++
        }
      }

      const trendLine = calculateTrendLine(points)

      return { points, trendLine }
    }

    const createChart = async () => {
      if (!chartCanvas.value || !props.selectedMetrics.metric1 || !props.selectedMetrics.metric2) {
        return
      }

      await nextTick()

      // Ensure canvas is ready
      if (!chartCanvas.value.getContext) {
        setTimeout(createChart, 100)
        return
      }

      const ctx = chartCanvas.value.getContext('2d')
      const { points, trendLine } = createScatterData()

      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }

      if (points.length === 0) {
        // Force a retry if we have raw data but no points
        if (props.rawData.length > 0) {
          setTimeout(createChart, 100)
        }
        return
      }

      chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Points de données',
              data: points,
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointHitRadius: 12
            },
            {
              label: 'Droite de régression',
              data: trendLine,
              type: 'line',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 3,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0,
              tension: 0,
              showLine: true,
              tooltip: {
                filter: () => false
              }
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750
          },
          interaction: {
            intersect: false,
            mode: 'nearest'
          },
          plugins: {
            title: {
              display: false
            },
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20
              }
            },
            tooltip: {
              enabled: true,
              mode: 'nearest',
              intersect: false,
              animation: {
                duration: 0
              },
              callbacks: {
                title: (context) => {
                  const point = context[0]
                  return point.raw.label || 'Point de données'
                },
                label: (context) => {
                  const point = context.raw
                  if (context.datasetIndex === 0) { // Data points
                    return [
                      `${getMetricDisplayName(props.selectedMetrics.metric1)}: ${point.x.toFixed(2)}`,
                      `${getMetricDisplayName(props.selectedMetrics.metric2)}: ${point.y.toFixed(2)}`
                    ]
                  } else { // Trend line
                    return `Droite de régression`
                  }
                }
              },
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: 'white',
              bodyColor: 'white',
              borderColor: '#ccc',
              borderWidth: 1,
              padding: 10,
              caretPadding: 8,
              cornerRadius: 4,
              displayColors: false
            }
          },
          scales: {
            x: {
              type: 'linear',
              title: {
                display: true,
                text: getMetricDisplayName(props.selectedMetrics.metric1),
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              grid: {
                display: true,
                color: 'rgba(0,0,0,0.1)'
              }
            },
            y: {
              type: 'linear',
              title: {
                display: true,
                text: getMetricDisplayName(props.selectedMetrics.metric2),
                font: {
                  size: 14,
                  weight: 'bold'
                }
              },
              grid: {
                display: true,
                color: 'rgba(0,0,0,0.1)'
              }
            }
          }
        }
      })
    }

    const resizeChart = () => {
      if (chartInstance) {
        chartInstance.resize()
      }
    }

    // Watchers
    watch(() => [props.selectedMetrics, props.rawData, props.correlationValue], () => {
      // Add a small delay to ensure all props are properly updated
      nextTick(() => {
        createChart()
      })
    }, { deep: true, immediate: false })

    // Watch specifically for when selectedMetrics changes from null to actual values
    watch(() => props.selectedMetrics, (newMetrics, oldMetrics) => {
      if (newMetrics.metric1 && newMetrics.metric2 && 
          (!oldMetrics.metric1 || !oldMetrics.metric2)) {
        // This is the initial selection, give it extra time
        setTimeout(() => {
          createChart()
        }, 50)
      }
    }, { deep: true })

    // Lifecycle
    onMounted(() => {
      createChart()
      window.addEventListener('resize', resizeChart)
    })

    onUnmounted(() => {
      if (chartInstance) {
        chartInstance.destroy()
      }
      window.removeEventListener('resize', resizeChart)
    })

    const getMetricDisplayName = (metricKey) => {
      return MetricsConfig.getMetricLabel(metricKey) || metricKey
    }

    return {
      chartCanvas,
      chartId,
      getCorrelationColor,
      getMetricDisplayName
    }
  }
}
</script>

<style scoped>
.scatter-plot-container {
  width: 100%;
  margin-top: 32px;
}

.no-selection {
  width: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-wrapper {
  width: 100%;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
  min-width: 250px;
}

.correlation-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scatter-chart {
  width: 100% !important;
  height: 400px !important;
  min-height: 400px;
  display: block;
  background-color: transparent;
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chart-header h3 {
    font-size: 1.1rem;
    min-width: auto;
  }

  .scatter-chart {
    height: 350px !important;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    padding: 15px;
  }

  .scatter-chart {
    height: 300px !important;
  }
}
</style>