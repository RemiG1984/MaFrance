<template>
  <v-container fluid class="pa-4 pa-md-6 memorial-page">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-2 mb-md-3">Mémorial des victimes de francocides</h1>

        <!-- Map and Filters Layout -->
        <v-row class="mb-4 map-filter-row">
          <!-- Map on the left -->
          <v-col cols="12" md="4" class="map-column">
            <FrancocidesMap />
          </v-col>
          
          <!-- Filters on the right -->
          <v-col cols="12" md="8" class="filter-column">
            <v-card class="filter-card h-100 d-flex flex-column">
              <v-card-title class="text-h6 pb-2">Filtres et recherche</v-card-title>
              <v-card-text class="pb-0 flex-grow-1 d-flex flex-column">
                <!-- Search and Sort Controls side by side -->
                <v-row class="mb-3">
                  <v-col cols="12" sm="6" class="pb-0">
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
                  <v-col cols="12" sm="6" class="pb-0">
                    <v-select
                      v-model="dataStore.memorials.sortBy"
                      :items="sortOptions"
                      label="Trier par"
                      variant="outlined"
                      density="compact"
                    ></v-select>
                  </v-col>
                </v-row>
                
                <!-- Tag Cloud Filter -->
                <div class="flex-grow-1 d-flex flex-column">
                  <div class="tag-cloud-container flex-grow-1">
                    <TagCloud />
                  </div>
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
  align-items: stretch;
}

.filter-card {
  height: 100%;
}

.tag-cloud-container {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 250px;
  max-height: 400px;
}

@media (min-width: 960px) {
  .map-column,
  .filter-column {
    display: flex;
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
  .v-text-field {
    font-size: 0.9rem;
  }
}
</style>