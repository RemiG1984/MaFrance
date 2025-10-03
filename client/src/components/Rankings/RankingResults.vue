
<template>
  <div class="ranking-results">
    <div class="data-box">
      <h2>{{ title }}</h2>
      
      <!-- Top rankings -->
      <h3>{{ isEnglish ? 'Top' : 'Haut' }} {{ topRankings.length }}</h3>
      <div class="table-container">
        <table class="score-table">
          <thead>
            <tr class="score-header">
              <th style="width: 12%;">{{ isEnglish ? 'Rank' : 'Rang' }}</th>
              <th style="width: 35%;">{{ getTypeLabel(type) }}</th>
              <th style="width: 20%;">Population</th>
              <th v-if="showPoliticalColor && type === 'Commune'" style="width: 15%;">{{ isEnglish ? 'Mayor Political Family' : 'Famille Politique du Maire' }}</th>
              <th style="width: 18%;">{{ isEnglish ? 'Value' : 'Valeur' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in topRankings"
              :key="`top-${item.rank}`"
              class="score-row"
              :style="showPoliticalColor ? { backgroundColor: getRowColor(item.famille_nuance) } : {}"
            >
              <td>{{ item.rank }}</td>
              <td>{{ formatLocationName(item) }}</td>
              <td>{{ formatPopulation(item.population) }}</td>
              <td v-if="showPoliticalColor && type === 'Commune'">{{ item.famille_nuance || 'N/A' }}</td>
              <td>{{ formatMetricValue(item[metric]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Bottom rankings -->
      <h3>{{ isEnglish ? 'Bottom' : 'Bas' }} {{ bottomRankings.length }}</h3>
      <div class="table-container">
        <table class="score-table">
          <thead>
            <tr class="score-header">
              <th style="width: 12%;">{{ isEnglish ? 'Rank' : 'Rang' }}</th>
              <th style="width: 35%;">{{ getTypeLabel(type) }}</th>
              <th style="width: 20%;">Population</th>
              <th v-if="showPoliticalColor && type === 'Commune'" style="width: 15%;">{{ isEnglish ? 'Mayor Political Family' : 'Famille Politique du Maire' }}</th>
              <th style="width: 18%;">{{ isEnglish ? 'Value' : 'Valeur' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in bottomRankings"
              :key="`bottom-${item.rank}`"
              class="score-row"
              :style="showPoliticalColor ? { backgroundColor: getRowColor(item.famille_nuance) } : {}"
            >
              <td>{{ item.rank }}</td>
              <td>{{ formatLocationName(item) }}</td>
              <td>{{ formatPopulation(item.population) }}</td>
              <td v-if="showPoliticalColor && type === 'Commune'">{{ item.famille_nuance || 'N/A' }}</td>
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
import { useDataStore } from '../../services/store.js'
import { MetricsConfig } from '../../utils/metricsConfig.js'

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
    },
    showPoliticalColor: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const store = useDataStore()
    const labelStateKey = ref(store.labelState)

    const isEnglish = computed(() => store.labelState === 3)

    const metricName = computed(() => {
      // Force reactivity by accessing labelStateKey
      labelStateKey.value
      return MetricsConfig.getMetricLabel(props.metric)
    })

    const title = computed(() => {
      const typePlural = isEnglish.value ? getEnglishTypePlural(props.type) : props.type + 's'
      return isEnglish.value ? `Ranking of ${typePlural} for ${metricName.value}` : `Classement des ${props.type}s pour ${metricName.value}`
    })

    const getTypeLabel = (type) => {
      if (isEnglish.value) {
        if (type === 'departement') return 'Department'
        if (type === 'commune') return 'Municipality'
        return type
      } else {
        if (type === 'departement') return 'Département'
        if (type === 'commune') return 'Commune'
        return type
      }
    }

    const getEnglishTypePlural = (type) => {
      if (type === 'departement') return 'departments'
      if (type === 'commune') return 'municipalities'
      return type + 's'
    }

    const topRankings = computed(() => {
      return props.rankings.slice(0, props.limit)
    })

    const bottomRankings = computed(() => {
      const totalCount = props.rankings.length
      if (totalCount <= props.limit) {
        return [] // No bottom rankings if we have fewer items than the limit
      }
      
      // Calculate how many items to show in bottom list
      const remainingItems = totalCount - props.limit
      const bottomCount = Math.min(props.limit, remainingItems)
      
      // Get the last X items (they already have correct ranks from API)
      return props.rankings.slice(-bottomCount)
    })

    const formatLocationName = (item) => {
      if (props.type === 'departement') {
        return item.nom || item.name || (isEnglish.value ? `Department ${item.departement}` : `Département ${item.departement}`)
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

    const formatPoliticalColor = (item) => {
      return item.famille_nuance || 'N/A'
    }

    const getRowColor = (famille_nuance) => {
      if (famille_nuance === 'Gauche') return 'rgba(255, 100, 100, 0.2)'
      if (famille_nuance === 'Droite') return 'rgba(100, 100, 255, 0.2)'
      if (famille_nuance === 'Extrême droite') return 'rgba(0, 0, 128, 0.2)'
      if (famille_nuance === 'Centre') return 'rgba(255, 165, 0, 0.2)'
      return ''
    }

    return {
      isEnglish,
      metricName,
      title,
      topRankings,
      bottomRankings,
      formatLocationName,
      formatPopulation,
      formatMetricValue,
      formatPoliticalColor,
      getRowColor,
      getTypeLabel
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
  padding: 15px;
  margin-bottom: 15px;
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
