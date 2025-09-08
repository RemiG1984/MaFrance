<template>
  <v-container fluid class="pa-4 pa-md-6 memorial-page">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-2 mb-md-3">Mémorial des victimes de francocides</h1>

        <!-- Map and Filters Layout -->
        <v-row class="mb-4 map-filter-row" no-gutters>
          <!-- Map section -->
          <v-col cols="12" lg="5" class="map-column pa-2">
            <v-card class="h-100 d-flex flex-column">
              <v-card-text class="pa-0 flex-grow-1">
                <FrancocidesMap />
              </v-card-text>
            </v-card>
          </v-col>
          
          <!-- Filters section -->
          <v-col cols="12" lg="7" class="filter-column pa-2">
            <v-card class="h-100 d-flex flex-column">
              <v-card-title class="pb-2">
                <v-icon class="mr-2">mdi-filter-variant</v-icon>
                Filtres
              </v-card-title>
              <v-card-text class="flex-grow-1 d-flex flex-column">
                <!-- Search and Sort Controls -->
                <v-row class="mb-3">
                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="searchQuery"
                      label="Rechercher par nom ou lieu"
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      clearable
                      aria-label="Rechercher des victimes par nom ou lieu"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-select
                      v-model="dataStore.memorials.sortBy"
                      :items="sortOptions"
                      label="Trier par"
                      variant="outlined"
                      density="compact"
                    ></v-select>
                  </v-col>
                </v-row>
                
                <!-- Tag Cloud Container -->
                <div class="tag-cloud-container flex-grow-1">
                  <TagCloud />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Memorial Grid Component -->
        <v-row v-if="!dataStore.memorials.loading && filteredVictims.length" class="transition-group">
          <v-col cols="12">
            <MemorialGrid 
              :victims="filteredVictims"
              :loading="dataStore.memorials.loading"
            />
          </v-col>
        </v-row>

        <!-- Loading State -->
        <v-row v-if="dataStore.memorials.loading" class="mt-4">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate color="primary" />
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-row v-if="!dataStore.memorials.loading && !filteredVictims.length" class="mt-4">
          <v-col cols="12">
            <v-alert type="info" icon="mdi-information">
              Aucune donnée disponible pour les critères sélectionnés.
            </v-alert>
          </v-col>
        </v-row>

        
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import MemorialGrid from '../components/MemorialGrid.vue';
import TagCloud from '../components/TagCloud.vue';
import FrancocidesMap from '../components/FrancocidesMap.vue';
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';

export default {
  name: 'Memorial',
  components: { MemorialGrid, TagCloud, FrancocidesMap },
  data() {
    return {
      searchQuery: '',
      sortOptions: [
        { value: 'year_desc', title: 'Année (récent en premier)' },
        { value: 'year_asc', title: 'Année (ancien en premier)' },
        { value: 'age_asc', title: 'Âge (jeune en premier)' },
        { value: 'age_desc', title: 'Âge (âgé en premier)' },
      ],
    };
  },
  computed: {
    ...mapStores(useDataStore),
    filteredVictims() {
      return this.dataStore.filteredVictims(this.searchQuery);
    },
  },
  async mounted() {
    await Promise.all([
      this.dataStore.fetchVictims(),
      this.dataStore.fetchTags(),
    ]);
  },
};
</script>

<style scoped>
.memorial-page {
  min-height: 100vh;
  background-color: #fafafa;
}

.memorial-container {
  max-width: 1600px !important;
  width: 100% !important;
  margin: 0 auto;
}

@media (min-width: 1904px) {
  .memorial-container {
    max-width: 1800px !important;
  }
}

.transition-group {
  transition: all 0.3s ease-in-out;
}

.map-filter-row {
  min-height: 500px;
}

.map-column,
.filter-column {
  display: flex;
  flex-direction: column;
}

.tag-cloud-container {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 200px;
  max-height: 320px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  background-color: #fff;
}

/* Responsive adjustments */
@media (max-width: 1264px) {
  .map-filter-row {
    min-height: auto;
  }
  
  .tag-cloud-container {
    max-height: 250px;
  }
}

@media (max-width: 960px) {
  .map-filter-row {
    flex-direction: column;
  }
  
  .tag-cloud-container {
    min-height: 180px;
    max-height: 220px;
  }
}

@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
  
  .v-text-field {
    font-size: 0.9rem;
  }
  
  .tag-cloud-container {
    min-height: 150px;
    max-height: 180px;
  }
  
  .memorial-page {
    padding: 12px !important;
  }
}
</style>