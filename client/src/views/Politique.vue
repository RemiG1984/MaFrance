<template>
  <div class="politique-container">
    <v-card class="mb-4">
      <v-card-title class="text-h6 pb-0" style="white-space: normal; word-break: break-word;">
        {{ store.labelState === 3 ? 'Average commune values depending on mayor\'s political family' : 'Calcul des valeurs moyennes par commune suivant la famille politique du maire.' }}
      </v-card-title>

      <v-card-text>
        <!-- Loading indicator -->
        <div v-if="loading" class="d-flex justify-center align-center py-8">
          <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
        </div>

        <!-- Error message -->
        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- Data table -->
        <v-table v-else-if="tableRows.length > 0" class="politique-table">
          <thead>
            <tr class="politique-header">
              <th class="metric-column">{{ store.labelState === 3 ? 'Metric' : 'Métrique' }}</th>
              <th class="value-column gauche-header">{{ store.labelState === 3 ? 'Left' : 'Gauche' }}</th>
              <th class="value-column centre-header">{{ store.labelState === 3 ? 'Center' : 'Centre' }}</th>
              <th class="value-column autres-header">{{ store.labelState === 3 ? 'Others' : 'Autres' }}</th>
              <th class="value-column droite-header">{{ store.labelState === 3 ? 'Right' : 'Droite' }}</th>
              <th class="value-column extreme-droite-header">{{ store.labelState === 3 ? 'Far Right' : 'Extrême droite' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.id"
              :class="getRowClasses(row)"
              :data-group-id="row.groupId"
              @click="handleRowClick(row)"
            >
              <td :class="getTitleClasses(row)">
                <span>{{ row.title }}</span>
              </td>
              <td class="value-cell">{{ row.gauche }}</td>
              <td class="value-cell">{{ row.centre }}</td>
              <td class="value-cell">{{ row.autres }}</td>
              <td class="value-cell">{{ row.droite }}</td>
              <td class="value-cell">{{ row.extremeDroite }}</td>
            </tr>
          </tbody>
        </v-table>

        <!-- No data message -->
        <div v-else class="text-center py-8 text-grey">
          {{ store.labelState === 3 ? 'No data available' : 'Aucune donnée disponible' }}
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useDataStore } from '../services/store.js'
import api from '../services/api.js'
import { MetricsConfig, articleCategoriesRef } from '@/utils/metricsConfig'

export default {
  name: 'Politique',
  setup() {
    const store = useDataStore()
    const loading = ref(true)
    const error = ref('')
    const tableRows = ref([])
    const data = ref({})

    const getCategoryLabel = (category) => {
      if (category === 'général') {
        return store.labelState === 3 ? 'General' : 'Général'
      }
      return articleCategoriesRef[category] || category
    }

    const fetchPolitiqueData = async () => {
      try {
        loading.value = true
        error.value = ''

        const originalData = await api.getPolitique()
        if (!originalData) {
          throw new Error(store.labelState === 3 ? 'Failed to fetch data' : 'Échec de récupération des données')
        }

        const availableMetrics = new Set(Object.keys(originalData.Gauche || {}))

        const processedData = { gauche: originalData.Gauche || {}, centre: originalData.Centre || {}, autres: originalData.Autres || {}, droite: originalData.Droite || {}, extremeDroite: originalData["Extrême droite"] || {} };
        data.value = processedData

        const categories = ['général', 'insécurité', 'immigration', 'islamisme', 'défrancisation', 'wokisme']
        const rows = []

        categories.forEach(category => {
          const categoryMetrics = MetricsConfig.getMetricsByCategory(category).filter(metric => availableMetrics.has(metric.value))
          if (categoryMetrics.length === 0) return

          // Main row (first metric)
          const mainMetric = categoryMetrics[0]
          rows.push(createRow(mainMetric, false))

          // Sub-rows (remaining metrics)
          categoryMetrics.slice(1).forEach(subMetric => {
            rows.push(createRow(subMetric, true))
          })
        })

        tableRows.value = addGroupIds(rows)
      } catch (err) {
        error.value = store.labelState === 3
          ? `Error loading data: ${err.message}`
          : `Erreur lors du chargement des données : ${err.message}`
        console.error('Erreur fetchPolitiqueData:', err)
      } finally {
        loading.value = false
      }
    }


    const createRow = (metric, isSubRow = false) => {
       const metricKey = metric.value
       const title = MetricsConfig.getMetricLabel(metricKey)
       const gauche = MetricsConfig.formatMetricValue(data.value.gauche?.[metricKey], metricKey)
       const centre = MetricsConfig.formatMetricValue(data.value.centre?.[metricKey], metricKey)
       const autres = MetricsConfig.formatMetricValue(data.value.autres?.[metricKey], metricKey)
       const droite = MetricsConfig.formatMetricValue(data.value.droite?.[metricKey], metricKey)
       const extremeDroite = MetricsConfig.formatMetricValue(data.value.extremeDroite?.[metricKey], metricKey)

       return { title, gauche, centre, autres, droite, extremeDroite, subRow: isSubRow }
    }

    const addGroupIds = (rows) => {
      let currentGroupId = null
      return rows.map((row, index) => {
        if (!row.subRow) {
          currentGroupId = `group-${index}`
        }
        return { ...row, groupId: currentGroupId, id: index }
      })
    }

    const getRowClasses = (row) => {
      const classes = ['politique-row']
      if (row.subRow) {
        classes.push('sub-row', `group-${row.groupId}`, 'sub-row-hidden')
      }
      return classes.join(' ')
    }

    const getTitleClasses = (row) => {
      const classes = ['metric-cell']
      if (row.subRow) {
        classes.push('sub-row')
      }
      return classes.join(' ')
    }

    const handleRowClick = (row) => {
      if (!row.subRow) {
        const groupId = row.groupId
        const subRows = document.querySelectorAll(`.sub-row.group-${groupId}`)
        subRows.forEach((subRow) => {
          subRow.classList.toggle('sub-row-hidden')
        })
      }
    }

    onMounted(() => {
      fetchPolitiqueData()
    })

    return {
      store,
      loading,
      error,
      tableRows,
      data,
      MetricsConfig,
      getCategoryLabel,
      createRow,
      addGroupIds,
      getRowClasses,
      getTitleClasses,
      handleRowClick,
    }
  }
}
</script>

<style scoped>
.politique-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.politique-table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e3f2fd;
  table-layout: fixed;
}

