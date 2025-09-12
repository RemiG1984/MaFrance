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
      ]).domain([-1, -0.7, -0.5, -0.3, 0, 0.3, 0.5, 0.7, 1])
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
      console.log('Creating scatter data with:', {
        metric1: props.selectedMetrics.metric1,
        metric2: props.selectedMetrics.metric2,
        rawDataLength: props.rawData.length
      })

      if (!props.selectedMetrics.metric1 || !props.selectedMetrics.metric2 || !props.rawData.length) {
        console.log('Missing required data for scatter plot')
        return { points: [], trendLine: [] }
      }

      const points = []
      const metric1Key = props.selectedMetrics.metric1
      const metric2Key = props.selectedMetrics.metric2
      
      console.log('Looking for metrics:', metric1Key, 'vs', metric2Key)

      let validCount = 0
      let invalidCount = 0

      // Extract valid data points
      for (let i = 0; i < Math.min(5, props.rawData.length); i++) {
        const item = props.rawData[i]
        console.log(`Sample item ${i}:`, {
          [metric1Key]: item[metric1Key],
          [metric2Key]: item[metric2Key],
          keys: Object.keys(item).slice(0, 10)
        })
      }

      for (const item of props.rawData) {
        const x = parseFloat(item[metric1Key])
        const y = parseFloat(item[metric2Key])

        if (!isNaN(x) && !isNaN(y) && isFinite(x) && isFinite(y)) {
          points.push({
            x: x,
            y: y,
            label: item.name || item.departement_name || item.commune_name || item.departement || 'Point'
          })
          validCount++
        } else {
          invalidCount++
          if (invalidCount <= 3) {
            console.log('Invalid data point:', {
              [metric1Key]: item[metric1Key],
              [metric2Key]: item[metric2Key],
              x: x,
              y: y,
              item: Object.keys(item).slice(0, 10)
            })
          }
        }
      }

      console.log(`Data filtering results: ${validCount} valid, ${invalidCount} invalid points`)

      const trendLine = calculateTrendLine(points)

      return { points, trendLine }
    }

    const createChart = async () => {
      if (!chartCanvas.value || !props.selectedMetrics.metric1 || !props.selectedMetrics.metric2) {
        return
      }

      await nextTick()

      const ctx = chartCanvas.value.getContext('2d')
      const { points, trendLine } = createScatterData()

      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }

      if (points.length === 0) {
        console.log('No valid data points found for scatter plot')
        return
      }

      console.log(`Creating scatter plot with ${points.length} points`)

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
              pointRadius: 4,
              pointHoverRadius: 6
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
              showLine: true
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
            mode: 'point'
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
              padding: 10
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
      createChart()
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