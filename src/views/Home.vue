<template>
  <div class="home">
    <v-row>
      <!-- First Column: Location selectors, map, and data -->
      <v-col cols="12" lg="6">
        <v-row>
          <!-- Location Selector -->
          <v-col cols="12">
            <LocationSelector 
              :location="currentLocation"
            />
          </v-col>

          <!-- Map -->
          <v-col cols="12">
            <MapComponent 
              :location="currentLocation"
            />
          </v-col>

          <!-- Articles -->
          <v-col cols="12">
            <ArticleList 
              :location="currentLocation"
              :articles="articles"
            />
          </v-col>

          <!-- Names Graph -->
          <v-col cols="12">
            <NamesGraph 
              v-if='namesData && currentLocation'
              :data="namesData"
              :location="currentLocation"
            />
          </v-col>

          <!-- QPV Data -->
          <v-col cols="12">
            <QpvData 
              :location="currentLocation"
              :data="qpvData"
            />
          </v-col>

          <!-- Executive Details -->
          <v-col cols="12">
            <ExecutiveDetails 
              :location="currentLocation"
            />
          </v-col>
        </v-row>
      </v-col>

      <!-- Second Column: Score table and crime graphs -->
      <v-col cols="12" lg="6">
        <v-row>
          <!-- Score Table -->
          <v-col cols="12">
            <ScoreTable 
              :location="currentLocation"
              :scores="scores"
            />
          </v-col>

          <v-col cols="12">
            <CrimeGraphs 
              v-if="currentLocation"
              :location="currentLocation"
              :data="crimeSeries.data"
              :labels="crimeSeries.labels"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
// FIXME: we shoulnd have to dedupe data client side
import { dedupeArrByKey, arrGetLast } from '../utils/gen.js'

import LocationSelector from '../components/LocationSelector.vue'
import MapComponent from '../components/MapComponent.vue'
import ArticleList from '../components/ArticleList.vue'
import NamesGraph from '../components/NamesGraph.vue'
import QpvData from '../components/QpvData.vue'
import ExecutiveDetails from '../components/ExecutiveDetails.vue'
import ScoreTable from '../components/ScoreTable.vue'
import CrimeGraphs from '../components/CrimeGraphs.vue'
import Graph from '../components/Graph.vue'

export default {
  name: 'Home',
  components: {
    LocationSelector,
    MapComponent,
    ArticleList,
    NamesGraph,
    QpvData,
    ExecutiveDetails,
    ScoreTable,
    CrimeGraphs,
    Graph,
  },
  computed: {
    ...mapStores(useDataStore),
    currentLocation(){
      let location = {
        name: '',
        code: null,
        type: '',
      }

      switch(this.dataStore.currentLevel){
        case 'country': 
          location = {
            name: 'France',
            code: null,
            type: this.dataStore.currentLevel,
          }
        break
        case 'departement':
          location = {
            name: this.dataStore.levels.departement,
            code: this.dataStore.getDepartementCode(),
            type: this.dataStore.currentLevel,
          }
        break
        case 'commune':
          location = {
            name: this.dataStore.levels.commune,
            code: this.dataStore.getCommuneCode(),
            type: this.dataStore.currentLevel,
          }
        break  
      }

      return location
    },

    namesData(){
      const level = this.dataStore.currentLevel
      if(level === 'commune') return null

      return this.dataStore[level]?.namesSeries
    },

    crimeSeries(){ // retourne les données des stats groupées par clef/niveaux pour les graphs
      const result = {}
      
      let allYears = null

      for (const level of this.levels) {
        const years = this.dataStore[level]?.crimeSeries?.labels || []
        if (allYears === null){
          allYears = new Set(years)
        }
        else {
          allYears = new Set([...allYears, ...years])
        }

        if (level === this.dataStore.currentLevel) break
      }

      const labels = Array.from(allYears).sort()
      // console.log('labels', labels)

      for (const level of this.levels) {
        const data = this.dataStore[level]?.crimeSeries?.data || {}

        for(let k in data) {
          if(!result.hasOwnProperty(k)) result[k] = {}
          result[k][level] = data[k]
        }
        
        if (level === this.dataStore.currentLevel) break
      }

      return {
        labels,
        data: result
      }
    },

    articles(){
      const level = this.dataStore.currentLevel
      const articles = this.dataStore[level]?.articles || []
      const articlesCounts = this.dataStore[level]?.articlesCounts || {}

      return {
        list: dedupeArrByKey(articles, 'url'),
        // list: articles,
        counts: articlesCounts,
      }
    },

    qpvData(){
      switch(this.dataStore.currentLevel){
        case 'departement':
          return dedupeArrByKey(this.dataStore.departement.qpv, 'codeQPV')
        break
        case 'commune':
          return dedupeArrByKey(this.dataStore.commune.qpv, 'codeQPV')
        break  
      }

      return []
    },

    scores(){
      switch(this.dataStore.currentLevel){
        case 'country':
          return []
        case 'departement':
          return [{
            label: this.dataStore.getDepartementCode()+' - '+this.dataStore.levels.departement,
            data: this.dataStore?.departement?.details,
          },{
            label: "France",
            data: this.dataStore?.country?.details,
          }]
        break
        case 'commune':
          return [{
            label: this.dataStore.getDepartementCode()+' - '+this.dataStore.levels.commune,
            data: this.dataStore?.commune?.details
          },{
            label: this.dataStore.levels.departement,
            data: this.dataStore?.departement?.details,
          }]
        break  
      }

      return []
    },

  },
  data() {
    return {
      levels: ['country', 'departement', 'commune'],
      crimeData: null
    }
  },
  mounted() {
    
    this.dataStore.setCountry()

  },
  methods: {
    getCountryScores(){

      // arrGetLast
      return {
        label: "Fance",
        data: this.dataStore?.country?.details,
      }
    },
    getDepartmentScores(){

    },
    getCommuneScores(){

    },

    getComposites(level){

      const result = {}
      const data = this.dataStore.country.crimeAggreg

      for(let k in data) {

      }
    },

  },
}
</script>

<style scoped>
.home {
  min-height: 100vh;
}
</style> 