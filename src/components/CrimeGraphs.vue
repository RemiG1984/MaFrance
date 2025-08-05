<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Graphiques de Criminalité
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col  cols="12" lg="6"
        class="chart-container"
        v-for="chartKey in chartList">
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
import { keyMapping } from '../utils/statsCalc.js'

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
        'homicides_p100k',
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
    aggregatedData() {
      const result = {}
      // const level = this.location.type
      
      // Pour chaque nouvelle clé dans le mapping
      Object.keys(keyMapping).forEach(newKey => {
        const sourceKeys = keyMapping[newKey]
        result[newKey] = {}

        for(const level of this.levels) {
          const outputSerie = []
          for(const sourceKey of sourceKeys) {
            // if(!this.data[sourceKey] || !this.data[sourceKey][level]) break

            const inputSeries = sourceKeys
            .map(key => this.data[key] && this.data[key][level])
            .filter(serie => serie) // Filtrer les séries undefined/null

            if(inputSeries.length === 0) break

            const seriesLength = inputSeries[0].length
        
            // Calculer la somme pour chaque entrée/level
            result[newKey][level] = []

            for (let i = 0; i < seriesLength; i++) {
              let sum = 0
              inputSeries.forEach(serie => {
                // Traiter null comme 0
                const value = serie[i] === null || serie[i] === undefined ? 0 : serie[i]
                sum += value
              })
              result[newKey][level].push(sum)
            }
          }
        }
      })
      
      return result
    }
  },
  methods: {

  },
  watch: {
    
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