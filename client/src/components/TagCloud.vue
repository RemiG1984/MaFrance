<template>
  <v-row class="word-cloud">
    <v-col cols="12">
      <div class="tags-container">
        <v-chip
          v-for="tagObj in tags"
          :key="tagObj.tag"
          :color="dataStore.memorials.selectedTag === tagObj.tag ? 'primary' : 'grey'"
          :size="getChipSize(tagObj.count)"
          variant="outlined"
          class="ma-1 word-cloud-tag"
          clickable
          :aria-selected="dataStore.memorials.selectedTag === tagObj.tag"
          role="button"
          @click="toggleTag(tagObj.tag)"
          @keydown.enter="toggleTag(tagObj.tag)"
          @keydown.space.prevent="toggleTag(tagObj.tag)"
        >
          {{ tagObj.tag }}
          <span v-if="$vuetify.display.mdAndUp" class="tag-count ml-1">({{ tagObj.count }})</span>
        </v-chip>
        <v-chip
          v-if="dataStore.memorials.selectedTag"
          color="grey"
          size="small"
          variant="outlined"
          class="ma-1 clear-filter"
          clickable
          role="button"
          aria-label="Effacer le filtre de tag"
          @click="clearSelection"
          @keydown.enter="clearSelection"
          @keydown.space.prevent="clearSelection"
        >
          Effacer le filtre
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
      const newTag = this.dataStore.memorials.selectedTag === tag ? null : tag;
      this.dataStore.setSelectedTag(newTag);
      this.$emit('tag-selected', newTag);
    },
    clearSelection() {
      this.dataStore.setSelectedTag(null);
      this.$emit('tag-cleared');
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
  gap: 8px;
  justify-content: center;
}

.word-cloud-tag {
  transition: transform 0.2s ease-in-out;
}

.word-cloud-tag:hover {
  transform: scale(1.1);
}

.clear-filter {
  font-weight: bold;
}

@media (max-width: 600px) {
  .tags-container {
    gap: 4px;
  }
  .word-cloud-tag {
    font-size: 0.8rem;
  }
}
</style>