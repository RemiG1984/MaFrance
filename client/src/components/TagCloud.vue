
<template>
  <v-row class="word-cloud">
    <v-col cols="12">
      <div class="hierarchical-tags-container">
        <!-- Origin Tags Group -->
        <div class="tag-group">
          <h4 class="tag-group-title">Origine</h4>
          <div class="tags-container">
            <v-chip
              v-for="tagObj in originTags"
              :key="tagObj.tag"
              :color="isTagSelected(tagObj.tag) ? 'primary' : 'blue-grey-lighten-3'"
              :variant="isTagSelected(tagObj.tag) ? 'elevated' : 'outlined'"
              size="small"
              class="tag-cloud-chip word-cloud-tag"
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
        </div>

        <!-- Circumstances Tags Group -->
        <div class="tag-group">
          <h4 class="tag-group-title">Circonstances</h4>
          <div class="tags-container">
            <v-chip
              v-for="tagObj in circumstancesTags"
              :key="tagObj.tag"
              :color="isTagSelected(tagObj.tag) ? 'primary' : 'blue-grey-lighten-3'"
              :variant="isTagSelected(tagObj.tag) ? 'elevated' : 'outlined'"
              size="small"
              class="tag-cloud-chip word-cloud-tag"
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
        </div>
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
    originKeywords() {
      return [
        'maghrébin', 'algérien', 'marocain', 'tunisien', 'syrien', 'malgache', 'ultramarin',
        'africain', 'subsaharien', 'sénégalais', 'malien', 'ivoirien', 'rwandais', 'moldave',
        'camerounais', 'congolais', 'guinéen', 'burkinabé', 'mexicain', 'mauricien',
        'turc', 'kurde', 'afghan', 'pakistanais', 'bangladais', 'tchétchène', 'mahorais',
        'roumain', 'bulgare', 'albanais', 'kosovar', 'comorien', 'libanais', 'bosniaque',
        'sri-lankais', 'tamoul', 'chinois', 'vietnamien', 'kazakh', 'haïtien', 'cap-verdien',
        'antillais', 'réunionnais', 'angolais', 'cambodgien', 'serbe', 'tchadien', 'irakien',
      ];
    },
    originTags() {
      return this.tags.filter(tagObj => 
        this.originKeywords.some(keyword => 
          tagObj.tag.toLowerCase().includes(keyword.toLowerCase())
        )
      ).sort((a, b) => b.count - a.count);
    },
    circumstancesTags() {
      return this.tags.filter(tagObj => 
        !this.originKeywords.some(keyword => 
          tagObj.tag.toLowerCase().includes(keyword.toLowerCase())
        )
      ).sort((a, b) => b.count - a.count);
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
    
  },
};
</script>

<style scoped>
.hierarchical-tags-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 8px 8px 0;
}

.tag-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-group-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1976d2;
  margin: 0;
  padding: 4px 0;
  border-bottom: 2px solid #e3f2fd;
}

.word-cloud-tag {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border-width: 2px;
}

.word-cloud-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
}

.tag-cloud-chip {
  flex: 0 0 auto;
  margin: 0 !important;
  max-width: 100%;
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  line-height: 1.3;
  white-space: normal;
}

@media (max-width: 960px) {
  .hierarchical-tags-container {
    gap: 10px;
  }
  
  .tags-container {
    gap: 5px;
  }
  
  .tag-group-title {
    font-size: 1rem;
  }
}

@media (max-width: 600px) {
  .hierarchical-tags-container {
    gap: 8px;
    padding: 6px 6px 6px 0;
  }
  
  .tags-container {
    gap: 4px;
  }
  
  .word-cloud-tag {
    font-size: 0.8rem;
  }
  
  .tag-cloud-chip {
    max-width: 100%;
  }
  
  .tag-group-title {
    font-size: 0.9rem;
  }
}
</style>