.politique-header th {
  font-weight: bold;
  padding: 12px;
  border-bottom: 2px solid #1976d2;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.metric-column {
  width: 35%;
  background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
}

.gauche-header {
  width: 13%;
  text-align: center;
  background: rgba(255, 100, 100, 0.8);
}

.centre-header {
  width: 13%;
  text-align: center;
  background: rgba(255, 165, 0, 0.8);
}

.autres-header {
  width: 13%;
  text-align: center;
  background: rgba(128, 128, 128, 0.8);
}

.droite-header {
  width: 13%;
  text-align: center;
  background: rgba(100, 100, 255, 0.8);
}

.extreme-droite-header {
  width: 13%;
  text-align: center;
  background: rgba(0, 0, 128, 0.8);
}

.politique-row {
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  position: relative;
}

.politique-row:not(.sub-row):hover {
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
}

.politique-row:not(.sub-row):hover .metric-cell,
.politique-row:not(.sub-row):hover .value-cell {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(25, 118, 210, 0.12) 100%);
  color: #1565c0;
}

.politique-row:not(.sub-row):hover .metric-cell {
  border-left: 3px solid #2196f3;
}

.sub-row {
  background-color: #fafafa;
  transition: all 0.3s ease;
  border-left: 2px solid #e3f2fd;
}

.sub-row:hover {
  background-color: #f3f8ff;
  border-left-color: #90caf9;
}

.sub-row-hidden {
  display: none;
}

.metric-cell {
  padding: 10px 14px;
  font-weight: 600;
  color: #1565c0;
  word-wrap: break-word;
  white-space: normal;
  overflow-wrap: break-word;
  position: relative;
  transition: all 0.3s ease;
}

.metric-cell.sub-row {
  padding-left: 36px;
  font-weight: 500;
  font-size: 14px;
  color: #666;
}

.value-cell {
  padding: 10px 14px;
  text-align: center;
  color: #333;
  font-weight: 500;
  transition: all 0.3s ease;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  padding: 15px;
  border-radius: 4px;
  color: #c00;
  margin-bottom: 20px;
}

/* Responsive */
@media (max-width: 768px) {
  .politique-table {
    width: 100%;
    table-layout: fixed;
    font-size: 0.875rem;
  }

  .politique-header th {
    padding: 8px 6px;
  }

  .metric-cell {
    width: 50%;
    padding: 6px 8px;
    font-size: 0.875rem;
  }

  .metric-cell.sub-row {
    padding-left: 24px;
    font-size: 0.8125rem;
  }

  .value-cell {
    width: 10%;
    padding: 6px 4px;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .politique-table {
    font-size: 0.8125rem;
  }

  .politique-header th {
    padding: 6px 4px;
    font-size: 0.8125rem;
  }

  .metric-cell {
    padding: 4px 6px;
    font-size: 0.8125rem;
  }

  .metric-cell.sub-row {
    padding-left: 20px;
    font-size: 0.75rem;
  }

  .value-cell {
    width: 10%;
    padding: 4px 3px;
    font-size: 0.8125rem;
  }
}
</style>