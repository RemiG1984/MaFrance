<template>
  <div class="ranking-results">
    <div class="data-box">
      <h2>Classement des {{ type }}s pour {{ metricName }}</h2>

      <!-- Top rankings -->
      <h3>Top {{ topRankings.length }}</h3>
      <div class="table-container">
        <table class="score-table">
          <thead>
            <tr class="score-header">
              <th style="width: 15%;">Rang</th>
              <th style="width: 40%;">{{ type }}</th>
              <th style="width: 25%;">Population</th>
              <th style="width: 20%;">Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="item in topRankings" 
              :key="`top-${item.rank}`"
              class="score-row"
            >
              <td>{{ item.rank }}</td>
              <td>{{ formatLocationName(item) }}</td>
              <td>{{ formatPopulation(item.population) }}</td>
              <td>{{ formatMetricValue(item[metric]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bottom rankings -->
      <h3>Bottom {{ bottomRankings.length }}</h3>
      <div class="table-container">
        <table class="score-table">
          <thead>
            <tr class="score-header">
              <th style="width: 15%;">Rang</th>
              <th style="width: 40%;">{{ type }}</th>
              <th style="width: 25%;">Population</th>
              <th style="width: 20%;">Valeur</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="item in bottomRankings" 
              :key="`bottom-${item.rank}`"
              class="score-row"
            >
              <td>{{ item.rank }}</td>
              <td>{{ formatLocationName(item) }}</td>
              <td>{{ formatPopulation(item.population) }}</td>
              <td>{{ formatMetricValue(item[metric]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDataStore } from '../services/store.js'
import { MetricsConfig } from '../utils/metricsConfig.js'

export default {
  name: 'RankingResults',
  props: {
    rankings: {
      type: Array,
      required: true
    },
    metric: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    limit: {
      type: Number,
      default: 10
    }
  },
  setup(props) {
    const store = useDataStore()
    const labelStateKey = ref(store.labelState)
    const currentLevel = ref('country'); // Assuming a default level, adjust as needed

    const metricName = computed(() => {
      // Force reactivity by accessing labelStateKey
      labelStateKey.value
      return MetricsConfig.getMetricLabel(props.metric)
    })

    const topRankings = computed(() => {
      return props.rankings.slice(0, props.limit)
    })

    const bottomRankings = computed(() => {
      const remaining = props.rankings.slice(props.limit)
      return remaining.sort((a, b) => a.rank - b.rank)
    })

    const formatLocationName = (item) => {
      if (props.type === 'departement') {
        return item.nom || item.name || `Département ${item.departement}`
      } else {
        return `${item.commune || item.name || item.nom} (${item.departement || item.deptCode})`
      }
    }

    const formatPopulation = (population) => {
      return population?.toLocaleString('fr-FR') || 'N/A'
    }

    const formatMetricValue = (value) => {
      return MetricsConfig.formatMetricValue(value, props.metric)
    }

    // Listen for label state changes
    const handleLabelChange = (event) => {
      labelStateKey.value = event.detail.labelState
    }

    onMounted(() => {
      window.addEventListener('metricsLabelsToggled', handleLabelChange)
    })

    onUnmounted(() => {
      window.removeEventListener('metricsLabelsToggled', handleLabelChange)
    })

    return {
      metricName,
      topRankings,
      bottomRankings,
      formatLocationName,
      formatPopulation,
      formatMetricValue,
      currentLevel // Make currentLevel available in template
    }
  },
  computed: {
    filteredRankings() {
      if (!this.rankings || this.rankings.length === 0) {
        return [];
      }

      let filtered = [...this.rankings];

      // Apply population filters
      if (this.filters && this.filters.popLower !== null) {
        filtered = filtered.filter(item => 
          item.population >= this.filters.popLower
        );
      }

      if (this.filters && this.filters.popUpper !== null) {
        filtered = filtered.filter(item => 
          item.population <= this.filters.popUpper
        );
      }

      // Apply limit
      if (this.filters && this.filters.topLimit && this.filters.topLimit > 0) {
        filtered = filtered.slice(0, this.filters.topLimit);
      }

      return filtered;
    },

    // Available metrics for current level - same as MapComponent
    availableMetrics() {
      return MetricsConfig.getAvailableMetrics(this.currentLevel || 'country');
    }
  },
  methods: {
    formatValue(value, format, metricKey = null) {
      if (value == null || isNaN(value)) return 'N/A';

      // Use MetricsConfig formatting if metricKey is provided - same as MapComponent
      if (metricKey) {
        return MetricsConfig.formatMetricValue(value, metricKey);
      }

      // Fallback to legacy formatting
      switch (format) {
        case 'percentage':
          return `${value.toFixed(1)}%`;
        case 'score':
          return value.toFixed(0);
        case 'rate':
          return value.toFixed(1);
        case 'currency':
          return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
          }).format(value);
        default:
          return value.toLocaleString('fr-FR');
      }
    },

    // Get metric value with calculation if needed - same logic as MapComponent
    getMetricValue(item, metricKey) {
      // Check if it's a calculated metric
      if (MetricsConfig.calculatedMetrics[metricKey]) {
        return MetricsConfig.calculateMetric(metricKey, item);
      }

      // Return raw value
      return item[metricKey];
    },

    // Check if metric is available for current level - same as MapComponent
    isMetricAvailable(metricKey) {
      return MetricsConfig.isMetricAvailable(metricKey, this.currentLevel || 'country');
    }
  }
}
</script>

<style scoped>
.ranking-results {
  width: 100%;
}

.data-box {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.data-box h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.5rem;
  text-align: center;
}

.data-box h3 {
  margin: 20px 0 15px 0;
  color: #555;
  font-size: 1.2rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 5px;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 30px;
}

.score-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0;
}

.score-header {
  background-color: #f8f9fa;
  font-weight: bold;
}

.score-header th {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  color: #495057;
  font-size: 14px;
}

.score-row {
  border-bottom: 1px solid #dee2e6;
  transition: background-color 0.2s;
}

.score-row:hover {
  background-color: #f8f9fa;
}

.score-row td {
  padding: 10px 8px;
  vertical-align: middle;
  font-size: 14px;
}

.score-row td:first-child {
  font-weight: bold;
  color: #007bff;
}

@media (max-width: 768px) {
  .data-box {
    padding: 15px;
  }

  .score-header th,
  .score-row td {
    padding: 8px 6px;
    font-size: 12px;
  }

  .data-box h2 {
    font-size: 1.3rem;
  }

  .data-box h3 {
    font-size: 1.1rem;
  }
}

@media (max-width: 480px) {
  .table-container {
    font-size: 11px;
  }

  .score-header th,
  .score-row td {
    padding: 6px 4px;
  }
}
</style>