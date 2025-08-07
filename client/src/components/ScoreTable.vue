<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Indices et données pour: {{ location.name }}
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
    },
    'dataStore.country': {
      handler() {
        if (this.location.type === 'country') this.updateTable()
      },
      deep: true
    },
    'dataStore.departement': {
      handler() {
        if (this.location.type === 'departement') this.updateTable()
      },
      deep: true
    },
    'dataStore.commune': {
      handler() {
        if (this.location.type === 'commune') this.updateTable()
      },
      deep: true
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

      if (!storeSection || !storeSection.details) {  // Check if data is loaded
        this.loading = true
        this.tableRows = []
        return
      }

      this.loading = false

      let compareStoreSection = null

      if (level === 'departement') {
        compareStoreSection = this.dataStore.country
      } else if (level === 'commune') {
        compareStoreSection = this.dataStore.departement
      }

      // Set headers based on geographic level
      this.setHeaders(level, storeSection)

      const rows = []

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
          if (seen.has(c)) return false
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
/* Score table specific styles */
  .score-table {
    width: 100%;
    border-collapse: collapse;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-top: 2px solid #ccc;
    border-bottom: 2px solid #ccc;
  }
  .score-header th {
    font-weight: bold;
    padding: 10px;
    border-bottom: 2px solid #ddd;
  }
  .score-header .row-title {
    background-color: #e9ecef;
    color: #333;
  }
  .score-header .score-main {
    background-color: #e9ecef;
    color: #111;
    font-weight: bold;
  }
  .score-header .score-compare {
    text-align: right;
    background-color: #e9ecef;
    color: #555;
    font-weight: bold;
  }
  .score-row {
    border-bottom: 1px solid #eee;
    transition: background-color 0.2s;
  }
  .score-row:not(.sub-row):hover .row-title,
  .score-row:not(.sub-row):hover .score-main,
  .score-row:not(.sub-row):hover .score-compare {
    background-color: rgba(25, 118, 210, 0.1);
  }
  .score-row:not(.sub-row):hover {
    cursor: pointer;
  }
  .sub-row {
    background-color: #f8f9fa;
    transition: all 0.2s ease;
  }
  .sub-row-hidden {
    display: none;
  }
  .row-title {
    padding: 8px 12px;
    font-weight: 500;
    color: #333;
    font-weight: bold;
  }
  .row-title.sub-row {
    padding-left: 32px;
    font-weight: 400;
    font-size: 14px;
    font-style: italic;
    color: #555;
  }
  .score-main {
    padding: 8px 12px;
    text-align: left;
    color: #222;
  }
  .score-compare {
    padding: 8px 12px;
    text-align: right;
    font-size: 14px;
    color: #555;
  }
  .score-row:nth-child(even) .row-title,
  .score-row:nth-child(even) .score-main,
  .score-row:nth-child(even) .score-compare {
    background-color: #ffffff;
  }
  .score-row:nth-child(odd) .row-title,
  .score-row:nth-child(odd) .score-main,
  .score-row:nth-child(odd) .score-compare {
    background-color: #f9f9f9;
  }

/* Responsive table */
@media (max-width: 768px) {
  .score-table {
    display: block;
    overflow-x: auto;
    min-width: 600px;
  }
}
</style>