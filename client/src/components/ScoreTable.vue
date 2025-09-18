<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-0">
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
            <th class="row-title" :style="getHeaderWidthStyle()"></th>
            <th class="score-main" :style="getMainColumnWidthStyle()">{{ mainHeader }}</th>
            <th v-if="compareHeader" class="score-compare" :style="getCompareColumnWidthStyle()">{{ compareHeader }}</th>
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
      compareHeader: '',
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
        this.mainHeader = 'France métropolitaine'
        this.compareHeader = 'France entière'
      } else if (level === 'departement') {
        const deptCode = this.location.code
        this.mainHeader = `${deptCode} - ${DepartementNames[deptCode] || deptCode}`
        this.compareHeader = 'France métropolitaine'
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

      // Handle France country level
      if (this.location.type === 'country' && this.location.name === 'France') {
        const main = this.getFormattedValueFromCountryArray(storeSection, metricKey, source, 'france metro')
        const compare = this.getFormattedValueFromCountryArray(storeSection, metricKey, source, 'france entiere')
        return { title, main, compare, subRow: isSubRow }
      }

      // Get main value
      const main = this.getFormattedValue(storeSection, metricKey, source)

      // Get comparison value (if applicable)
      let compare = ''
      if (compareStoreSection) {
        if (this.location.type === 'departement') {
          // For departements, compare with France metro
          compare = this.getFormattedValueFromCountryArray(compareStoreSection, metricKey, source, 'france metro')
        } else {
          compare = this.getFormattedValue(compareStoreSection, metricKey, source)
        }
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

    getFormattedValueFromCountryArray(storeSection, metricKey, source, countryType) {
      const sectionData = storeSection[source]
      if (!sectionData || !Array.isArray(sectionData)) return 'N/A'

      const data = sectionData.find(item => item.country === countryType)
      if (!data) return 'N/A'

      let value = MetricsConfig.calculateMetric(metricKey, data)
      if (value == null || value === undefined || isNaN(value)) return 'N/A'

      let formatted = MetricsConfig.formatMetricValue(value, metricKey)

      // Add year suffix for specific sources
      if (source === 'names' && data.annais) {
        formatted += ` (${data.annais})`
      } else if (source === 'crime' && data.annee) {
        formatted += ` (${data.annee})`
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
    },

    getHeaderWidthStyle() {
      if (this.compareHeader) return 'width: 50%'
      return 'width: 70%'
    },

    getMainColumnWidthStyle() {
      if (this.compareHeader) return 'width: 25%'
      return 'width: 30%'
    },

    getCompareColumnWidthStyle() {
      return 'width: 25%'
    }
  }
}
</script>

<style scoped>
/* Score table specific styles */
  .score-table {
    width: 100%;
    border-collapse: collapse;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e3f2fd;
    table-layout: fixed;
  }
  .score-header th {
    font-weight: bold;
    padding: 12px;
    border-bottom: 2px solid #1976d2;
    position: relative;
  }
  .score-header .row-title {
    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  .score-header .score-main {
    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    color: white;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  .score-header .score-compare {
    text-align: right;
    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    color: white;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
  .score-row {
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.3s ease;
    position: relative;
  }
  .score-row:not(.sub-row):hover {
    cursor: pointer;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.15);
  }
  .score-row:not(.sub-row):hover .row-title,
  .score-row:not(.sub-row):hover .score-main,
  .score-row:not(.sub-row):hover .score-compare {
    background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(25, 118, 210, 0.12) 100%);
    color: #1565c0;
  }
  .score-row:not(.sub-row):hover .row-title {
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
  .row-title {
    padding: 10px 14px;
    font-weight: 600;
    color: #1565c0;
    max-width: 50%;
    word-wrap: break-word;
    white-space: normal;
    overflow-wrap: break-word;
    position: relative;
    transition: all 0.3s ease;
  }
  .row-title.sub-row {
    padding-left: 36px;
    font-weight: 500;
    font-size: 14px;
    color: #666;
    max-width: 50%;
    word-wrap: break-word;
    white-space: normal;
    overflow-wrap: break-word;
    position: relative;
  }
  .score-main {
    padding: 10px 14px;
    text-align: left;
    color: #333;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  .score-compare {
    padding: 10px 14px;
    text-align: right;
    font-size: 14px;
    color: #666;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  .score-row:nth-child(even) .row-title,
  .score-row:nth-child(even) .score-main,
  .score-row:nth-child(even) .score-compare {
    background-color: #ffffff;
  }
  .score-row:nth-child(odd) .row-title,
  .score-row:nth-child(odd) .score-main,
  .score-row:nth-child(odd) .score-compare {
    background-color: #fafbfc;
  }

/* Responsive table */
@media (max-width: 768px) {
  .score-table {
    width: 100%;
    table-layout: fixed;
    font-size: 0.875rem;
  }

  .score-header th {
    padding: 8px 6px;
  }

  .row-title {
    width: 50%;
    padding: 6px 8px;
    font-size: 0.875rem;
  }

  .row-title.sub-row {
    padding-left: 24px;
    font-size: 0.8125rem;
  }

  .score-main,
  .score-compare {
    width: 25%;
    padding: 6px 4px;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .score-table {
    font-size: 0.8125rem;
  }

  .score-header th {
    padding: 6px 4px;
    font-size: 0.8125rem;
  }

  .row-title {
    padding: 4px 6px;
    font-size: 0.8125rem;
  }

  .row-title.sub-row {
    padding-left: 20px;
    font-size: 0.75rem;
  }

  .score-main,
  .score-compare {
    padding: 4px 3px;
    font-size: 0.8125rem;
  }
}
</style>