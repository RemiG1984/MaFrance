
<template>
  <v-card>
    <v-card-title class="text-h6 pb-0 d-flex justify-space-between align-center" @click="toggleCollapse" style="cursor: pointer">
      <span>{{ isEnglish ? 'First Names Evolution' : 'Évolution des Prénoms' }}</span>
      <v-btn
        @click="toggleView"
        color="primary"
        variant="outlined"
        size="small"
      >
        {{ getViewToggleText() }}
      </v-btn>
    </v-card-title>
    <v-card-subtitle class="text-caption text-grey pt-0 pb-0">
      <a href="https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113" 
         target="_blank" 
         class="text-decoration-none">
        {{ isEnglish ? 'INSEE source' : 'source INSEE' }}
      </a>
    </v-card-subtitle>
    
    <v-expand-transition v-show="!isCollapsed">
      <v-card-text>
        <div class="chart-container">
          <canvas ref="chartCanvas" class="chart-canvas"></canvas>
        </div>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import Chart from 'chart.js/auto';
import { watermarkPlugin } from '../../utils/chartWatermark.js'
import { MetricsConfig } from '../../utils/metricsConfig.js'
import { mapStores } from 'pinia'
import { useDataStore } from '../../services/store.js'
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
      isCollapsed: false,
      detailedCategoriesFr: [
        { key: "musulman_pct", label: "Prénoms musulmans", color: "#22c55e", order: 1 },
        { key: "traditionnel_pct", label: "Prénoms français traditionnels", color: "#1e40af", order: 2 },
        { key: "moderne_pct", label: "Prénoms français modernes", color: "#60a5fa", order: 3 },
        { key: "europeen_pct", label: "Prénoms européens", color: "#8b5cf6", order: 4 },
        { key: "invente_pct", label: "Prénoms inventés", color: "#06b6d4", order: 5 },
        { key: "africain_pct", label: "Prénoms africains", color: "#1f2937", order: 6 },
        { key: "asiatique_pct", label: "Prénoms asiatiques", color: "#f59e0b", order: 7 },
      ],
      detailedCategoriesEn: [
        { key: "musulman_pct", label: "Muslim names", color: "#22c55e", order: 1 },
        { key: "traditionnel_pct", label: "Traditional French names", color: "#1e40af", order: 2 },
        { key: "moderne_pct", label: "Modern French names", color: "#60a5fa", order: 3 },
        { key: "europeen_pct", label: "European names", color: "#8b5cf6", order: 4 },
        { key: "invente_pct", label: "Invented names", color: "#06b6d4", order: 5 },
        { key: "africain_pct", label: "African names", color: "#1f2937", order: 6 },
        { key: "asiatique_pct", label: "Asian names", color: "#f59e0b", order: 7 },
      ]
    }
  },
  computed: {
    ...mapStores(useDataStore),
    
    isEnglish() {
      return this.dataStore.labelState === 3;
    },

    titleBase() {
      return this.isEnglish ? "Birth first names evolution" : "Évolution des prénoms de naissance";
    },

    detailedCategories() {
      return this.isEnglish ? this.detailedCategoriesEn : this.detailedCategoriesFr;
    },

    simplifiedCategories() {
      const categories = [
        {
          key: "prenom_francais_pct",
          label: MetricsConfig.getMetricLabel("prenom_francais_pct"),
          color: "#2563eb",
          order: 1,
        },
        {
          key: "musulman_pct",
          label: MetricsConfig.getMetricLabel("musulman_pct"),
          color: "#22c55e",
          order: 2,
        },
        {
          key: "extra_europeen_pct",
          label: MetricsConfig.getMetricLabel("extra_europeen_pct"),
          color: "#dc2626",
          order: 3,
        },
        {
          key: "europeen_pct",
          label: this.isEnglish ? "European names" : "Prénoms européens",
          color: "#8b5cf6",
          order: 4,
        },
      ];
      return categories;
    },

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
    getViewToggleText() {
      if (this.isEnglish) {
        return this.currentView === 'detailed' ? 'Simplified view' : 'Detailed view';
      } else {
        return this.currentView === 'detailed' ? 'Vue simplifiée' : 'Vue détaillée';
      }
    },

    toggleView() {
      this.currentView = this.currentView === 'detailed' ? 'simplified' : 'detailed';
      this.updateChart();
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
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
          pointRadius: 1,
          pointHoverRadius: 4,
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
