<template>
  <div class="chart-container">
    <canvas ref="chartCanvas" class="chart-canvas"></canvas>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { chartLabels } from '../utils/metricsConfig.js'
import Chart from 'chart.js/auto';
import { markRaw } from 'vue'

export default {
  name: 'Graph',
  props: {
    dataLabels: {
      type: Array,
      // required: true
    },
    data: {
      type: Object,
      // required: true
    },
    metricKey: {
      type: String,
      // required: true
    },
    loading: {
      type: Boolean,
    }
  },
  data() {
    return {
      levels: ['country', 'departement', 'commune'],
      countryLabel: 'France'
    }
  },
  watch: {
    // Surveillance des changements de dataLabels
    // dataLabels: {
    //   handler() {
    //     console.log('watch dataLabels')
    //     this.updateChart();
    //   },
    //   deep: true
    // },
    
    // Surveillance des changements de data
    data: {
      handler() {
        // console.log('watch data')
        this.updateChart();
      },
      deep: true
    }
  },
  // created() {
  //   // Définir des propriétés non-réactives
  //   Object.defineProperty(this, 'chart', {
  //     value: null,
  //     writable: true,
  //     enumerable: false,
  //     configurable: true
  //   });
  // },
  mounted(){
    this.createChart()
  },
  methods: {
    
    generateDatasets() {
      const colors = {
        country: 'rgba(54, 162, 235, 0.8)',
        departement: 'rgba(255, 99, 132, 0.8)', 
        commune: 'rgba(75, 192, 192, 0.8)'
      };
      
      const borderColors = {
        country: 'rgba(54, 162, 235, 1)',
        departement: 'rgba(255, 99, 132, 1)',
        commune: 'rgba(75, 192, 192, 1)'
      };


      const levels = Object.keys(this.data)
      const datasets = []
      // console.log('metricKey', this.metricKey, levels)

      for(const level of levels){
        datasets.push({
          label: level.charAt(0).toUpperCase() + level.slice(1),
          data: this.data[level] || [],
          backgroundColor: colors[level] || 'rgba(128, 128, 128, 0.8)',
          borderColor: borderColors[level] || 'rgba(128, 128, 128, 1)',
          borderWidth: 2,
          tension: 0.4 // Pour des courbes lisses si c'est un line chart
        })
      }
      // console.log('datasets', datasets)
      return datasets
    },

    createChart() {
      const title = chartLabels[this.metricKey].label

      const config = {
        type: 'line', // Changez selon vos besoins : 'bar', 'pie', etc.
        data: {
          labels: [...this.dataLabels], // Copie du tableau
          datasets: this.generateDatasets()
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: false,
                text: 'Valeurs'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Années'
              }
            }
          }
        }
      };
      
      const ctx = this.$refs.chartCanvas.getContext('2d')
      this.chart = markRaw(new Chart(ctx, config))
    },
    
    updateChart() {
      if (this.chart) {
        // Mise à jour des labels
        this.chart.data.labels = this.dataLabels;
        
        // Mise à jour des datasets
        const datasets = this.generateDatasets()
        this.chart.data.datasets = datasets
        
        // Redessiner le graphique
        this.chart.update('active')

      }
    }
  },

  beforeUnmount() {
    // Détruire tous le graphique
    if (this.chart) {
      this.chart.destroy()
    }
  }
}
</script>

<style scoped>
.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
}

.chart-canvas {
  max-height: 300px;
}
</style> 