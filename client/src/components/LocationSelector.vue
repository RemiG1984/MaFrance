<template>
  <v-card>
    <v-card-title class="text-h6">
      Sélection du niveau de visualisation
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" sm="3">
          <v-btn
            @click="selectFrance"
            :color="location.type === 'country' ? 'primary' : 'grey'"
            variant="elevated"
            block
          >
            France
          </v-btn>
        </v-col>
        
        <v-col cols="12" sm="4">
          <v-select
            v-model="selectedDepartement"
            @update:model-value="onDepartementChange"
            :items="sortedDepartements"
            item-title="name"
            item-value="code"
            label="Choisir un département"
            variant="outlined"
            clearable
            density="compact"
            hide-details
          ></v-select>
        </v-col>
        
        <v-col cols="12" sm="5">
          <v-autocomplete
            v-model="selectedCommune"
            @update:model-value="onCommuneSelect"
            @input="onCommuneInput"
            :items="communeSuggestions"
            item-title="displayName"
            item-value="COG"
            label="Rechercher une commune"
            variant="outlined"
            clearable
            :loading="loading"
            v-model:search="communeQuery"
            return-object
            density="compact"
            hide-details
          ></v-autocomplete>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { DepartementNames } from '../utils/departementNames.js'
// import api from '../services/api.js'


export default {
  name: 'LocationSelector',
  props: {
    location: {
      type: Object,
      // required: true
    }
  },
  data() {
    return {
      selectedDepartement: '',
      selectedCommune: null,
      communeQuery: '',
      communeSuggestions: [],
      communesData: [],
      departementNames: DepartementNames,
      loading: false
    }
  },
  computed: {
    ...mapStores(useDataStore),
    sortedDepartements() {
      return Object.entries(this.departementNames)
        .sort(([a], [b]) => {
          const parseCode = (code) => {
            if (code === '2A') return 20.1
            if (code === '2B') return 20.2
            return parseInt(code, 10)
          }
          return parseCode(a) - parseCode(b)
        })
        .map(([code, name]) => ({
          code,
          name: `${code} - ${name}`
        }))
    }
  },
  mounted() {
    // console.log("dataStore", this.dataStore)
  },
  methods: {
    selectFrance() {
      this.selectedDepartement = ''
      this.selectedCommune = null
      this.communeQuery = ''
      this.communeSuggestions = []
      this.dataStore.setCountry()
    },
    
    onDepartementChange() {
      if (this.selectedDepartement) {
        this.selectedCommune = null
        this.communeQuery = ''
        this.communeSuggestions = []

        // this.dataStore.currentLevel = 'departement'
        // this.dataStore.getAllDepartementData(this.selectedDepartement)
        this.dataStore.setDepartement(this.selectedDepartement)

      }
    },
    
    onCommuneSelect(commune) {
      if (!commune) return

      const cog = commune.COG
      const departement = commune.departement

      // console.log('onCommuneSelect', commune, cog, departement)

      this.dataStore.setCommune(cog, commune.commune, departement)
    },
    
    async onCommuneInput() {
      if (this.communeQuery.length < 3) {
        this.communeSuggestions = []
        return
      }
      
      this.loading = true
      try {
        // console.log('communeQuery', this.communeQuery)
        const communes = await this.dataStore.searchCommunes(this.communeQuery)
        
        this.communeSuggestions = communes.map(commune => ({
          displayName: `${commune.commune} (${commune.departement})`,
          commune: commune.commune,
          COG: commune.COG,
          departement: commune.departement
        }))
        
        this.communesData = this.communeSuggestions
      } catch (error) {
        console.error('Erreur recherche communes:', error)
        this.communeSuggestions = []
      } finally {
        this.loading = false
      }
    },
  },
  
}
</script>

<style scoped>
/* Styles pour les suggestions de communes */
.commune-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 15rem;
  overflow-y: auto;
}
</style> 