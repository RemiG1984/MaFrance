
<template>
  <v-card>
    <v-card-title class="text-h5 d-flex justify-space-between align-center">
      <span>Évolution des Prénoms</span>
      <v-btn
        @click="toggleView"
        color="primary"
        variant="outlined"
        size="small"
      >
        {{ currentView === 'detailed' ? 'Vue simplifiée' : 'Vue détaillée' }}
      </v-btn>
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
import { MetricsConfig } from '../utils/metricsConfig.js'
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
      currentView: 'detailed', // 'detailed' or 'simplified'
      titleBase: "Évolution des prénoms de naissance",
      detailedCategories: [
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
      ],
      simplifiedCategories: [
        {
            key: "prenom_francais_pct",
            label: MetricsConfig.getMetricLabel("prenom_francais_pct"),
            color: "#455a64",
            order: 1,
        },
        {
            key: "musulman_pct",
            label: MetricsConfig.getMetricLabel("musulman_pct"),
            color: "#28a745",
            order: 2,
        },
        {
            key: "extra_europeen_pct",
            label: MetricsConfig.getMetricLabel("extra_europeen_pct"),
            color: "#dc3545",
            order: 3,
        },
        {
            key: "europeen_pct",
            label: "Prénoms européens",
            color: "#007bff",
            order: 4,
        },
      ]
    }
  },
  computed: {
    currentCategories() {
      return this.currentView === 'detailed' ? this.detailedCategories : this.simplifiedCategories;
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
    this.createChart();
    
    // Listen for metrics label changes
    window.addEventListener('metricsLabelsToggled', this.handleLabelChange);
  },
  beforeUnmount() {
    if (chart) {
      chart.destroy();
    }
    window.removeEventListener('metricsLabelsToggled', this.handleLabelChange);
  },
  methods: {
    toggleView() {
      this.currentView = this.currentView === 'detailed' ? 'simplified' : 'detailed';
      this.updateChart();
    },

    handleLabelChange() {
      // Update simplified categories labels with new metric labels
      this.simplifiedCategories[0].label = MetricsConfig.getMetricLabel("prenom_francais_pct");
      this.simplifiedCategories[1].label = MetricsConfig.getMetricLabel("musulman_pct");
      this.simplifiedCategories[2].label = MetricsConfig.getMetricLabel("extra_europeen_pct");
      
      this.updateChart();
    },
    
    createChart() {
      const config = {
        type: 'line',
        data: {
          labels: [...this.data.labels],
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

      for(const category of this.currentCategories){
        const key = category.key
        let values = data[key] || [];
        
        // Handle calculated metrics for simplified view
        if (key === 'prenom_francais_pct' && this.currentView === 'simplified') {
          values = data.traditionnel_pct?.map((val, index) => 
            val + (data.moderne_pct?.[index] || 0)
          ) || [];
        }
        
        if (key === 'extra_europeen_pct' && this.currentView === 'simplified') {
          values = data.musulman_pct?.map((val, index) => 
            val + (data.africain_pct?.[index] || 0) + (data.asiatique_pct?.[index] || 0)
          ) || [];
        }

        datasets.push({
          label: category.label,
          data: values,
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
