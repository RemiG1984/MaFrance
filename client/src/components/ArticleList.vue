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
            Tous ({{ totalArticles }})
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

      <div class="articles-container" ref="articlesContainer" @scroll="handleScroll" :style="{ height: computedContainerHeight + 'px' }">
        <div class="virtual-scroll-wrapper" :style="{ height: virtualHeight + 'px' }">
          <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)` }">
            <div
              class="article"
              v-for="(item, i) in visibleArticles"
              :key="item.url + i"
              :style="{ height: itemHeight + 'px' }"
            >
              <div class="article-content">
                <b> {{ formatDate(item.date) }} </b>
                <span> [{{ item.commune }}] </span>
                <a :href='item.url'> {{ item.title }} </a>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="loading">
          <v-progress-circular indeterminate size="24" color="primary"></v-progress-circular>
          Chargement...
        </div>

        <div v-if="filteredArticles.length === 0 && !isLoading" class="no-articles">
          {{ noArticlesMessage }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { articleCategoriesRef } from '../utils/metricsConfig.js';
const categories = Object.keys(articleCategoriesRef);

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
        },
        pagination: {
          hasMore: false,
          nextCursor: null,
          limit: 20
        }
      })
    }
  },
  data() {
    return {
      selectedCategory: 'tous',
      categories: categories,
      articleCategoriesRef: articleCategoriesRef,
      isLoading: false,
      // Virtual scrolling
      containerHeight: 400, // Default height, will be updated dynamically
      itemHeight: 60,
      scrollTop: 0,
      bufferSize: 5,
      // Cache for "tous" articles when all are loaded
      allArticlesCache: null
    };
  },
  mounted() {
    this.updateContainerHeight();
    window.addEventListener('resize', this.updateContainerHeight);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateContainerHeight);
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
      return this.articles.list || [];
    },
    totalArticles() {
      return this.articles.counts.total || 0;
    },
    visibleStartIndex() {
      return Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize);
    },
    visibleEndIndex() {
      const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
      return Math.min(
        this.filteredArticles.length - 1,
        this.visibleStartIndex + visibleCount + this.bufferSize * 2
      );
    },
    visibleArticles() {
      return this.filteredArticles.slice(this.visibleStartIndex, this.visibleEndIndex + 1);
    },
    virtualHeight() {
      return this.filteredArticles.length * this.itemHeight;
    },
    offsetY() {
      return this.visibleStartIndex * this.itemHeight;
    },
    noArticlesMessage() {
      return 'Aucun article trouvé.';
    },
    computedContainerHeight() {
      // Reduce height to 50px when no articles are found and not loading
      return this.filteredArticles.length === 0 && !this.isLoading ? 50 : 400;
    }
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    updateContainerHeight() {
      if (this.$refs.articlesContainer) {
        this.containerHeight = this.computedContainerHeight;
      }
    },
    handleScroll(event) {
      this.scrollTop = event.target.scrollTop;
      const scrollBottom = this.scrollTop + this.containerHeight;
      const contentHeight = this.virtualHeight;
      if (
        scrollBottom >= contentHeight - 200 &&
        !this.isLoading &&
        this.articles.pagination?.hasMore
      ) {
        this.loadMoreArticles();
      }
    },
    async selectCategory(category) {
      this.selectedCategory = category;
      this.scrollTop = 0;
      if (this.$refs.articlesContainer) {
        this.$refs.articlesContainer.scrollTop = 0;
      }
      const { useDataStore } = await import('../services/store.js');
      const dataStore = useDataStore();
      const params = {
        limit: 20
      };
      if (this.location.type === 'departement') {
        params.dept = this.location.code;
      } else if (this.location.type === 'commune') {
        params.cog = this.location.code;
        params.dept = dataStore.getCommuneDepartementCode();
      }
      if (category !== 'tous') {
        params.category = category;
      }
      await dataStore.fetchFilteredArticles(params, false);
    },
    async loadMoreArticles() {
      if (this.isLoading || !this.articles.pagination?.hasMore) return;
      this.isLoading = true;
      try {
        const { useDataStore } = await import('../services/store.js');
        const dataStore = useDataStore();
        const params = {
          cursor: this.articles.pagination.nextCursor,
          limit: 20
        };
        if (this.location.type === 'departement') {
          params.dept = this.location.code;
        } else if (this.location.type === 'commune') {
          params.cog = this.location.code;
          params.dept = dataStore.getCommuneDepartementCode();
        }
        if (this.selectedCategory !== 'tous') {
          params.category = this.selectedCategory;
        }
        await dataStore.loadMoreArticles(params);
      } catch (error) {
        console.error('Failed to load more articles:', error);
      } finally {
        this.isLoading = false;
      }
    }
  },
  watch: {
    articles: {
      handler() {
        this.$nextTick(() => {
          this.updateContainerHeight();
        });
      },
      deep: true
    },
    filteredArticles: {
      handler() {
        this.$nextTick(() => {
          this.updateContainerHeight();
        });
      }
    }
  }
};
</script>

<style scoped>
.articles-container {
  height: var(--container-height, 400px); /* Default height, overridden by inline style */
  overflow-y: auto;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.virtual-scroll-wrapper {
  position: relative;
}

.virtual-scroll-content {
  position: relative;
}

.article {
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.article-content {
  padding: 12px;
  width: 100%;
}

.article a {
  color: #007bff;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #6c757d;
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