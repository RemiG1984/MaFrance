
<template>
  <v-container fluid class="pa-6 memorial-page">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-1">Mémorial des victimes de francocides</h1>

        <!-- Tag Cloud Filter -->
        <TagCloud 
          :selected-tag="selectedTag"
          @tag-selected="onTagSelected"
          @tag-cleared="onTagCleared"
        />

        <!-- Sorting Controls -->
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Trier par"
          variant="outlined"
          class="mb-1"
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
import MemorialGrid from '../components/MemorialGrid.vue';
import TagCloud from '../components/TagCloud.vue';
import api from '../services/api.js';

export default {
  name: 'Memorial',
  components: { MemorialGrid, TagCloud },
  data() {
    return {
      loading: true,
      francocides: [],
      selectedTag: null,
      sortBy: 'year_desc',
      sortOptions: [
        { value: 'year_desc', title: 'Année (récent en premier)' },
        { value: 'year_asc', title: 'Année (ancien en premier)' },
        { value: 'location_asc', title: 'Localisation (A-Z)' },
      ],
    };
  },
  computed: {
    sortedVictims() {
      if (!this.francocides.length) return [];

      let sorted = [...this.francocides];
      switch (this.sortBy) {
        case 'year_desc':
          return sorted.sort((a, b) => new Date(b.date_deces) - new Date(a.date_deces));
        case 'year_asc':
          return sorted.sort((a, b) => new Date(a.date_deces) - new Date(b.date_deces));
        case 'location_asc':
          return sorted.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
        default:
          return sorted;
      }
    },
  },
  async mounted() {
    await this.fetchFrancocides();
  },
  watch: {
    selectedTag() {
      this.fetchFrancocides();
    }
  },
  methods: {
    async fetchFrancocides() {
      try {
        this.loading = true;
        const params = {};
        if (this.selectedTag) {
          params.tag = this.selectedTag;
        }
        const data = await api.getFrancocides(params);
        this.francocides = data.list || [];
      } catch (error) {
        console.error('Error fetching francocides:', error);
        this.francocides = [];
      } finally {
        this.loading = false;
      }
    },

    onTagSelected(tag) {
      this.selectedTag = tag;
    },

    onTagCleared() {
      this.selectedTag = null;
    }
  },
};
</script>

<style scoped>
.memorial-page {
  background-color: #f5f5f5;
}
</style>
