<template>
  <v-card>
    <v-card-title class="text-h5">
      Évolution des Prénoms
    </v-card-title>
    
    <v-card-text>      
      <div class="chart-container">
        <canvas ref="chartCanvas" class="chart-canvas"></canvas>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import Chart from 'chart.js/auto';
import { watermarkPlugin } from '../utils/chartWatermark.js'
let chart = null

export default {
  name: 'NamesGraph',
  props: {
    data: {
      type: Object,
      // required: true
    },
    location: {
      type: Object,
      // required: true
    },
  },
  data() {
    return {
      titleBase: "Évolution des prénoms de naissance",
      categories: [
        {
            key: "musulman_pct",
            label: "Prénoms musulmans",
            color: "#28a745",
            order: 1,
        },
        {
            key: "traditionnel_pct",
            label: "Prénoms français traditionnels",
            color: "#455a64",
            order: 2,
        },
        {
            key: "moderne_pct",
            label: "Prénoms français modernes",
            color: "#dc3545",
            order: 3,
        },
        {
            key: "europeen_pct",
            label: "Prénoms européens",
            color: "#007bff",
            order: 4,
        },
        {
            key: "invente_pct",
            label: "Prénoms inventés",
            color: "#17a2b8",
            order: 5,
        },
        {
            key: "africain_pct",
            label: "Prénoms africains",
            color: "#6c757d",
            order: 6,
        },
        {
            key: "asiatique_pct",
            label: "Prénoms asiatiques",
            color: "#ffc107",
            order: 7,
        },
      ]
    }
  },
  watch: {
    // Surveillance des changements de data
    data: {
      handler() {
        this.updateChart();
      },
      deep: true
    }
  },
  mounted(){
    // Register the watermark plugin
    Chart.register(watermarkPlugin);
    this.createChart()
  },
  methods: {
    
    createChart() {
      // const title = chartLabels[this.metricKey].label

      const config = {
        type: 'line', // Changez selon vos besoins : 'bar', 'pie', etc.
        data: {
          labels: [...this.data.labels], // Copie du tableau
          datasets: this.generateDatasets()
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: this.titleBase,
            },
            legend: {
              display: true,
              position: 'top',
              align: 'start',
              labels: {
                boxWidth: 12,
                padding: 8,
                usePointStyle: true,
                font: {
                  size: window.innerWidth < 768 ? 10 : 12
                }
              }
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
                display: false
              }
            }
          }
        }
      };
      
      const ctx = this.$refs.chartCanvas.getContext('2d')
      chart = new Chart(ctx, config);
    },

    generateDatasets() {
      const data = this.data.data
      const datasets = []

      for(const category of this.categories){
        const key = category.key
        const values = data[key]
        datasets.push({
          label: category.label,
          data: data[key] || [],
          borderColor: category.color,
          backgroundColor: category.color,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          order: category.order,
        })
      }

      return datasets
    },

    updateChart() {
      if (chart) {
        // Mise à jour des labels
        chart.data.labels = this.data.labels;
        const title = `${this.titleBase} (${this.location.code===null?'':this.location.code+' - '}${this.location.name})`

        chart.options.plugins.title.text = title;
        
        // Mise à jour des datasets
        const datasets = this.generateDatasets()
        chart.data.datasets = datasets
        
        // Redessiner le graphique
        chart.update()

      }
    }
  },
  
  beforeUnmount() {
    if (chart) {
      chart.destroy()
    }
  }
}
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 400px;
}

.chart-canvas {
  max-height: 400px;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .chart-container {
    height: 350px;
  }
  
  .chart-canvas {
    max-height: 350px;
  }
}
</style> 