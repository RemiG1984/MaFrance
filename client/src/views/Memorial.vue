<template>
  <v-container fluid class="pa-4 pa-md-6 memorial-page">
    <v-row justify="center">
      <v-col cols="12" sm="12" md="12" lg="12" xl="12" class="memorial-container">
        <h1 class="text-h4 font-weight-bold mb-2 mb-md-3">Mémorial des victimes de francocides</h1>

        <!-- Search Bar and Sort Controls Row -->
        <v-row class="mb-4">
          <v-col cols="12" md="8" lg="9">
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
          <v-col cols="12" md="4" lg="3">
            <v-select
              v-model="dataStore.memorials.sortBy"
              :items="sortOptions"
              label="Trier par"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Tag Cloud Filter - Full Width -->
        <v-row class="mb-2">
          <v-col cols="12">
            <TagCloud />
          </v-col>
        </v-row>

        <!-- Memorial Grid Component -->
        <v-row v-if="!dataStore.memorials.loading && filteredVictims.length" class="transition-group">
          <v-col>
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

        <!-- Load More Button -->
        <v-row v-if="dataStore.memorials.pagination.hasMore && !dataStore.memorials.loading && filteredVictims.length" class="mt-4">
          <v-col cols="12" class="text-center">
            <v-btn
              :loading="dataStore.memorials.loading"
              variant="outlined"
              color="primary"
              @click="dataStore.loadMoreVictims"
              aria-label="Charger plus de victimes"
            >
              Charger plus
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import MemorialGrid from '../components/MemorialGrid.vue';
import TagCloud from '../components/TagCloud.vue';
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';

export default {
  name: 'Memorial',
  components: { MemorialGrid, TagCloud },
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
.memorial-container {
  max-width: none !important;
  width: 100% !important;
}

.transition-group {
  transition: all 0.3s ease-in-out;
}

/* Ensure TagCloud doesn't affect container width */
.tags-container {
  overflow-x: auto;
  width: 100%;
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