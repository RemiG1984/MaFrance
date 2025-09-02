<template>
  <v-row class="word-cloud">
    <v-col cols="12">
      <div class="tags-container">
        <v-chip
          v-for="tagObj in tags"
          :key="tagObj.tag"
          :color="isTagSelected(tagObj.tag) ? 'primary' : 'blue-grey-lighten-3'"
          :variant="isTagSelected(tagObj.tag) ? 'elevated' : 'outlined'"
          :size="getChipSize(tagObj.count)"
          class="ma-1 word-cloud-tag"
          clickable
          :aria-selected="isTagSelected(tagObj.tag)"
          role="button"
          @click="toggleTag(tagObj.tag)"
          @keydown.enter="toggleTag(tagObj.tag)"
          @keydown.space.prevent="toggleTag(tagObj.tag)"
        >
          {{ tagObj.tag }}
          <span v-if="$vuetify.display.mdAndUp" class="tag-count ml-1">({{ tagObj.count }})</span>
        </v-chip>
        <v-chip
          v-if="dataStore.memorials.selectedTags.length > 0"
          color="red-lighten-1"
          size="small"
          variant="elevated"
          class="ma-1 clear-filter"
          clickable
          role="button"
          aria-label="Effacer tous les filtres"
          @click="clearSelection"
          @keydown.enter="clearSelection"
          @keydown.space.prevent="clearSelection"
        >
          Effacer tous les filtres ({{ dataStore.memorials.selectedTags.length }})
        </v-chip>
      </div>
      <v-alert v-if="!loading && !tags.length" type="info" icon="mdi-information" class="mt-2">
        Aucun tag disponible.
      </v-alert>
    </v-col>
  </v-row>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';

export default {
  name: 'TagCloud',
  computed: {
    ...mapStores(useDataStore),
    tags() {
      return this.dataStore.memorials.tags;
    },
    loading() {
      return this.dataStore.memorials.loading;
    },
  },
  async mounted() {
    await this.dataStore.fetchTags();
  },
  methods: {
    toggleTag(tag) {
      this.dataStore.toggleSelectedTag(tag);
    },
    clearSelection() {
      this.dataStore.clearSelectedTags();
    },
    isTagSelected(tag) {
      return this.dataStore.memorials.selectedTags.includes(tag);
    },
    getChipSize(count) {
      if (count > 50) return 'large';
      if (count > 20) return 'medium';
      if (count > 5) return 'small';
      return 'x-small';
    },
  },
};
</script>

<style scoped>
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.word-cloud-tag {
  transition: all 0.3s ease-in-out;
  border-width: 2px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  background: linear-gradient(145deg, #ffffff, #f0f4f8);
}

.word-cloud-tag[aria-selected="true"] {
  background: linear-gradient(145deg, #1976D2, #1565C0);
  color: white;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
  transform: translateY(-1px);
}

.word-cloud-tag:hover {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.25);
  background: linear-gradient(145deg, #f8f9fa, #e9ecef);
}

.word-cloud-tag[aria-selected="true"]:hover {
  background: linear-gradient(145deg, #1565C0, #0d47a1);
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.5);
}

.clear-filter {
  font-weight: bold;
  animation: pulse 2s infinite;
  background: linear-gradient(145deg, #f44336, #d32f2f);
  color: white;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
}

.clear-filter:hover {
  background: linear-gradient(145deg, #d32f2f, #b71c1c);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.5);
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}

@media (max-width: 600px) {
  .tags-container {
    gap: 8px;
  }
  .word-cloud-tag {
    font-size: 0.8rem;
  }
}
</style>