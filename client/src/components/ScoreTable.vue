
<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Indices et données pour {{ location.name }}
    </v-card-title>

    <v-card-text>
      <!-- Show loading indicator while data is being fetched -->
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
      </div>

      <!-- Display table if there are rows -->
      <v-table v-else-if="tableRows.length > 0" class="score-table">
        <thead>
          <tr class="score-header">
            <th class="row-title"></th>
            <th class="score-main">{{ mainHeader }}</th>
            <th v-if="compareHeader" class="score-compare">{{ compareHeader }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in tableRows"
            :key="index"
            :class="getRowClasses(row)"
            :data-group-id="row.groupId"
            @click="handleRowClick(row)"
          >
            <td :class="getTitleClasses(row)">
              <span>{{ row.title }}</span>
            </td>
            <td class="score-main">{{ row.main }}</td>
            <td v-if="compareHeader" class="score-compare">{{ row.compare || '' }}</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Show message if no data is available -->
      <div v-else class="text-center py-8 text-grey">
        Aucune donnée disponible pour cette localisation
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { useDataStore } from '../services/store.js'
import { MetricsConfig } from '../utils/metricsConfig.js'
import { DepartementNames } from '../utils/departementNames.js'

export default {
  name: 'ScoreTable',
  props: {
    location: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      tableRows: [],
      mainHeader: '',
      compareHeader: ''
    }
  },
  computed: {
    dataStore() {
      return useDataStore()
    }
  },
  watch: {
    location: {
      handler() {
        this.updateTable()
      },
      immediate: true
    },
    'dataStore.labelState': {
      handler() {
        this.updateTable()
      }
    }
  },
  mounted() {
    window.addEventListener('metricsLabelsToggled', this.updateTable)
  },
  beforeUnmount() {
    window.removeEventListener('metricsLabelsToggled', this.updateTable)
  },
  methods: {
    updateTable() {
      if (!this.location || !this.location.type) {
        this.tableRows = []
        return
      }

      const level = this.location.type
      const storeSection = this.dataStore[level]
      let compareStoreSection = null

      // Set headers based on geographic level
      this.setHeaders(level, storeSection)

      const rows = []

      // Add population row first
      const populationMetric = MetricsConfig.getMetricByValue('population')
      if (MetricsConfig.isMetricAvailable('population', level)) {
        rows.push(this.createRow(populationMetric, storeSection, compareStoreSection))
      }

      // Get ordered unique categories, excluding 'général'
      const categories = this.getUniqueCategories()

      // Build rows for each category
      categories.forEach(category => {
        const categoryMetrics = MetricsConfig.getMetricsByCategory(category)
          .filter(m => MetricsConfig.isMetricAvailable(m.value, level))

        if (categoryMetrics.length === 0) return

        // Main row (first metric, usually the score)
        const mainMetric = categoryMetrics[0]
        rows.push(this.createRow(mainMetric, storeSection, compareStoreSection, false))

        // Sub-rows (remaining metrics)
        categoryMetrics.slice(1).forEach(subMetric => {
          rows.push(this.createRow(subMetric, storeSection, compareStoreSection, true))
        })
      })

      this.tableRows = this.addGroupIds(rows)
    },

    setHeaders(level, storeSection) {
      if (level === 'country') {
        this.mainHeader = this.location.name
        this.compareHeader = ''
      } else if (level === 'departement') {
        const deptCode = this.location.code
        this.mainHeader = `${deptCode} - ${DepartementNames[deptCode] || deptCode}`
        this.compareHeader = 'France'
      } else if (level === 'commune') {
        const communeData = storeSection.details
        const departement = communeData.departement
        const commune = communeData.commune
        this.mainHeader = `${departement} - ${commune}`
        this.compareHeader = DepartementNames[departement] || departement
      }
    },

    getUniqueCategories() {
      const seen = new Set()
      return MetricsConfig.metrics
        .map(m => m.category)
        .filter(c => {
          if (c === 'général' || seen.has(c)) return false
          seen.add(c)
          return true
        })
    },

    createRow(metric, storeSection, compareStoreSection, isSubRow = false) {
      const metricKey = metric.value
      const title = MetricsConfig.getMetricLabel(metricKey)
      const source = metric.source || 'details'

      // Get main value
      const main = this.getFormattedValue(storeSection, metricKey, source)
      
      // Get comparison value (if applicable)
      let compare = ''
      if (compareStoreSection) {
        compare = this.getFormattedValue(compareStoreSection, metricKey, source)
      }

      return { title, main, compare, subRow: isSubRow }
    },

    getFormattedValue(storeSection, metricKey, source) {
      const sectionData = storeSection[source]
      if (!sectionData) return 'N/A'

      let value = MetricsConfig.calculateMetric(metricKey, sectionData)
      if (value == null || value === undefined || isNaN(value)) return 'N/A'

      let formatted = MetricsConfig.formatMetricValue(value, metricKey)
      
      // Add year suffix for specific sources
      if (source === 'names' && sectionData.annais) {
        formatted += ` (${sectionData.annais})`
      } else if (source === 'crime' && sectionData.annee) {
        formatted += ` (${sectionData.annee})`
      }

      return formatted
    },

    addGroupIds(rows) {
      let currentGroupId = null
      return rows.map((row, index) => {
        if (!row.subRow) {
          currentGroupId = `group-${index}`
        }
        return { ...row, groupId: currentGroupId }
      })
    },

    getRowClasses(row) {
      const classes = ['score-row']
      if (row.subRow) {
        classes.push('sub-row', `group-${row.groupId}`, 'sub-row-hidden')
      }
      return classes.join(' ')
    },

    getTitleClasses(row) {
      const classes = ['row-title']
      if (row.subRow) {
        classes.push('sub-row')
      }
      return classes.join(' ')
    },

    handleRowClick(row) {
      if (!row.subRow) {
        const groupId = row.groupId
        const subRows = this.$el.querySelectorAll(`.sub-row.group-${groupId}`)
        subRows.forEach((subRow) => {
          subRow.classList.toggle('sub-row-hidden')
        })
      }
    }
  }
}
</script>

<style scoped>
.score-table {
  width: 100%;
}

.score-header th {
  background-color: #f5f5f5;
  font-weight: bold;
  padding: 12px;
  border-bottom: 2px solid #ddd;
}

.score-row {
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.score-row:not(.sub-row):hover {
  background-color: #f8f9fa;
}

.sub-row {
  background-color: #f9f9f9;
  cursor: default;
}

.sub-row-hidden {
  display: none;
}

.row-title {
  padding: 8px 12px;
  font-weight: 500;
}

.row-title.sub-row {
  padding-left: 32px;
  font-weight: normal;
  font-size: 0.9em;
}

.score-main, .score-compare {
  padding: 8px 12px;
  text-align: right;
}
</style>
