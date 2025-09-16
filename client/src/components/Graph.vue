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
import { watermarkPlugin } from '../utils/chartWatermark.js'

export default {
  name: 'Graph',
  props: {
    dataLabels: {
      type: Array,
      // required: true
    },
    data: {
      type: Object,
      required: true
    },
    metricKey: {
      type: String,
      required: true
    },
    location: {
      type: Object,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapStores(useDataStore) // Maps useDataStore to this.dataStore
  },
  data() {
    return {
      levels: ['country', 'departement', 'commune'],
      countryLabel: 'France'
    }
  },
  watch: {
    // Surveillance des changements de data
    data: {
      handler() {
        this.updateChart();
      },
      deep: true
    },
    // Watch for label state changes to update chart titles
    'dataStore.labelState': {
      handler() {
        if (this.chart) {
          this.updateChartTitle();
        }
      }
    }
  },

  mounted(){
    // Register the watermark plugin
    Chart.register(watermarkPlugin);
    this.createChart()
  },
  methods: {
    getChartTitle() {
      if (!chartLabels[this.metricKey]) {
        return this.metricKey;
      }
      
      const labelStateName = this.dataStore.getLabelStateName();
      const metricConfig = chartLabels[this.metricKey];
      
      // Return the appropriate label based on current state
      switch (labelStateName) {
        case 'alt1':
          return metricConfig.alt1Label || metricConfig.label;
        case 'alt2':
          return metricConfig.alt2Label || metricConfig.label;
        default:
          return metricConfig.label;
      }
    },

    updateChartTitle() {
      if (this.chart) {
        const newTitle = this.getChartTitle();
        this.chart.options.plugins.title.text = newTitle;
        this.chart.update();
      }
    },

    generateDatasets() {
      // Add null check for data
      if (!this.data) {
        return [];
      }

      const currentLocationLevel = this.location.type === 'commune' ? 'commune' :
                                  this.location.type === 'departement' ? 'departement' : 'country';

      const datasets = [];

      // Define colors for each crime metric (from original crimeGraphHandler.js)
      const metricColors = {
        'homicides_p100k': '#dc3545',
        'violences_physiques_p1k': '#007bff',
        'violences_sexuelles_p1k': '#28a745',
        'vols_p1k': '#ffc107',
        'destructions_p1k': '#e83e8c',
        'stupefiants_p1k': '#17a2b8',
        'escroqueries_p1k': '#fd7e14'
      };

      // Add current location dataset (full line)
      if (this.data[currentLocationLevel]) {
        let label;
        let color = metricColors[this.metricKey] || '#dc3545'; // Use metric-specific color or default

        if (currentLocationLevel === 'country') {
          label = this.countryLabel;
        } else if (currentLocationLevel === 'departement') {
          const deptName = this.dataStore.levels.departement;
          const deptCode = this.dataStore.getDepartementCode();
          label = deptName ? (deptCode ? `${deptCode} - ${deptName}` : deptName) : 'Departement';
        } else if (currentLocationLevel === 'commune') {
          label = this.location.name;
        }

        datasets.push({
          label,
          data: this.data[currentLocationLevel] || [],
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5
        });
      }

      // Add reference datasets (dashed lines for higher levels)
      for (const level of this.levels) {
        if (level === currentLocationLevel || !this.data[level]) continue;

        let label;
        let color;
        let borderDash;

        if (level === 'country') {
          label = this.countryLabel;
          color = '#808080'; // Gray for country reference
          borderDash = [5, 5];
        } else if (level === 'departement') {
          const deptName = this.dataStore.levels.departement;
          const deptCode = this.dataStore.getDepartementCode();
          label = deptName ? (deptCode ? `${deptCode} - ${deptName}` : deptName) : 'Departement';
          color = '#A9A9A9'; // Light gray for department reference
          borderDash = [10, 5];
        }

        datasets.push({
          label,
          data: this.data[level] || [],
          borderColor: color,
          backgroundColor: color,
          borderDash: borderDash,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 0, // No points for reference lines
          pointHoverRadius: 0, // No hover points for reference lines
        });
      }

      return datasets;
    },

    createChart() {
      // Don't create chart if data is not available
      if (!this.data || !this.dataLabels) {
        return;
      }

      const title = this.getChartTitle()

      const config = {
        type: 'line',
        data: {
          labels: [...this.dataLabels],
          datasets: this.generateDatasets()
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: title,
              font: {
                family: "'Roboto', Arial, sans-serif",
                size: 18,
                weight: '700'
              },
              color: '#343a40',
              padding: {
                top: 5,
                bottom: 5
              }
            },
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 14
                },
                color: '#343a40'
              }
            },
            tooltip: {
              backgroundColor: '#fff',
              titleColor: '#343a40',
              bodyColor: '#343a40',
              borderColor: '#dee2e6',
              borderWidth: 1,
              titleFont: {
                family: "'Roboto', Arial, sans-serif",
                size: 14
              },
              bodyFont: {
                family: "'Roboto', Arial, sans-serif",
                size: 12
              },
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  const unit = context.dataset.label.includes('Homicides') ?
                    ' (pour 100k hab.)' : ' (pour mille hab.)';
                  return label + context.parsed.y.toFixed(1) + unit;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: false
              },
              ticks: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 12
                },
                color: '#343a40'
              },
              grid: {
                color: '#ececec'
              }
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 12
                },
                color: '#343a40',
                callback: function (value) {
                  return value.toFixed(1);
                }
              },
              grid: {
                color: '#ececec'
              },
              title: {
                display: true,
                text: this.metricKey.includes('homicides') ?
                  'Taux (pour 100k habitants)' : 'Taux (pour mille habitants)',
                font: {
                  family: "'Roboto', Arial, sans-serif",
                  size: 14,
                  weight: '600'
                },
                color: '#343a40'
              }
            }
          }
        }
      };

      const ctx = this.$refs.chartCanvas.getContext('2d')
      this.chart = markRaw(new Chart(ctx, config))
    },

    updateChart() {
      if (this.chart && this.data && this.dataLabels) {
        // Mise à jour des labels
        this.chart.data.labels = this.dataLabels;

        // Mise à jour des datasets
        const datasets = this.generateDatasets()
        this.chart.data.datasets = datasets

        // Update chart title based on current label state
        this.chart.options.plugins.title.text = this.getChartTitle();

        // Redessiner le graphique
        this.chart.update()

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
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-canvas {
  max-height: 300px;
  height: 100% !important;
  width: 100% !important;
}
</style>