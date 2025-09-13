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
          <span>Très forte (+0.7)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #e31a1c"></div>
          <span>Forte (+0.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fd8d3c"></div>
          <span>Modérée (+0.3)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fecc5c"></div>
          <span>Faible (+0.1)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ffffb2"></div>
          <span>Nulle (0)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #c7e9b4"></div>
          <span>Faible (-0.1)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #7fcdbb"></div>
          <span>Modérée (-0.3)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #41b6c4"></div>
          <span>Forte (-0.5)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #2c7fb8"></div>
          <span>Très forte (-0.7)</span>
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
      type: [Array, Object],
      required: true,
      default: () => []
    },
    title: {
      type: String,
      default: 'Corrélations'
    }
  },
  emits: ['correlation-hover', 'correlation-click'],
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
      ]).domain([-0.7, -0.5, -0.3, -0.1, 0, 0.1, 0.3, 0.5, 0.7])
    }

    const getCorrelationColor = (value) => {
      const colorScale = createColorScale()
      return colorScale(value).hex()
    }

    const createHeatmapData = () => {
      const data = []
      
      // Labels should always be in { x: [], y: [] } format now
      const labelsX = props.labels?.x || []
      const labelsY = props.labels?.y || []
      
      if (!props.matrix || !Array.isArray(props.matrix) || props.matrix.length === 0) {
        return data
      }
      
      for (let i = 0; i < props.matrix.length; i++) {
        if (!Array.isArray(props.matrix[i])) continue
        
        for (let j = 0; j < props.matrix[i].length; j++) {
          const value = props.matrix[i][j]
          const isInsufficientData = value === null || value === undefined || isNaN(value)
          const displayValue = isInsufficientData ? 0 : Number(value)
          
          data.push({
            x: j * 2 + 1, // Place marks at 1, 3, 5, etc.
            y: (props.matrix.length - 1 - i) * 2 + 1, // Place marks at 1, 3, 5, etc. with inversion
            v: displayValue,
            originalValue: value,
            xLabel: labelsX[j] || `Metric X${j}`,
            yLabel: labelsY[i] || `Metric Y${i}`,
            xMetricKey: props.labels?.xKeys?.[j] || labelsX[j],
            yMetricKey: props.labels?.yKeys?.[i] || labelsY[i],
            isInsufficientData: isInsufficientData
          })
        }
      }
      
      return data
    }

    const createChart = async () => {
      if (!chartCanvas.value || !props.matrix.length) {
        return
      }

      // Check if labels are properly structured
      const labelsX = props.labels?.x || []
      const labelsY = props.labels?.y || []
      
      if (labelsX.length === 0 || labelsY.length === 0) {
        return
      }

      await nextTick()

      const ctx = chartCanvas.value.getContext('2d')
      const heatmapData = createHeatmapData()

      // Destroy existing chart
      if (chartInstance) {
        chartInstance.destroy()
      }

      // Calculate cell size based on canvas and data dimensions
      const cellWidth = Math.max(30, Math.min(60, chartCanvas.value.clientWidth / labelsX.length))
      const cellHeight = Math.max(30, Math.min(60, chartCanvas.value.clientHeight / labelsY.length))
      const cellSize = Math.min(cellWidth, cellHeight)

      chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Corrélations',
            data: heatmapData,
            backgroundColor: (context) => {
              const point = context.raw
              if (point && point.isInsufficientData) {
                return '#f0f0f0'
              }
              if (point && typeof point.v === 'number') {
                return getCorrelationColor(point.v)
              }
              return '#f0f0f0'
            },
            borderColor: 'rgba(0,0,0,0.2)',
            borderWidth: 1,
            pointRadius: cellSize / 2,
            pointHoverRadius: cellSize / 2 + 2,
            pointStyle: 'rect'
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
                  if (absCorr >= 0.7) strength = 'très forte'
                  else if (absCorr >= 0.5) strength = 'forte'
                  else if (absCorr >= 0.3) strength = 'modérée'
                  else if (absCorr >= 0.1) strength = 'faible'
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
              position: 'top',
              min: 0,
              max: labelsX.length * 2,
              ticks: {
                callback: (value, index) => {
                  if (Number.isInteger(value) && value % 2 === 1) {
                    const labelIndex = Math.floor(value / 2);
                    if (labelIndex >= 0 && labelIndex < labelsX.length) {
                      const label = labelsX[labelIndex];
                      // Wrap long labels by splitting at spaces and inserting line breaks
                      if (label.length > 25) {
                        const words = label.split(' ');
                        const lines = [];
                        let currentLine = '';
                        
                        for (const word of words) {
                          if ((currentLine + ' ' + word).length > 20) {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                          } else {
                            currentLine = currentLine ? currentLine + ' ' + word : word;
                          }
                        }
                        if (currentLine) lines.push(currentLine);
                        return lines;
                      }
                      return label;
                    }
                  }
                  return ''; // Return empty string for even positions to generate ticks without labels
                },
                stepSize: 1, // Ensure ticks at every integer (0, 1, 2, 3, ...)
                font: {
                  size: 10,
                  weight: 'bold'
                },
                maxRotation: 45,
                minRotation: 45,
                padding: 8,
                align: 'center'
              },
              grid: {
                display: true,
                color: (context) => {
                  const value = context.tick.value;
                  return Number.isInteger(value) && value % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)';
                },
                lineWidth: 2, // Increased for visibility
                drawOnChartArea: true,
                drawTicks: false,
                z: 1 // Ensure grid lines are above the chart
              },
              border: {
                display: true,
                color: 'rgba(0,0,0,0.5)',
                width: 2
              }
            },
            y: {
              type: 'linear',
              min: 0,
              max: labelsY.length * 2,
              ticks: {
                callback: (value, index) => {
                  if (Number.isInteger(value) && value % 2 === 1) {
                    const actualIndex = Math.floor((labelsY.length * 2 - value) / 2);
                    if (actualIndex >= 0 && actualIndex < labelsY.length) {
                      const label = labelsY[actualIndex];
                      // Wrap long labels by splitting at spaces and inserting line breaks
                      if (label.length > 25) {
                        const words = label.split(' ');
                        const lines = [];
                        let currentLine = '';
                        
                        for (const word of words) {
                          if ((currentLine + ' ' + word).length > 20) {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                          } else {
                            currentLine = currentLine ? currentLine + ' ' + word : word;
                          }
                        }
                        if (currentLine) lines.push(currentLine);
                        return lines.join('\n');
                      }
                      return label;
                    }
                  }
                  return ''; // Return empty string for even positions to generate ticks without labels
                },
                stepSize: 1, // Ensure ticks at every integer (0, 1, 2, 3, ...)
                font: {
                  size: 10,
                  weight: 'bold'
                },
                padding: 8,
                align: 'center',
                maxRotation: 0,
                minRotation: 0
              },
              grid: {
                display: true,
                color: (context) => {
                  const value = context.tick.value;
                  return Number.isInteger(value) && value % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)';
                },
                lineWidth: 2, // Increased for visibility
                drawOnChartArea: true,
                drawTicks: false,
                z: 1 // Ensure grid lines are above the chart
              },
              border: {
                display: true,
                color: 'rgba(0,0,0,0.5)',
                width: 2
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
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const element = elements[0]
              const data = element.element.$context.raw
              emit('correlation-click', {
                metric1: data.xMetricKey || data.xLabel,
                metric2: data.yMetricKey || data.yLabel,
                correlation: data.originalValue !== undefined ? data.originalValue : data.v
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
  padding: 0;
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
    padding: 0;
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