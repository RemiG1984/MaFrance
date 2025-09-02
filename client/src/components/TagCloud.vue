
<template>
  <v-card class="tag-cloud-container pa-4 mb-4" elevation="2">
    <v-card-title class="text-h6 pb-2">Filtrer par étiquette</v-card-title>
    
    <div v-if="loading" class="d-flex justify-center">
      <v-progress-circular indeterminate color="primary" />
    </div>
    
    <div v-else-if="tags.length === 0" class="text-body-2 text-grey">
      Aucune étiquette disponible
    </div>
    
    <div v-else class="tag-cloud">
      <v-chip
        v-for="tag in tags"
        :key="tag"
        :color="selectedTag === tag ? 'primary' : 'default'"
        :variant="selectedTag === tag ? 'flat' : 'outlined'"
        class="ma-1"
        size="small"
        clickable
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </v-chip>
      
      <v-btn
        v-if="selectedTag"
        variant="text"
        color="error"
        size="small"
        class="ml-2"
        @click="clearSelection"
      >
        <v-icon start>mdi-close</v-icon>
        Effacer le filtre
      </v-btn>
    </div>
  </v-card>
</template>

<script>
import api from '../services/api.js';

export default {
  name: 'TagCloud',
  props: {
    selectedTag: {
      type: String,
      default: null
    }
  },
  emits: ['tag-selected', 'tag-cleared'],
  data() {
    return {
      tags: [],
      loading: true
    };
  },
  async mounted() {
    await this.fetchTags();
  },
  methods: {
    async fetchTags() {
      try {
        this.loading = true;
        this.tags = await api.getFrancocidesTags();
      } catch (error) {
        console.error('Error fetching tags:', error);
        this.tags = [];
      } finally {
        this.loading = false;
      }
    },

    toggleTag(tag) {
      if (this.selectedTag === tag) {
        this.clearSelection();
      } else {
        this.$emit('tag-selected', tag);
      }
    },

    clearSelection() {
      this.$emit('tag-cleared');
    }
  }
};
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tag-cloud-container {
  background-color: #fafafa;
}
</style>
