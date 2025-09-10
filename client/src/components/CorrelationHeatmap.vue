<template>
  <div class="heatmap-container">
    <div class="chart-wrapper">
      <canvas ref="chartCanvas" :id="chartId" class="correlation-chart"></canvas>
    </div>
    
    <!-- Legend -->
    <div class="correlation-legend">
      <div class="legend-title">Intensité des corrélations</div>
      <div class="legend-scale">
        <div class="legend-item">
          <div class="legend-color" style="background: #b10026"></div>
          <span>Très forte (+1.0)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #e31a1c"></div>
          <span>Forte (+0.7)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fd8d3c"></div>
          <span>Modérée (+0.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fecc5c"></div>
          <span>Faible (+0.3)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ffffb2"></div>
          <span>Nulle (0)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #c7e9b4"></div>
          <span>Faible (-0.3)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #7fcdbb"></div>
          <span>Modérée (-0.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #41b6c4"></div>
          <span>Forte (-0.7)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #2c7fb8"></div>
          <span>Très forte (-1.0)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f0f0f0; border: 2px solid #ccc"></div>
          <span>Données insuffisantes</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import chroma from 'chroma-js'

// Register Chart.js components
Chart.register(...registerables)

export default {
  name: 'CorrelationHeatmap',
  props: {
    matrix: {
      type: Array,
      required: true,
      default: () => []
    },
    labels: {
      type: Array,
      required: true,
      default: () => []
    },
    title: {
      type: String,
      default: 'Corrélations'
    }
  },
  emits: ['correlation-hover'],
  setup(props, { emit }) {
    const chartCanvas = ref(null)
    const chartId = `correlation-chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let chartInstance = null

    // Color scale for correlations (from -1 to +1)
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
      const colorScale = createColorScale()
      return colorScale(value).hex()
    }

    const createHeatmapData = () => {
      const data = []
      const colorScale = createColorScale()
      
      for (let i = 0; i < props.matrix.length; i++) {
        for (let j = 0; j < props.matrix[i].length; j++) {
          const value = props.matrix[i][j]
          // Handle null values (insufficient data)
          const displayValue = value !== null ? value : 0
          const color = value !== null ? colorScale(value).hex() : '#f0f0f0' // Gray for null values
          
          data.push({
            x: j,
            y: props.matrix.length - 1 - i, // Invert Y axis
            v: displayValue,
            originalValue: value, // Keep track of original null
            color: color,
            xLabel: props.labels[j],
            yLabel: props.labels[i],
            isInsufficientData: value === null
          })
        }
      }
      
      return data
    }

    const createChart = async () => {
      if (!chartCanvas.value || !props.matrix.length || !props.labels.length) {
        return
      }

      await nextTick()

      const ctx = chartCanvas.value.getContext('2d')
      const heatmapData = createHeatmapData()

      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy()
      }

      chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Corrélations',
            data: heatmapData,
            backgroundColor: (context) => {
              const point = context.raw
              // Use gray for insufficient data, otherwise use correlation color
              if (point.isInsufficientData) {
                return '#f0f0f0'
              }
              return getCorrelationColor(context.raw.v)
            },
            borderColor: 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            pointRadius: (context) => {
              const size = Math.min(
                chartCanvas.value.width / props.labels.length / 2,
                chartCanvas.value.height / props.labels.length / 2,
                25
              )
              return Math.max(size, 8)
            },
            pointHoverRadius: (context) => {
              const size = Math.min(
                chartCanvas.value.width / props.labels.length / 2,
                chartCanvas.value.height / props.labels.length / 2,
                25
              )
              return Math.max(size + 3, 11)
            }
          }]
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
              display: true,
              text: props.title,
              font: {
                size: 16,
                weight: 'bold'
              },
              padding: 20
            },
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: () => '',
                label: (context) => {
                  const point = context.raw
                  
                  if (point.isInsufficientData) {
                    return [
                      `${point.xLabel} ↔ ${point.yLabel}`,
                      'Données insuffisantes',
                      'Moins de 20 observations valides'
                    ]
                  }
                  
                  const correlation = point.originalValue || point.v
                  let strength = ''
                  
                  const absCorr = Math.abs(correlation)
                  if (absCorr >= 0.9) strength = 'très forte'
                  else if (absCorr >= 0.7) strength = 'forte'
                  else if (absCorr >= 0.5) strength = 'modérée'
                  else if (absCorr >= 0.3) strength = 'faible'
                  else strength = 'très faible'
                  
                  const direction = correlation > 0 ? 'positive' : correlation < 0 ? 'négative' : 'nulle'
                  
                  return [
                    `${point.xLabel} ↔ ${point.yLabel}`,
                    `Corrélation: ${correlation.toFixed(3)}`,
                    `Force: ${strength} (${direction})`
                  ]
                }
              },
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: 'white',
              bodyColor: 'white',
              borderColor: '#ccc',
              borderWidth: 1,
              padding: 10,
              displayColors: false
            }
          },
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              min: -0.5,
              max: props.labels.length - 0.5,
              ticks: {
                stepSize: 1,
                callback: (value, index) => {
                  const labelIndex = Math.round(value)
                  if (labelIndex >= 0 && labelIndex < props.labels.length) {
                    const label = props.labels[labelIndex]
                    return label.length > 15 ? label.substring(0, 12) + '...' : label
                  }
                  return ''
                },
                font: {
                  size: 10
                },
                maxRotation: 45,
                minRotation: 0
              },
              grid: {
                display: false
              }
            },
            y: {
              type: 'linear',
              min: -0.5,
              max: props.labels.length - 0.5,
              ticks: {
                stepSize: 1,
                callback: (value, index) => {
                  const actualIndex = props.labels.length - 1 - Math.round(value)
                  if (actualIndex >= 0 && actualIndex < props.labels.length) {
                    const label = props.labels[actualIndex]
                    return label.length > 15 ? label.substring(0, 12) + '...' : label
                  }
                  return ''
                },
                font: {
                  size: 10
                }
              },
              grid: {
                display: false
              }
            }
          },
          onHover: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0]
              const data = element.element.$context.raw
              emit('correlation-hover', {
                metric1: data.xLabel,
                metric2: data.yLabel,
                correlation: data.v
              })
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
    watch(() => [props.matrix, props.labels], () => {
      createChart()
    }, { deep: true })

    watch(() => props.title, () => {
      if (chartInstance) {
        chartInstance.options.plugins.title.text = props.title
        chartInstance.update()
      }
    })

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

    return {
      chartCanvas,
      chartId
    }
  }
}
</script>

<style scoped>
.heatmap-container {
  width: 100%;
  position: relative;
}

.chart-wrapper {
  width: 100%;
  height: 600px;
  min-height: 400px;
  position: relative;
  margin-bottom: 20px;
  background: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.correlation-chart {
  width: 100% !important;
  height: 100% !important;
}

.correlation-legend {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.legend-title {
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
  color: #333;
}

.legend-scale {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 500px;
    padding: 5px;
  }
  
  .legend-scale {
    flex-direction: column;
    align-items: center;
  }
  
  .legend-item {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    height: 400px;
  }
}
</style>