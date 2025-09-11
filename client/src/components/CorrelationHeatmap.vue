  <template>
    <div class="heatmap-container">
      <div class="heatmap-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="heatmap-wrapper" ref="plotlyContainer" @mouseover="handleMouseOver" @mouseleave="handleMouseLeave"></div>

      <!-- Legend -->
      <div class="correlation-legend">
        <div class="legend-title">Intensité des corrélations</div>
        <div class="legend-scale">
          <div class="legend-gradient"></div>
          <div class="legend-labels">
            <span>-1.0</span>
            <span>-0.5</span>
            <span>0</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
          <div class="legend-item insufficient-data">
            <div class="legend-color" style="background: #f0f0f0; border: 2px solid #ccc"></div>
            <span>Données insuffisantes</span>
          </div>
        </div>
      </div>
    </div>
  </template>

  <script>
  import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue'
  import Plotly from 'plotly.js/lib/core'
  import 'plotly.js/lib/heatmap'

  export default defineComponent({
    name: 'CorrelationHeatmap',
    props: {
      matrix: {
        type: Array,
        required: true,
        default: () => []
      },
      labels: {
        type: Object,
        required: true,
        default: () => ({ x: [], y: [] })
      },
      title: {
        type: String,
        default: 'Corrélations'
      }
    },
    emits: ['correlation-hover'],
    setup(props, { emit }) {
      const plotlyContainer = ref(null)
      let plotlyInstance = null
      const hoverData = ref(null)

      // Prepare data for Plotly heatmap
      const preparePlotlyData = () => {
        const z = props.matrix.map(row => row.map(value => value === null || isNaN(value) ? 0 : value))
        return [{
          z: z,
          x: props.labels.x,
          y: props.labels.y,
          type: 'heatmap',
          colorscale: [
            [0, '#1a4971'], [0.142, '#41b6c4'], [0.285, '#a3d6cc'],
            [0.428, '#f0f4f5'], [0.571, '#f6e4b7'], [0.714, '#fd8d3c'],
            [0.857, '#a50026'], [1, '#a50026']
          ],
          zmin: -1,
          zmax: 1,
          colorbar: {
            title: 'Corrélation',
            tickvals: [-1, -0.5, 0, 0.5, 1],
            ticktext: ['-1.0', '-0.5', '0', '0.5', '1.0']
          },
          hoverongaps: false
        }]
      }

      // Configure Plotly layout
      const plotlyLayout = computed(() => ({
        title: {
          text: props.title,
          font: { size: 18, family: 'Inter, sans-serif', color: '#1a1a1a' }
        },
        xaxis: {
          title: '',
          tickangle: 0, // Horizontal labels
          tickmode: 'array',
          tickvals: props.labels.x.map((_, i) => i), // Center ticks on squares
          ticktext: props.labels.x.map(label => `<br>${label.split(' ').join('<br>')}`), // Wrap text with <br>
          side: 'top', // X-axis at top
          automargin: true
        },
        yaxis: {
          title: '',
          tickmode: 'array',
          tickvals: props.labels.y.map((_, i) => i), // Center ticks on squares
          ticktext: props.labels.y,
          automargin: true
        },
        margin: { t: 50, l: 150, r: 50, b: 50 }, // Adjust margins for labels
        height: 600,
        width: '100%',
        showlegend: false
      }))

      // Initialize Plotly chart
      const initPlotly = () => {
        if (plotlyContainer.value && !plotlyInstance) {
          const data = preparePlotlyData()
          const layout = plotlyLayout.value
          Plotly.newPlot(plotlyContainer.value, data, layout, { responsive: true })
          plotlyInstance = plotlyContainer.value
        }
      }

      // Update chart when props change with debouncing
      let updateTimeout = null
      watch(() => [props.matrix, props.labels], () => {
        if (updateTimeout) clearTimeout(updateTimeout)
        updateTimeout = setTimeout(() => {
          if (plotlyInstance) {
            const data = preparePlotlyData()
            const layout = plotlyLayout.value
            Plotly.react(plotlyInstance, data, layout)
          }
        }, 100)
      }, { immediate: true })

      // Handle hover events with throttling
      let hoverTimeout = null
      const handleMouseOver = (event) => {
        if (hoverTimeout) return
        hoverTimeout = setTimeout(() => {
          try {
            if (!plotlyInstance || !plotlyInstance._fullLayout) return
            
            const x = Math.round(plotlyInstance._fullLayout.xaxis.p2c(event.layerX))
            const y = Math.round(plotlyInstance._fullLayout.yaxis.p2c(event.layerY))
            const i = Math.floor(y / (600 / props.labels.y.length))
            const j = Math.floor(x / (600 / props.labels.x.length))

            if (i >= 0 && j >= 0 && props.matrix[i] && !isNaN(props.matrix[i][j])) {
              hoverData.value = {
                metric1: props.labels.x[j],
                metric2: props.labels.y[i],
                correlation: props.matrix[i][j]
              }
              emit('correlation-hover', hoverData.value)
            }
          } catch (error) {
            console.warn('Hover event error:', error)
          }
          hoverTimeout = null
        }, 50)
      }

      const handleMouseLeave = () => {
        hoverData.value = null
        emit('correlation-hover', null)
      }

      // Lifecycle hooks
      onMounted(() => {
        initPlotly()
      })

      onUnmounted(() => {
        if (plotlyInstance) {
          Plotly.purge(plotlyInstance)
          plotlyInstance = null
        }
      })

      return { plotlyContainer, plotlyLayout }
    }
  })
  </script>

  <style scoped>
  .heatmap-container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Inter', sans-serif;
  }

  .heatmap-header {
    text-align: center;
    margin-bottom: 20px;
  }

  .heatmap-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .heatmap-wrapper {
    position: relative;
    overflow-x: auto; /* Horizontal scroll for wide tables */
  }

  .correlation-legend {
    margin-top: 20px;
    padding: 15px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }

  .legend-title {
    font-weight: 600;
    font-size: 1rem;
    color: #1a1a1a;
    text-align: center;
    margin-bottom: 12px;
  }

  .legend-scale {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .legend-gradient {
    width: 100%;
    height: 20px;
    background: linear-gradient(
      to right,
      #1a4971, #41b6c4, #a3d6cc, #f0f4f5, #f6e4b7, #fd8d3c, #a50026
    );
    border-radius: 4px;
    border: 1px solid #e0e0e0;
  }

  .legend-labels {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.85rem;
    color: #333;
  }

  .legend-item.insufficient-data {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    font-size: 0.85rem;
    color: #333;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 1px solid #ccc;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .heatmap-container {
      padding: 10px;
    }

    .heatmap-wrapper {
      height: 450px;
    }

    .legend-gradient {
      height: 16px;
    }

    .legend-labels {
      font-size: 0.75rem;
    }

    .legend-item.insufficient-data {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .heatmap-wrapper {
      height: 350px;
    }

    .legend-title {
      font-size: 0.9rem;
    }

    .legend-labels {
      font-size: 0.7rem;
    }
  }
  </style>