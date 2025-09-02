<template>
  <v-container fluid class="pa-6 memorial-page">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-4">Mémorial des Victimes</h1>
        <p class="text-body-1 mb-6">
          Un hommage aux victimes de francocides. Tri par année ou localisation.
        </p>

        <!-- Sorting Controls -->
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Trier par"
          variant="outlined"
          class="mb-4"
          style="max-width: 300px;"
        ></v-select>
      </v-col>
    </v-row>

    <!-- Memorial Grid Component -->
    <MemorialGrid 
      :victims="sortedVictims"
      :loading="loading"
    />
  </v-container>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';
import MemorialGrid from '../components/MemorialGrid.vue';  // Sub-component

export default {
  name: 'Memorial',
  components: { MemorialGrid },
  computed: {
    ...mapStores(useDataStore),
    sortedVictims() {
      if (!this.dataStore.francocides) return [];

      let sorted = [...this.dataStore.francocides];
      switch (this.sortBy) {
        case 'year_desc':
          return sorted.sort((a, b) => b.year - a.year);
        case 'year_asc':
          return sorted.sort((a, b) => a.year - b.year);
        case 'location_asc':
          return sorted.sort((a, b) => a.location.localeCompare(b.location));
        default:
          return sorted;  // Default: recent first
      }
    },
  },
  data() {
    return {
      loading: true,
      sortBy: 'year_desc',  // Default sort
      sortOptions: [
        { value: 'year_desc', title: 'Année (récent en premier)' },
        { value: 'year_asc', title: 'Année (ancien en premier)' },
        { value: 'location_asc', title: 'Localisation (A-Z)' },
      ],
    };
  },
  async mounted() {
    if (!this.dataStore.francocides.length) {
      await this.dataStore.fetchFrancocides();
    }
    this.loading = false;
  },
};
</script>

<style scoped>
.memorial-page {
  background-color: #f5f5f5;  /* Light gray for somber feel */
}
.memorial-card img {
  filter: grayscale(50%);  /* Optional: desaturate images for memorial tone */
}
</style>