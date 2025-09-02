
<template>
  <v-card class="tag-cloud-container pa-3 mb-3" elevation="2">
    <v-card-title class="text-subtitle-1 pb-1 pt-1">Filtrer par étiquette</v-card-title>
    
    <div v-if="loading" class="d-flex justify-center py-2">
      <v-progress-circular indeterminate color="primary" size="24" />
    </div>
    
    <div v-else-if="tags.length === 0" class="text-body-2 text-grey pa-2">
      Aucune étiquette disponible
    </div>
    
    <div v-else class="word-cloud-wrapper">
      <div class="word-cloud">
        <v-chip
          v-for="tagObj in tags"
          :key="tagObj.tag"
          :color="selectedTag === tagObj.tag ? 'primary' : getTagColor(tagObj.count)"
          :variant="selectedTag === tagObj.tag ? 'flat' : 'outlined'"
          :size="getTagSize(tagObj.count)"
          :class="[
            'word-cloud-tag',
            `count-${getCountClass(tagObj.count)}`,
            { 'selected': selectedTag === tagObj.tag }
          ]"
          :style="getTagStyle(tagObj.count)"
          clickable
          @click="toggleTag(tagObj.tag)"
        >
          <span class="tag-text">{{ tagObj.tag }}</span>
          <span class="tag-count">({{ tagObj.count }})</span>
        </v-chip>
      </div>
      
      <div v-if="selectedTag" class="mt-2 d-flex justify-center">
        <v-btn
          variant="outlined"
          color="error"
          size="small"
          @click="clearSelection"
        >
          <v-icon start>mdi-close</v-icon>
          Effacer le filtre
        </v-btn>
      </div>
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
      loading: true,
      maxCount: 0,
      minCount: 0
    };
  },
  async mounted() {
    await this.fetchTags();
  },
  methods: {
    async fetchTags() {
      try {
        this.loading = true;
        const response = await api.getFrancocidesTags();
        this.tags = response.tags || [];
        
        if (this.tags.length > 0) {
          this.maxCount = Math.max(...this.tags.map(t => t.count));
          this.minCount = Math.min(...this.tags.map(t => t.count));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        this.tags = [];
      } finally {
        this.loading = false;
      }
    },

    getTagSize(count) {
      if (this.maxCount === this.minCount) return 'default';
      
      const ratio = (count - this.minCount) / (this.maxCount - this.minCount);
      
      if (ratio >= 0.8) return 'x-large';
      if (ratio >= 0.6) return 'large';
      if (ratio >= 0.4) return 'default';
      if (ratio >= 0.2) return 'small';
      return 'x-small';
    },

    getCountClass(count) {
      if (this.maxCount === this.minCount) return 'medium';
      
      const ratio = (count - this.minCount) / (this.maxCount - this.minCount);
      
      if (ratio >= 0.8) return 'highest';
      if (ratio >= 0.6) return 'high';
      if (ratio >= 0.4) return 'medium';
      if (ratio >= 0.2) return 'low';
      return 'lowest';
    },

    getTagColor(count) {
      if (this.maxCount === this.minCount) return 'blue-grey';
      
      const ratio = (count - this.minCount) / (this.maxCount - this.minCount);
      
      if (ratio >= 0.8) return 'red-darken-2';
      if (ratio >= 0.6) return 'orange-darken-1';
      if (ratio >= 0.4) return 'blue-darken-1';
      if (ratio >= 0.2) return 'green';
      return 'blue-grey-lighten-1';
    },

    getTagStyle(count) {
      if (this.maxCount === this.minCount) return {};
      
      const ratio = (count - this.minCount) / (this.maxCount - this.minCount);
      const opacity = 0.6 + (ratio * 0.4); // Range from 0.6 to 1.0
      const fontWeight = 400 + Math.round(ratio * 300); // Range from 400 to 700
      
      return {
        opacity: opacity,
        fontWeight: fontWeight,
        transform: `scale(${0.85 + ratio * 0.3})` // Range from 0.85 to 1.15
      };
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
.tag-cloud-container {
  background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
  border-radius: 12px;
}

.word-cloud-wrapper {
  position: relative;
}

.word-cloud {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  min-height: 60px;
}

.word-cloud-tag {
  margin: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  white-space: nowrap;
}

.word-cloud-tag:hover {
  transform: translateY(-2px) scale(1.05) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.word-cloud-tag.selected {
  transform: scale(1.1) !important;
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.3);
  z-index: 5;
}

.tag-text {
  font-weight: inherit;
}

.tag-count {
  font-size: 0.75em;
  opacity: 0.8;
  margin-left: 4px;
  font-weight: 400;
}

/* Count-based styling */
.count-highest {
  animation: pulse 2s infinite;
}

.count-high {
  border-width: 2px;
}

.count-medium {
  border-width: 1px;
}

.count-low {
  border-style: dashed;
}

.count-lowest {
  border-style: dotted;
  opacity: 0.7;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .word-cloud {
    gap: 6px;
    padding: 12px;
  }
  
  .word-cloud-tag {
    margin: 2px;
  }
  
  .tag-count {
    display: none;
  }
}

/* Add some visual hierarchy */
.word-cloud::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
  pointer-events: none;
  border-radius: 8px;
}
</style>
