
<template>
  <div class="graph-container">
    <canvas :id="canvasId" :ref="canvasId"></canvas>
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'

// Register Chart.js components
Chart.register(...registerables)

export default {
  name: 'Graph',
  props: {
    metricKey: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      required: true
    },
    dataLabels: {
      type: Array,
      required: true
    },
    chartConfig: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      chart: null,
      canvasId: `chart-${this.metricKey}-${Math.random().toString(36).substr(2, 9)}`
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.createChart()
    })
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  watch: {
    data: {
      handler() {
        if (this.chart) {
          this.updateChart()
        } else {
          this.$nextTick(() => {
            this.createChart()
          })
        }
      },
      deep: true
    }
  },
  methods: {
    createChart() {
      const canvas = this.$refs[this.canvasId]
      if (!canvas) {
        console.error('Canvas not found for', this.canvasId)
        return
      }

      const ctx = canvas.getContext('2d')
      
      // Prepare datasets from the data
      const datasets = this.prepareDatasets()
      
      if (datasets.length === 0) {
        console.warn('No datasets available for', this.metricKey)
        return
      }

      // Calculate suggested max for y-axis
      const allValues = []
      datasets.forEach(dataset => {
        allValues.push(...dataset.data)
      })
      const maxDataValue = Math.max(...allValues)
      const suggestedMax = Math.ceil(maxDataValue * 1.1) || 1

      // Create chart configuration
      const config = {
        type: this.chartConfig.type || 'line',
        data: {
          labels: this.dataLabels,
          datasets: datasets
        },
        options: {
          ...this.chartConfig.options,
          scales: {
            ...this.chartConfig.options?.scales,
            y: {
              ...this.chartConfig.options?.scales?.y,
              max: suggestedMax
            }
          }
        }
      }

      this.chart = new Chart(ctx, config)
    },

    prepareDatasets() {
      const datasets = []
      const levels = ['country', 'departement', 'commune']
      const levelLabels = {
        country: 'France',
        departement: 'Département', 
        commune: this.getLocationName()
      }

      // Add datasets for each level that has data
      for (const level of levels) {
        if (this.data[level] && this.data[level].length > 0) {
          const style = this.chartConfig.datasetStyles?.[level] || {}
          
          datasets.push({
            label: levelLabels[level],
            data: this.data[level],
            ...style
          })
        }
      }

      return datasets
    },

    getLocationName() {
      // This should be passed from parent or computed based on current location
      return 'Localisation'
    },

    updateChart() {
      if (!this.chart) return

      const datasets = this.prepareDatasets()
      this.chart.data.datasets = datasets
      this.chart.data.labels = this.dataLabels
      
      // Update suggested max
      const allValues = []
      datasets.forEach(dataset => {
        allValues.push(...dataset.data)
      })
      const maxDataValue = Math.max(...allValues)
      const suggestedMax = Math.ceil(maxDataValue * 1.1) || 1
      
      if (this.chart.options.scales?.y) {
        this.chart.options.scales.y.max = suggestedMax
      }

      this.chart.update()
    }
  }
}
</script>

<style scoped>
.graph-container {
  position: relative;
  width: 100%;
  height: 100%;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
