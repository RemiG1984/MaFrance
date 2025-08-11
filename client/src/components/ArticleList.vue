<template>
  <v-card>
    <v-card-title class="text-h5">
      Articles FdS associés à: {{ locationName }}
    </v-card-title>

    <v-card-text>
      <div class="categories-container mb-4">
        <v-chip-group
          v-model="selectedCategory"
          active-class="primary--text"
          column
          mandatory
        >
          <v-chip 
            color="primary"
            variant="flat"
            label
            :value="'tous'"
            @click="selectCategory('tous')"
          >
            Tous ({{ totalFilteredArticles }})
          </v-chip>
          <v-chip 
            color="primary"
            variant="flat"
            label
            v-for="category in categories"
            :key="category"
            :value="category"
            @click="selectCategory(category)"
          >
            {{ articleCategoriesRef[category] }} ({{ articles.counts[category] || 0 }})
          </v-chip>
        </v-chip-group>
      </div>
      <div class="articles-container">
        <div
          class="article"
          v-for="(item, i) in filteredArticles"
          :key="item.url"
        >
          <b> {{ formatDate(item.date) }} </b>
          <span> [{{ item.commune }}] </span>
          <a :href='item.url'> {{ item.title }} </a>
        </div>
        <div v-if="filteredArticles.length === 0" class="no-articles">
          {{ noArticlesMessage }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { articleCategoriesRef } from '../utils/metricsConfig.js'
const categories = Object.keys(articleCategoriesRef)

export default {
  name: 'ArticleList',
  props: {
    location: {
      type: Object,
    },
    articles: {
      type: Object,
      default: () => ({ 
        list: [],
        counts: {
          insecurite: 0,
          immigration: 0,
          islamisme: 0,
          defrancisation: 0,
          wokisme: 0,
          total: 0
        }
      })
    }
  },
  data() {
    return {
      selectedCategory: 'tous', // Default to 'tous' for showing all articles
      categories: categories,
      articleCategoriesRef: articleCategoriesRef
    }
  },
  mounted() {
    // console.log('articleCategoriesRef', articleCategoriesRef)
  },
  computed: {
    locationName() {
      if (!this.location) return '';

      switch (this.location.type) {
        case 'country':
          return 'France';
        case 'departement':
          return this.location.name || `Département ${this.location.code}`;
        case 'commune':
          return this.location.name || 'Commune';
        default:
          return '';
      }
    },

    filteredArticles() {
      // Now articles.list already contains the filtered results from the API
      return this.articles.list
    },

    totalFilteredArticles() {
      return this.articles.list.length
    },

    noArticlesMessage() {
      if (this.location && this.location.type === 'country') {
        return 'Sélectionnez un département ou une commune pour voir les articles'
      }
      return 'Aucun article trouvé.'
    }
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    },

    selectCategory(category) {
      this.selectedCategory = category
      // Fetch articles based on the selected category
      // This assumes your API endpoint can handle a category query parameter
      // Example: fetch(`/api/articles?location=${this.location.code}&category=${category}`)
      // You would then update this.articles with the new list and counts from the API response.
      // For now, we are just updating the selected category.
      // The actual fetching and updating of `this.articles` should be handled by a parent component
      // or a Vuex store that manages the data and makes API calls.
    },

  },
  watch: {
    selectedCategory: {
      handler() {
        // Reset to first category chip when category changes
        // This ensures the UI reflects the current selection
      }
    }
  }
}
</script>

<style scoped>
.articles-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.article a {
  color: #007bff;
}

.article {
  margin-bottom: 12px;
}

.no-articles {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

.categories-container {
  margin-bottom: 16px;
}
</style>