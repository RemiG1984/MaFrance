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
    // Watch for changes in location prop to update the table
    location: {
      handler() {
        this.updateTable()
      },
      immediate: true
    },
    // Watch for changes in label state to refresh table labels
    'dataStore.labelState': {
      handler(newLabelState) {
        MetricsConfig.labelState = newLabelState
        this.updateTable()
      }
    }
  },
  mounted() {
    // Listen for metrics label changes
    window.addEventListener('metricsLabelsToggled', this.handleLabelsToggled)
    this.syncLabelState()
  },
  beforeUnmount() {
    window.removeEventListener('metricsLabelsToggled', this.handleLabelsToggled)
  },
  methods: {
    handleLabelsToggled() {
      this.syncLabelState()
      this.updateTable()
    },

    syncLabelState() {
      // Sync MetricsConfig labelState with the store's labelState
      MetricsConfig.labelState = this.dataStore.labelState
    },

    updateTable() {
      // Exit if no location or type is provided
      if (!this.location || !this.location.type) {
        this.tableRows = []
        return
      }

      const level = this.location.type
      const storeSection = this.dataStore[level]
      let compareStoreSection = null

      // Set headers based on geographic level
      if (level === 'country') {
        this.mainHeader = this.location.name
        this.compareHeader = ''
      } else if (level === 'departement') {
        compareStoreSection = this.dataStore.country
        const deptCode = this.location.code
        this.mainHeader = `${deptCode} - ${DepartementNames[deptCode] || deptCode}`
        this.compareHeader = 'France'
      } else if (level === 'commune') {
        compareStoreSection = this.dataStore.departement
        const communeData = storeSection.details
        const departement = communeData.departement
        const commune = communeData.commune
        this.mainHeader = `${departement} - ${commune}`
        this.compareHeader = DepartementNames[departement] || departement
      }

      const rows = []

      // Add population row first
      const populationMetric = MetricsConfig.getMetricByValue('population')
      if (MetricsConfig.isMetricAvailable('population', level)) {
        rows.push(this.createRow(populationMetric, storeSection, compareStoreSection, false))
      }

      // Get ordered unique categories, excluding 'général'
      const seen = new Set()
      const categories = MetricsConfig.metrics
        .map(m => m.category)
        .filter(c => {
          if (c === 'général' || seen.has(c)) return false
          seen.add(c)
          return true
        })

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

    // Determine the data source for a metric
    getSource(metricKey) {
      const metric = MetricsConfig.getMetricByValue(metricKey)
      if (!metric) return 'details'

      if (metricKey === 'subventions_p1') return 'subventions'
      if (metricKey.includes('centres_migrants')) return 'migrants'
      if (metric.category === 'insécurité' && metricKey !== 'insecurite_score') return 'crime'
      if (metricKey.endsWith('_pct') && ['immigration', 'islamisme', 'défrancisation'].includes(metric.category)) return 'names'

      return 'details'
    },

    // Create a table row for a metric
    createRow(metric, storeSection, compareStoreSection, subRow) {
      const metricKey = metric.value
      const title = MetricsConfig.getMetricLabel(metricKey)
      const source = this.getSource(metricKey)

      // Get main value
      let main = 'N/A'
      const sectionData = storeSection[source]
      if (sectionData) {
        let value = MetricsConfig.calculateMetric(metricKey, sectionData)
        if (value !== null && value !== undefined && !isNaN(value)) {
          main = MetricsConfig.formatMetricValue(value, metricKey)
          if (source === 'names' && sectionData.annais) {
            main += ` (${sectionData.annais})`
          } else if (source === 'crime' && sectionData.annee) {
            main += ` (${sectionData.annee})`
          }
        }
      }

      // Get comparison value (if applicable)
      let compare = ''
      if (compareStoreSection) {
        const compareData = compareStoreSection[source]
        if (compareData) {
          let value = MetricsConfig.calculateMetric(metricKey, compareData)
          if (value !== null && value !== undefined && !isNaN(value)) {
            compare = MetricsConfig.formatMetricValue(value, metricKey)
            if (source === 'names' && compareData.annais) {
              compare += ` (${compareData.annais})`
            } else if (source === 'crime' && compareData.annee) {
              compare += ` (${compareData.annee})`
            }
          }
        }
      }

      return { title, main, compare, subRow }
    },

    // Assign group IDs for main rows and their sub-rows
    addGroupIds(rows) {
      let currentGroupId = null
      return rows.map((row, index) => {
        if (!row.subRow) {
          currentGroupId = `group-${index}`
        }
        return { ...row, groupId: currentGroupId }
      })
    },

    // Get CSS classes for table rows
    getRowClasses(row) {
      const classes = ['score-row']
      if (row.subRow) {
        classes.push('sub-row', `group-${row.groupId}`, 'sub-row-hidden')
      }
      return classes.join(' ')
    },

    // Get CSS classes for row titles
    getTitleClasses(row) {
      const classes = ['row-title']
      if (row.subRow) {
        classes.push('sub-row')
      }
      return classes.join(' ')
    },

    // Handle row clicks to toggle sub-rows
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