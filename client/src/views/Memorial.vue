<template>
  <v-container fluid class="pa-4 pa-md-6 memorial-page">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-2 mb-md-3">Mémorial des victimes de francocides</h1>

        <!-- Map and Filters Layout -->
        <v-row class="mb-4">
          <!-- Map on the left -->
          <v-col cols="12" md="7" lg="8">
            <h3 class="text-h6 mb-2">Répartition géographique des francocides</h3>
            <FrancocidesMap />
          </v-col>
          
          <!-- Filters on the right -->
          <v-col cols="12" md="5" lg="4">
            <v-card>
              <v-card-title class="text-h6 pb-2">Filtres et recherche</v-card-title>
              <v-card-text class="pb-0">
                <!-- Search Bar -->
                <v-text-field
                  v-model="searchQuery"
                  label="Rechercher par nom ou lieu"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  clearable
                  aria-label="Rechercher des victimes par nom ou lieu"
                  class="mb-3"
                ></v-text-field>
                
                <!-- Sort Controls -->
                <v-select
                  v-model="dataStore.memorials.sortBy"
                  :items="sortOptions"
                  label="Trier par"
                  variant="outlined"
                  density="compact"
                  class="mb-3"
                ></v-select>
                
                <!-- Tag Cloud Filter -->
                <div>
                  <h4 class="text-subtitle-1 mb-2">Tags</h4>
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

@media (max-width: 600px) {
  .text-h4 {
    font-size: 1.5rem !important;
  }
  .v-text-field {
    font-size: 0.9rem;
  }
}
</style>