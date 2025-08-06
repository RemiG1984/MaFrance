<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Indices et données pour {{ location.name }}
    </v-card-title>

    <v-card-text>
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
      </div>

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
      handler(newLabelState) {
        // Update MetricsConfig when store labelState changes
        MetricsConfig.labelState = newLabelState
        this.updateTable()
      }
    }
  },
  mounted() {
    // Listen for metrics label changes
    window.addEventListener('metricsLabelsToggled', this.handleLabelsToggled)
    // Sync MetricsConfig with store on component mount
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
      if (!this.location || !this.location.type) {
        this.tableRows = []
        return
      }

      switch (this.location.type) {
        case 'country':
          this.buildCountryTable()
          break
        case 'departement':
          this.buildDepartementTable()
          break
        case 'commune':
          this.buildCommuneTable()
          break
        default:
          this.tableRows = []
      }
    },

    buildCountryTable() {
      const countryData = this.dataStore.country.details
      const namesData = this.dataStore.country.names
      const crimeData = this.dataStore.country.crime

      if (!countryData || !namesData || !crimeData) {
        this.tableRows = []
        return
      }

      this.mainHeader = this.location.name
      this.compareHeader = ''

      const metrics = this.calculateCommonMetrics(namesData, crimeData)
      const crimeRows = this.createCrimeRows(
        metrics, 
        crimeData, 
        `/crime_graph.html?type=country&code=France`
      )

      const rows = [
        {
          title: "Population",
          main: countryData.population ? countryData.population.toLocaleString("fr-FR") : "N/A",
        },
        {
          title: MetricsConfig.getMetricLabel("insecurite_score"),
          main: MetricsConfig.formatMetricValue(countryData.insecurite_score, "insecurite_score"),
        },
        ...crimeRows,
        {
          title: MetricsConfig.getMetricLabel("immigration_score"),
          main: MetricsConfig.formatMetricValue(countryData.immigration_score, "immigration_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
          main: MetricsConfig.formatMetricValue(metrics.extraEuropeenPct, "extra_europeen_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("islamisation_score"),
          main: MetricsConfig.formatMetricValue(countryData.islamisation_score, "islamisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("musulman_pct"),
          main: MetricsConfig.formatMetricValue(metrics.musulmanPct, "musulman_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("number_of_mosques"),
          main: MetricsConfig.formatMetricValue(countryData.number_of_mosques, "number_of_mosques"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("mosque_p100k"),
          main: MetricsConfig.formatMetricValue(countryData.mosque_p100k, "mosque_p100k"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("defrancisation_score"),
          main: MetricsConfig.formatMetricValue(countryData.defrancisation_score, "defrancisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
          main: MetricsConfig.formatMetricValue(metrics.prenomFrancaisPct, "prenom_francais_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("immigration_score"),
          main: MetricsConfig.formatMetricValue(countryData.immigration_score, "immigration_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
          main: MetricsConfig.formatMetricValue(metrics.extraEuropeenPct, "extra_europeen_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_places_centres_migrants"),
          main: this.dataStore.country.migrants ? MetricsConfig.formatMetricValue(this.dataStore.country.migrants.total_places_centres_migrants || 0, "total_places_centres_migrants") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("places_centres_migrants_p1"),
          main: this.dataStore.country.migrants ? MetricsConfig.formatMetricValue(this.dataStore.country.migrants.places_centres_migrants_p1 || 0, "places_centres_migrants_p1") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("islamisation_score"),
          main: MetricsConfig.formatMetricValue(countryData.islamisation_score, "islamisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("musulman_pct"),
          main: MetricsConfig.formatMetricValue(metrics.musulmanPct, "musulman_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("number_of_mosques"),
          main: MetricsConfig.formatMetricValue(countryData.number_of_mosques, "number_of_mosques"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("mosque_p100k"),
          main: MetricsConfig.formatMetricValue(countryData.mosque_p100k, "mosque_p100k"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("defrancisation_score"),
          main: MetricsConfig.formatMetricValue(countryData.defrancisation_score, "defrancisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
          main: MetricsConfig.formatMetricValue(metrics.prenomFrancaisPct, "prenom_francais_pct") + metrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("wokisme_score"),
          main: MetricsConfig.formatMetricValue(countryData.wokisme_score, "wokisme_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("logements_sociaux_pct"),
          main: countryData.logements_sociaux_pct !== null && countryData.logements_sociaux_pct !== undefined
              ? MetricsConfig.formatMetricValue(countryData.logements_sociaux_pct, "logements_sociaux_pct")
              : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_qpv"),
          main: MetricsConfig.formatMetricValue(countryData.total_qpv, "total_qpv"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
          main: MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct, "pop_in_qpv_pct"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_subventions"),
          main: this.dataStore.country.subventions ? MetricsConfig.formatMetricValue(this.dataStore.country.subventions.total_subventions || 0, "total_subventions") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("subventions_p1"),
          main: this.dataStore.country.subventions ? MetricsConfig.formatMetricValue(this.dataStore.country.subventions.subventions_p1 || 0, "subventions_p1") : "N/A",
          subRow: true,
        },
      ]

      this.tableRows = this.addGroupIds(rows)
    },

    buildDepartementTable() {
      const deptData = this.dataStore.departement.details
      const countryData = this.dataStore.country.details
      const namesData = this.dataStore.departement.names
      const crimeData = this.dataStore.departement.crime
      const countryNamesData = this.dataStore.country.names
      const countryCrimeData = this.dataStore.country.crime

      if (!deptData || !countryData || !namesData || !crimeData || !countryNamesData || !countryCrimeData) {
        this.tableRows = []
        return
      }

      const deptCode = this.location.code
      this.mainHeader = `${deptCode} - ${DepartementNames[deptCode] || deptCode}`
      this.compareHeader = 'France'

      const deptMetrics = this.calculateCommonMetrics(namesData, crimeData)
      const countryMetrics = this.calculateCommonMetrics(countryNamesData, countryCrimeData)
      const crimeRows = this.createCrimeRows(
        deptMetrics, 
        crimeData, 
        `/crime_graph.html?type=department&code=${deptCode}`,
        countryMetrics,
        countryCrimeData
      )

      const rows = [
        {
          title: "Population",
          main: deptData.population ? deptData.population.toLocaleString("fr-FR") : "N/A",
          compare: countryData.population ? countryData.population.toLocaleString("fr-FR") : "N/A",
        },
        {
          title: MetricsConfig.getMetricLabel("insecurite_score"),
          main: MetricsConfig.formatMetricValue(deptData.insecurite_score, "insecurite_score"),
          compare: MetricsConfig.formatMetricValue(countryData.insecurite_score, "insecurite_score"),
        },
        ...crimeRows,
        {
          title: MetricsConfig.getMetricLabel("immigration_score"),
          main: MetricsConfig.formatMetricValue(deptData.immigration_score, "immigration_score"),
          compare: MetricsConfig.formatMetricValue(countryData.immigration_score, "immigration_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
          main: MetricsConfig.formatMetricValue(deptMetrics.extraEuropeenPct, "extra_europeen_pct") + deptMetrics.yearLabel,
          compare: MetricsConfig.formatMetricValue(countryMetrics.extraEuropeenPct, "extra_europeen_pct") + countryMetrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_places_centres_migrants"),
          main: this.dataStore.departement.migrants ? MetricsConfig.formatMetricValue(this.dataStore.departement.migrants.total_places_centres_migrants || 0, "total_places_centres_migrants") : "N/A",
          compare: this.dataStore.country.migrants ? MetricsConfig.formatMetricValue(this.dataStore.country.migrants.total_places_centres_migrants || 0, "total_places_centres_migrants") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("places_centres_migrants_p1"),
          main: this.dataStore.departement.migrants ? MetricsConfig.formatMetricValue(this.dataStore.departement.migrants.places_centres_migrants_p1 || 0, "places_centres_migrants_p1") : "N/A",
          compare: this.dataStore.country.migrants ? MetricsConfig.formatMetricValue(this.dataStore.country.migrants.places_centres_migrants_p1 || 0, "places_centres_migrants_p1") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("islamisation_score"),
          main: MetricsConfig.formatMetricValue(deptData.islamisation_score, "islamisation_score"),
          compare: MetricsConfig.formatMetricValue(countryData.islamisation_score, "islamisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("musulman_pct"),
          main: MetricsConfig.formatMetricValue(deptMetrics.musulmanPct, "musulman_pct") + deptMetrics.yearLabel,
          compare: MetricsConfig.formatMetricValue(countryMetrics.musulmanPct, "musulman_pct") + countryMetrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("number_of_mosques"),
          main: MetricsConfig.formatMetricValue(deptData.number_of_mosques, "number_of_mosques"),
          compare: MetricsConfig.formatMetricValue(countryData.number_of_mosques, "number_of_mosques"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("mosque_p100k"),
          main: MetricsConfig.formatMetricValue(deptData.mosque_p100k, "mosque_p100k"),
          compare: MetricsConfig.formatMetricValue(countryData.mosque_p100k, "mosque_p100k"),
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("defrancisation_score"),
          main: MetricsConfig.formatMetricValue(deptData.defrancisation_score, "defrancisation_score"),
          compare: MetricsConfig.formatMetricValue(countryData.defrancisation_score, "defrancisation_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
          main: MetricsConfig.formatMetricValue(deptMetrics.prenomFrancaisPct, "prenom_francais_pct") + deptMetrics.yearLabel,
          compare: MetricsConfig.formatMetricValue(countryMetrics.prenomFrancaisPct, "prenom_francais_pct") + countryMetrics.yearLabel,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("wokisme_score"),
          main: MetricsConfig.formatMetricValue(deptData.wokisme_score, "wokisme_score"),
          compare: MetricsConfig.formatMetricValue(countryData.wokisme_score, "wokisme_score"),
        },
        {
          title: MetricsConfig.getMetricLabel("logements_sociaux_pct"),
          main: deptData.logements_sociaux_pct !== null && deptData.logements_sociaux_pct !== undefined
              ? MetricsConfig.formatMetricValue(deptData.logements_sociaux_pct, "logements_sociaux_pct")
              : "N/A",
          compare: countryData.logements_sociaux_pct !== null && countryData.logements_sociaux_pct !== undefined
              ? MetricsConfig.formatMetricValue(countryData.logements_sociaux_pct, "logements_sociaux_pct")
              : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_subventions"),
          main: this.dataStore.departement.subventions ? MetricsConfig.formatMetricValue(this.dataStore.departement.subventions.total_subventions || 0, "total_subventions") : "N/A",
          compare: this.dataStore.country.subventions ? MetricsConfig.formatMetricValue(this.dataStore.country.subventions.total_subventions || 0, "total_subventions") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("subventions_p1"),
          main: this.dataStore.departement.subventions ? MetricsConfig.formatMetricValue(this.dataStore.departement.subventions.subventions_p1 || 0, "subventions_p1") : "N/A",
          compare: this.dataStore.country.subventions ? MetricsConfig.formatMetricValue(this.dataStore.country.subventions.subventions_p1 || 0, "subventions_p1") : "N/A",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("total_qpv"),
          main: deptData.total_qpv !== null && deptData.total_qpv !== undefined
              ? MetricsConfig.formatMetricValue(deptData.total_qpv, "total_qpv")
              : "0",
          compare: "",
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
          main: deptData.pop_in_qpv_pct !== null && deptData.pop_in_qpv_pct !== undefined
              ? MetricsConfig.formatMetricValue(deptData.pop_in_qpv_pct, "pop_in_qpv_pct")
              : "0.0%",
          compare: countryData.pop_in_qpv_pct !== null && countryData.pop_in_qpv_pct !== undefined
              ? MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct, "pop_in_qpv_pct")
              : "0.0%",
          subRow: true,
        },
      ]

      this.tableRows = this.addGroupIds(rows)
    },

    buildCommuneTable() {
      const communeData = this.dataStore.commune.details
      const deptData = this.dataStore.departement.details
      const crimeData = this.dataStore.commune.crime
      const deptNamesData = this.dataStore.departement.names
      const deptCrimeData = this.dataStore.departement.crime

      if (!communeData || !deptData || !crimeData || !deptNamesData || !deptCrimeData) {
        this.tableRows = []
        return
      }

      const cog = this.location.code
      const departement = communeData.departement
      const commune = communeData.commune

      this.mainHeader = `${departement} - ${commune}`
      this.compareHeader = DepartementNames[departement] || departement

      // Commune names data might not be available
      let namesData = null
      try {
        // This would need to be fetched separately if not already in store
        // For now, we'll handle the case where it's not available
      } catch (error) {
        console.log('Commune names data not available')
      }

      const communeMetrics = namesData ? this.calculateCommonMetrics(namesData, crimeData) : null
      const deptMetrics = this.calculateCommonMetrics(deptNamesData, deptCrimeData)
      const crimeRows = this.createCrimeRows(
        communeMetrics, 
        crimeData, 
        `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
        deptMetrics,
        deptCrimeData
      )

      const rows = [
        {
          title: "Population",
          main: communeData.population ? communeData.population.toLocaleString("fr-FR") : "N/A",
          compare: deptData.population ? deptData.population.toLocaleString("fr-FR") : "N/A",
        },
        {
          title: MetricsConfig.getMetricLabel("insecurite_score"),
          main: MetricsConfig.formatMetricValue(communeData.insecurite_score, "insecurite_score"),
          compare: MetricsConfig.formatMetricValue(deptData.insecurite_score, "insecurite_score"),
        },
        ...crimeRows,
        {
          title: MetricsConfig.getMetricLabel("immigration_score"),
          main: MetricsConfig.formatMetricValue(communeData.immigration_score, "immigration_score"),
          compare: MetricsConfig.formatMetricValue(deptData.immigration_score, "immigration_score"),
        },
      ]

      // Add conditional metrics based on availability
      const conditionalRows = [
        {
          metric: "extra_europeen_pct",
          condition: () => communeMetrics && !isNaN(communeMetrics.extraEuropeenPct),
          row: {
            title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
            main: communeMetrics ? MetricsConfig.formatMetricValue(communeMetrics.extraEuropeenPct, "extra_europeen_pct") + communeMetrics.yearLabel : "N/A",
            compare: MetricsConfig.formatMetricValue(deptMetrics.extraEuropeenPct, "extra_europeen_pct") + deptMetrics.yearLabel,
            subRow: true,
          }
        },
        {
          metric: "total_places_centres_migrants",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("total_places_centres_migrants"),
            main: this.dataStore.commune.migrants ? MetricsConfig.formatMetricValue(this.dataStore.commune.migrants.total_places_centres_migrants || 0, "total_places_centres_migrants") : "N/A",
            compare: this.dataStore.departement.migrants ? MetricsConfig.formatMetricValue(this.dataStore.departement.migrants.total_places_centres_migrants || 0, "total_places_centres_migrants") : "N/A",
            subRow: true,
          }
        },
        {
          metric: "places_centres_migrants_p1",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("places_centres_migrants_p1"),
            main: this.dataStore.commune.migrants ? MetricsConfig.formatMetricValue(this.dataStore.commune.migrants.places_centres_migrants_p1 || 0, "places_centres_migrants_p1") : "N/A",
            compare: this.dataStore.departement.migrants ? MetricsConfig.formatMetricValue(this.dataStore.departement.migrants.places_centres_migrants_p1 || 0, "places_centres_migrants_p1") : "N/A",
            subRow: true,
          }
        },
        {
          metric: "islamisation_score",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("islamisation_score"),
            main: MetricsConfig.formatMetricValue(communeData.islamisation_score, "islamisation_score"),
            compare: MetricsConfig.formatMetricValue(deptData.islamisation_score, "islamisation_score"),
          }
        },
        {
          metric: "musulman_pct",
          condition: () => communeMetrics && !isNaN(communeMetrics.musulmanPct),
          row: {
            title: MetricsConfig.getMetricLabel("musulman_pct"),
            main: communeMetrics ? MetricsConfig.formatMetricValue(communeMetrics.musulmanPct, "musulman_pct") + communeMetrics.yearLabel : "N/A",
            compare: MetricsConfig.formatMetricValue(deptMetrics.musulmanPct, "musulman_pct") + deptMetrics.yearLabel,
            subRow: true,
          }
        },
        {
          metric: "number_of_mosques",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("number_of_mosques"),
            main: MetricsConfig.formatMetricValue(communeData.number_of_mosques, "number_of_mosques"),
            compare: MetricsConfig.formatMetricValue(deptData.number_of_mosques, "number_of_mosques"),
            subRow: true,
          }
        },
        {
          metric: "mosque_p100k",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("mosque_p100k"),
            main: MetricsConfig.formatMetricValue(communeData.mosque_p100k, "mosque_p100k"),
            compare: MetricsConfig.formatMetricValue(deptData.mosque_p100k, "mosque_p100k"),
            subRow: true,
          }
        },
        {
          metric: "defrancisation_score",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("defrancisation_score"),
            main: MetricsConfig.formatMetricValue(communeData.defrancisation_score, "defrancisation_score"),
            compare: MetricsConfig.formatMetricValue(deptData.defrancisation_score, "defrancisation_score"),
          }
        },
        {
          metric: "prenom_francais_pct",
          condition: () => communeMetrics && !isNaN(communeMetrics.prenomFrancaisPct),
          row: {
            title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
            main: communeMetrics ? MetricsConfig.formatMetricValue(communeMetrics.prenomFrancaisPct, "prenom_francais_pct") + communeMetrics.yearLabel : "N/A",
            compare: MetricsConfig.formatMetricValue(deptMetrics.prenomFrancaisPct, "prenom_francais_pct") + deptMetrics.yearLabel,
            subRow: true,
          }
        },
        {
          metric: "wokisme_score",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("wokisme_score"),
            main: MetricsConfig.formatMetricValue(communeData.wokisme_score, "wokisme_score"),
            compare: MetricsConfig.formatMetricValue(deptData.wokisme_score, "wokisme_score"),
          }
        },
        {
          metric: "logements_sociaux_pct",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("logements_sociaux_pct"),
            main: communeData.logements_sociaux_pct !== null && communeData.logements_sociaux_pct !== undefined
                ? MetricsConfig.formatMetricValue(communeData.logements_sociaux_pct, "logements_sociaux_pct")
                : "N/A",
            compare: deptData.logements_sociaux_pct !== null && deptData.logements_sociaux_pct !== undefined
                ? MetricsConfig.formatMetricValue(deptData.logements_sociaux_pct, "logements_sociaux_pct")
                : "N/A",
            subRow: true,
          }
        },
        {
          metric: "total_qpv",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("total_qpv"),
            main: communeData.total_qpv !== null && communeData.total_qpv !== undefined
                ? MetricsConfig.formatMetricValue(communeData.total_qpv, "total_qpv")
                : "0",
            compare: deptData.total_qpv !== null && deptData.total_qpv !== undefined
                ? MetricsConfig.formatMetricValue(deptData.total_qpv, "total_qpv")
                : "0",
            subRow: true,
          }
        },
        {
          metric: "pop_in_qpv_pct",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
            main: communeData.pop_in_qpv_pct !== null && communeData.pop_in_qpv_pct !== undefined
                ? MetricsConfig.formatMetricValue(communeData.pop_in_qpv_pct, "pop_in_qpv_pct")
                : "0.0%",
            compare: deptData.pop_in_qpv_pct !== null && deptData.pop_in_qpv_pct !== undefined
                ? MetricsConfig.formatMetricValue(deptData.pop_in_qpv_pct, "pop_in_qpv_pct")
                : "0.0%",
            subRow: true,
          }
        },
        {
          metric: "total_subventions",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("total_subventions"),
            main: this.dataStore.commune.subventions ? MetricsConfig.formatMetricValue(this.dataStore.commune.subventions.total_subventions || 0, "total_subventions") : "N/A",
            compare: this.dataStore.departement.subventions ? MetricsConfig.formatMetricValue(this.dataStore.departement.subventions.total_subventions || 0, "total_subventions") : "N/A",
            subRow: true,
          }
        },
        {
          metric: "subventions_p1",
          condition: () => true,
          row: {
            title: MetricsConfig.getMetricLabel("subventions_p1"),
            main: this.dataStore.commune.subventions ? MetricsConfig.formatMetricValue(this.dataStore.commune.subventions.subventions_p1 || 0, "subventions_p1") : "N/A",
            compare: this.dataStore.departement.subventions ? MetricsConfig.formatMetricValue(this.dataStore.departement.subventions.subventions_p1 || 0, "subventions_p1") : "N/A",
            subRow: true,
          }
        }
      ]

      // Add rows only if metric is available at commune level and condition is met
      conditionalRows.forEach(({ metric, condition, row }) => {
        if (MetricsConfig.isMetricAvailable(metric, "commune") && condition()) {
          rows.push(row)
        }
      })

      this.tableRows = this.addGroupIds(rows)
    },

    calculateCommonMetrics(namesData, crimeData) {
      const extraEuropeenPct = MetricsConfig.calculateMetric("extra_europeen_pct", namesData)
      const musulmanPct = Math.round(namesData.musulman_pct)
      const prenomFrancaisPct = MetricsConfig.calculateMetric("prenom_francais_total", namesData)
      const yearLabel = namesData.annais ? ` (${namesData.annais})` : ""
      const crimeYearLabel = crimeData.annee ? ` (${crimeData.annee})` : ""

      return {
        extraEuropeenPct,
        musulmanPct,
        prenomFrancaisPct,
        yearLabel,
        crimeYearLabel
      }
    },

    createCrimeRows(metrics, crimeData, linkBase, compareMetrics = null, compareCrimeData = null) {
      const rows = []

      // Add labelState to link if not in standard mode
      const linkWithState = MetricsConfig.labelState > 0 ? 
        `${linkBase}${linkBase.includes('?') ? '&' : '?'}labelState=${MetricsConfig.labelState}` : 
        linkBase

      // Only add homicide row if available at current level
      const currentLevel = linkBase.includes('country') ? 'france' : 
                         linkBase.includes('department') ? 'departement' : 'commune'

      if (MetricsConfig.isMetricAvailable("homicides_p100k", currentLevel) && metrics) {
        rows.push({
          title: MetricsConfig.getMetricLabel("homicides_p100k"),
          main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("homicides_total_p100k", crimeData), "homicides_p100k") + metrics.crimeYearLabel,
          compare: compareMetrics ? 
            MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("homicides_total_p100k", compareCrimeData), "homicides_p100k") + compareMetrics.crimeYearLabel : 
            null,
          subRow: true,
        })
      }

      // Add other crime rows
      rows.push(
        {
          title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
          main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("violences_physiques_p1k", crimeData), "violences_physiques_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareMetrics ? 
            MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("violences_physiques_p1k", compareCrimeData), "violences_physiques_p1k") + compareMetrics.crimeYearLabel : 
            null,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
          main: MetricsConfig.formatMetricValue(crimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareCrimeData ? 
            MetricsConfig.formatMetricValue(compareCrimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
            null,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("vols_p1k"),
          main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("vols_p1k", crimeData), "vols_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareMetrics ? 
            MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("vols_p1k", compareCrimeData), "vols_p1k") + compareMetrics.crimeYearLabel : 
            null,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("destructions_p1k"),
          main: MetricsConfig.formatMetricValue(crimeData.destructions_et_degradations_volontaires_p1k, "destructions_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareCrimeData ? 
            MetricsConfig.formatMetricValue(compareCrimeData.destructions_et_degradations_volontaires_p1k, "destructions_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
            null,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
          main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("stupefiants_p1k", crimeData), "stupefiants_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareMetrics ? 
            MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("stupefiants_p1k", compareCrimeData), "stupefiants_p1k") + compareMetrics.crimeYearLabel : 
            null,
          subRow: true,
        },
        {
          title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
          main: MetricsConfig.formatMetricValue(crimeData.escroqueries_p1k, "escroqueries_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
          compare: compareCrimeData ? 
            MetricsConfig.formatMetricValue(compareCrimeData.escroqueries_p1k, "escroqueries_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
            null,
          subRow: true,
        }
      )

      return rows.filter(row => row.compare !== null || compareMetrics === null)
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