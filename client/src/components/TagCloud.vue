<template>
  <v-row class="word-cloud">
    <v-col cols="12">
      <div class="tags-container text-center">
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
      const allTags = this.dataStore.memorials.tags;
      const selectedTags = this.dataStore.memorials.selectedTags;
      
      // If no tags are selected, show all tags
      if (selectedTags.length === 0) {
        return allTags;
      }
      
      // Get all victims that have ALL the currently selected tags
      const victimsWithSelectedTags = this.dataStore.memorials.victims.filter(victim => {
        if (!victim.tags) return false;
        const victimTags = victim.tags.split(',').map(tag => tag.trim());
        return selectedTags.every(selectedTag => victimTags.includes(selectedTag));
      });
      
      // Count occurrences of each tag among these filtered victims
      const combinableTagCounts = new Map();
      
      victimsWithSelectedTags.forEach(victim => {
        if (victim.tags) {
          const victimTags = victim.tags.split(',').map(tag => tag.trim());
          victimTags.forEach(tag => {
            if (tag) {
              combinableTagCounts.set(tag, (combinableTagCounts.get(tag) || 0) + 1);
            }
          });
        }
      });
      
      // Convert to array format and sort by count (descending)
      const combinableTags = Array.from(combinableTagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      
      return combinableTags;
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
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.word-cloud-tag {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border-width: 2px;
}

.word-cloud-tag:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
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