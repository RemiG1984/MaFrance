<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-1">
      Graphiques de Criminalité pour: {{ locationName }}
    </v-card-title>
    <v-card-subtitle class="text-caption text-grey pt-0 pb-3">
      <a href="https://www.data.gouv.fr/fr/datasets/bases-statistiques-communale-et-departementale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/" 
         target="_blank" 
         class="text-decoration-none">
        Sources
      </a>
    </v-card-subtitle>
    <v-card-text>
      <v-row>
        <v-col  cols="12" lg="6"
        class="chart-container"
        v-for="chartKey in availableCharts"
        :key="chartKey">
          <Graph
            :metricKey="chartKey"
            :data="aggregatedData[chartKey]"
            :dataLabels="labels"
            :location="location"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import Graph from '../components/Graph.vue'
import { MetricsConfig } from '../utils/metricsConfig.js'
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'

export default {
  name: 'CrimeGraphs',
  components: {
    Graph
  },
  props: {
    location: {
      type: Object,
      required: true
    },
    labels: {
      type: Array,
      // default: null
    },
    data: {
      type: Object,
      // default: null
    }
  },
  data() {
    return {
      levels: ['country', 'departement', 'commune'],
      chartList: [
        'homicides_total_p100k',
        'violences_physiques_p1k',
        'violences_sexuelles_p1k',
        'vols_p1k',
        'destructions_p1k',
        'stupefiants_p1k',
        'escroqueries_p1k'
      ]
    }
  },
  mounted() {
    // console.log('data', this.data)
  },
  computed: {
    ...mapStores(useDataStore),
    
    locationName() {
      if (!this.location) return '';
      
      switch (this.location.type) {
        case 'country':
          return 'France';
        case 'departement':
          return this.location.name || `Département ${this.location.code}`;
        case 'commune':
          return this.location.name || 'Commune';
        default:
          return '';
      }
    },
    
    availableCharts() {
      // Only return charts that have data available
      return this.chartList.filter(chartKey => {
        return this.aggregatedData[chartKey] && 
               Object.keys(this.aggregatedData[chartKey]).length > 0 &&
               Object.values(this.aggregatedData[chartKey]).some(levelData => 
                 levelData && levelData.length > 0
               );
      });
    },
    aggregatedData() {
      const result = {}
      
      // Pour chaque métrique calculée définie dans MetricsConfig
      Object.keys(MetricsConfig.calculatedMetrics).forEach(metricKey => {
        const calculation = MetricsConfig.calculatedMetrics[metricKey]
        result[metricKey] = {}

        for(const level of this.levels) {
          // Vérifier que tous les composants nécessaires sont disponibles
          const inputSeries = calculation.components
            .map(key => this.data[key] && this.data[key][level])
            .filter(serie => serie) // Filtrer les séries undefined/null

          if(inputSeries.length === 0) continue

          const seriesLength = inputSeries[0].length
      
          // Calculer la métrique pour chaque entrée/level en utilisant la formule
          result[metricKey][level] = []

          for (let i = 0; i < seriesLength; i++) {
            // Créer un objet de données pour cette année/période
            const dataPoint = {}
            calculation.components.forEach(key => {
              const serie = this.data[key] && this.data[key][level]
              dataPoint[key] = serie ? (serie[i] || 0) : 0
            })
            
            // Appliquer la formule
            const calculatedValue = calculation.formula(dataPoint)
            result[metricKey][level].push(calculatedValue)
          }
        }
      })
      
      return result
    }
  },
  methods: {

  },
  watch: {
    // Watch for label state changes to update chart data
    'dataStore.labelState': {
      handler() {
        // Force reactivity update when label state changes
        this.$forceUpdate();
      }
    }
  },
  
}
</script>

<style scoped>
.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.chart-container {
  position: relative;
  width: 100%;
}

.chart-canvas {

}
</style> 