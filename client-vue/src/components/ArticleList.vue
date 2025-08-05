<template>
  <v-card>
    <v-card-title class="text-h5">
      Articles FdeSouche associés
    </v-card-title>
    
    <v-card-text>
      <div class="categories-container">
        <v-chip-group
          v-model="selectedCategory"
          active-class="primary--text"
          column
        >

          <v-chip 
          color="primary"
          variant="flat"
          label
          v-for="category in categories"
          :value="category">{{ articleCategoriesRef[category] }}</v-chip>
        </v-chip-group>
      </div>
      <div class="articles-container">
        <div
          class="article"
          v-for="(item, i) in articles.list"
          :key="item.url"
        >
          <b> {{ formatDate(item.date) }} </b>
          <span> [{{ item.commune }}] </span>
          <a :href='item.url'> {{ item.title }} </a>
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
      selectedCategory: null,
      categories: categories,
      articleCategoriesRef: articleCategoriesRef
    }
  },
  mounted() {
    // console.log('articleCategoriesRef', articleCategoriesRef)
  },
  computed: {
    filteredArticles() {
      let filtered = [...this.articles.list]
      
      if (this.selectedLieu) {
        filtered = filtered.filter(article => article.lieu === this.selectedLieu)
      }
      
      // Appliquer les filtres actifs
      // if (this.activeFilters.includes('Récents')) {
      //   filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
      // }
      
      return filtered
    },
    
    // totalPages() {
    //   return Math.ceil(this.filteredArticles.length / this.itemsPerPage)
    // }
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
    
    filterArticles() {
      this.currentPage = 1
    },
    
    // toggleFilter(filter) {
    //   const index = this.activeFilters.indexOf(filter)
    //   if (index > -1) {
    //     this.activeFilters.splice(index, 1)
    //   } else {
    //     this.activeFilters.push(filter)
    //   }
    // },
    
    // onPageChange(page) {
    //   this.currentPage = page
    // },
    
  },
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

</style> 