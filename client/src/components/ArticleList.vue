
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
            :loading="loading && selectedCategory === 'tous'"
          >
            Tous ({{ selectedCategory === 'tous' ? currentTotal : articles.counts.total || 0 }})
          </v-chip>
          <v-chip 
            color="primary"
            variant="flat"
            label
            v-for="category in categories"
            :key="category"
            :value="category"
            @click="selectCategory(category)"
            :loading="loading && selectedCategory === category"
          >
            {{ articleCategoriesRef[category] }} ({{ selectedCategory === category ? currentTotal : (articles.counts[category] || 0) }})
          </v-chip>
        </v-chip-group>
      </div>
      <div class="articles-container" @scroll="handleScroll" ref="articlesContainer">
        <div
          class="article"
          v-for="(item, i) in displayedArticles"
          :key="item.url"
        >
          <b> {{ formatDate(item.date) }} </b>
          <span> [{{ item.commune }}] </span>
          <a :href='item.url'> {{ item.title }} </a>
        </div>
        <div v-if="loading" class="loading-indicator">
          <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
          Chargement...
        </div>
        <div v-if="displayedArticles.length === 0 && !loading" class="no-articles">
          {{ noArticlesMessage }}
        </div>
        <div v-if="!hasMore && displayedArticles.length > 0" class="end-indicator">
          Tous les articles ont été chargés
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { articleCategoriesRef } from '../utils/metricsConfig.js'
import api from '../services/api.js'

const categories = Object.keys(articleCategoriesRef)

export default {
  name: 'ArticleList',
  props: {
    location: {
      type: Object,
    },
    articles: {
      type: Object,
      default: () => { 
        const counts = {};
        categories.forEach(str => counts[str] = 0);
        return {
          list: [],
          counts: counts,
        }
      }
    }
  },
  data() {
    return {
      selectedCategory: 'tous',
      categories: categories,
      articleCategoriesRef: articleCategoriesRef,
      displayedArticles: [],
      loading: false,
      hasMore: true,
      currentOffset: 0,
      currentTotal: 0,
      pageSize: 50
    }
  },
  mounted() {
    this.initializeArticles()
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
    
    async selectCategory(category) {
      if (this.selectedCategory === category) return
      
      this.selectedCategory = category
      this.displayedArticles = []
      this.currentOffset = 0
      this.hasMore = true
      
      await this.loadArticles(true)
    },
    
    async loadArticles(reset = false) {
      if (this.loading || (!this.hasMore && !reset)) return
      
      this.loading = true
      
      try {
        const params = {
          limit: this.pageSize,
          offset: reset ? 0 : this.currentOffset,
          category: this.selectedCategory
        }
        
        // Add location-specific parameters
        if (this.location) {
          if (this.location.type === 'departement') {
            params.dept = this.location.code
          } else if (this.location.type === 'commune') {
            params.cog = this.location.code
            params.dept = this.location.departement
          }
        }
        
        const response = await api.getArticles(params)
        
        if (reset) {
          this.displayedArticles = response.articles
          this.currentOffset = response.pagination.limit
        } else {
          this.displayedArticles.push(...response.articles)
          this.currentOffset += response.pagination.limit
        }
        
        this.currentTotal = response.pagination.total
        this.hasMore = response.pagination.hasMore
        
      } catch (error) {
        console.error('Failed to load articles:', error)
      } finally {
        this.loading = false
      }
    },
    
    initializeArticles() {
      // Initialize with existing articles if available
      if (this.articles.list && this.articles.list.length > 0) {
        this.displayedArticles = [...this.articles.list]
        this.currentTotal = this.articles.list.length
      }
    },
    
    handleScroll(event) {
      const { scrollTop, scrollHeight, clientHeight } = event.target
      
      // Load more when user scrolls near the bottom
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        this.loadArticles()
      }
    }
  },
  watch: {
    location: {
      handler() {
        this.initializeArticles()
      },
      immediate: true
    },
    
    articles: {
      handler() {
        if (this.selectedCategory === 'tous' && this.articles.list) {
          this.displayedArticles = [...this.articles.list]
          this.currentTotal = this.articles.list.length
        }
      },
      deep: true
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

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #6c757d;
  font-size: 14px;
}

.end-indicator {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 16px;
  font-size: 14px;
}

.categories-container {
  margin-bottom: 16px;
}
</style>
