
<template>
  <v-card>
    <v-card-title class="text-h6 pb-0" style="cursor: pointer" @click="toggleCollapse">
      {{ isEnglish ? 'FdS articles related to:' : 'Articles FdS associés à:' }} {{ locationName }}
    </v-card-title>

    <v-expand-transition>
      <v-card-text v-show="!isCollapsed">
        <div v-if="location?.type === 'commune'" class="lieu-filter-container mb-0">
          <v-select
            v-model="selectedLieu"
            :items="lieuOptions"
            :label="isEnglish ? 'Location filter' : 'Filtre de lieu'"
            variant="outlined"
            density="compact"
            clearable
            class="lieu-select"
            @update:model-value="onLieuChange"
          />
        </div>

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
              size="small"
              :value="'tous'"
              @click="selectCategory('tous')"
            >
              {{ isEnglish ? 'All' : 'Tous' }} ({{ totalArticles }})
            </v-chip>
            <v-chip
              v-for="category in categories"
              :key="category"
              color="primary"
              variant="flat"
              label
              size="small"
              :value="category"
              @click="selectCategory(category)"
            >
              {{ getCategoryLabel(category) }} ({{ articles.counts[category] || 0 }})
            </v-chip>
          </v-chip-group>
        </div>

        <div ref="articlesContainer" class="articles-container" @scroll="handleScroll">
          <div
            v-for="(item, i) in filteredArticles"
            :key="item.url + i"
            class="article-item"
          >
            <div class="article-header">
              <span class="article-date">{{ formatDate(item.date) }}</span>
              <span class="article-location">{{ item.commune }} ({{ item.departement }})</span>
            </div>
            <div class="article-title">
              <a :href="item.url" target="_blank" rel="noopener noreferrer">
                {{ item.title }}
              </a>
            </div>
          </div>

          <div v-if="isLoading" class="loading">
            <v-progress-circular indeterminate size="24" color="primary" />
            <span class="loading-text">{{ isEnglish ? 'Loading...' : 'Chargement...' }}</span>
          </div>

          <div v-if="filteredArticles.length === 0 && !isLoading" class="no-articles">
            {{ noArticlesMessage }}
          </div>

          <div v-if="articles.pagination?.hasMore && !isLoading" class="load-more">
            <v-btn
              variant="outlined"
              color="primary"
              size="small"
              block
              @click="loadMoreArticles"
            >
              {{ isEnglish ? 'Load more articles' : 'Charger plus d\'articles' }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import { articleCategoriesRef } from '../../utils/metricsConfig.js';
import { mapStores } from 'pinia';
import { useDataStore } from '../../services/store.js';
import api from '../../services/api.js';

const categories = Object.keys(articleCategoriesRef);

const englishCategoriesRef = {
  insecurite: 'Insecurity',
  immigration: 'Immigration',
  islamisme: 'Islamism',
  defrancisation: 'De-francization',
  wokisme: 'Wokism'
};

export default {
  name: 'ArticleList',
  props: {
    location: {
      type: Object,
      default: () => ({})
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
      selectedLieu: null,
      lieux: [],
      isCollapsed: false
    };
  },
  computed: {
    ...mapStores(useDataStore),

    isEnglish() {
      return this.dataStore.labelState === 3;
    },

    locationName() {
      if (!this.location) {
        return '';
      }
      switch (this.location.type) {
      case 'country':
        return 'France';
      case 'departement':
        return this.location.name || (this.isEnglish ? `Department ${this.location.code}` : `Département ${this.location.code}`);
      case 'commune':
        return this.location.name || (this.isEnglish ? 'Municipality' : 'Commune');
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
    noArticlesMessage() {
      return this.isEnglish ? 'No articles found.' : 'Aucun article trouvé.';
    },

    lieuOptions() {
      const allOption = { value: null, title: this.isEnglish ? 'All' : 'Tous' };
      const lieuOptions = this.lieux.map(lieu => ({ value: lieu, title: lieu }));
      return [allOption, ...lieuOptions];
    }
  },
  watch: {
    location: {
      handler(newLocation) {
        if (newLocation?.type === 'commune') {
          this.selectedLieu = null;
          this.fetchLieux();
        } else {
          this.lieux = [];
          this.selectedLieu = null;
        }
      },
      immediate: true
    }
  },
  methods: {
    getCategoryLabel(category) {
      return this.isEnglish ? englishCategoriesRef[category] : articleCategoriesRef[category];
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      const locale = this.isEnglish ? 'en-US' : 'fr-FR';
      const options = this.isEnglish ?
        { month: '2-digit', day: '2-digit', year: 'numeric' } :
        { day: '2-digit', month: '2-digit', year: 'numeric' };
      return date.toLocaleDateString(locale, options);
    },
    handleScroll(event) {
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        !this.isLoading &&
        this.articles.pagination?.hasMore
      ) {
        this.loadMoreArticles();
      }
    },
    async selectCategory(category) {
      this.selectedCategory = category;
      if (this.$refs.articlesContainer) {
        this.$refs.articlesContainer.scrollTop = 0;
      }

      const { useDataStore: useDataStoreFn } = await import('../../services/store.js');
      const dataStore = useDataStoreFn();
      const params = {
        limit: 20
      };

      if (this.location.type === 'departement') {
        params.dept = this.location.code;
      } else if (this.location.type === 'commune') {
        params.cog = this.location.code;
        params.dept = dataStore.getCommuneDepartementCode();
        if (this.selectedLieu) {
          params.lieu = this.selectedLieu;
        }
      } else if (this.location.type === 'country') {
        params.country = 'France';
      }

      if (category !== 'tous') {
        params.category = category;
      }

      await dataStore.fetchFilteredArticles(params, false);
    },
    async loadMoreArticles() {
      if (this.isLoading || !this.articles.pagination?.hasMore) {
        return;
      }

      this.isLoading = true;
      try {
        const { useDataStore: useDataStoreFn } = await import('../../services/store.js');
        const dataStore = useDataStoreFn();
        const params = {
          cursor: this.articles.pagination.nextCursor,
          limit: 20
        };

        if (this.location.type === 'departement') {
          params.dept = this.location.code;
        } else if (this.location.type === 'commune') {
          params.cog = this.location.code;
          params.dept = dataStore.getCommuneDepartementCode();
          if (this.selectedLieu) {
            params.lieu = this.selectedLieu;
          }
        } else if (this.location.type === 'country') {
          params.country = 'France';
        }

        if (this.selectedCategory !== 'tous') {
          params.category = this.selectedCategory;
        }

        await dataStore.loadMoreArticles(params);
      } catch {
        // Ignore errors
      } finally {
        this.isLoading = false;
      }
    },

    async fetchLieux() {
      if (this.location?.type !== 'commune') {
        return;
      }

      try {
        const { useDataStore: useDataStoreFn } = await import('../../services/store.js');
        const dataStore = useDataStoreFn();
        const deptCode = dataStore.getCommuneDepartementCode();
        const lieuxData = await api.getLieux(deptCode, this.location.code);
        this.lieux = lieuxData ? lieuxData.map(item => item.lieu).sort() : [];
      } catch {
        this.lieux = [];
      }
    },

    async onLieuChange() {
      // Reset category and scroll to top
      this.selectedCategory = 'tous';
      if (this.$refs.articlesContainer) {
        this.$refs.articlesContainer.scrollTop = 0;
      }

      // Refetch articles with new lieu filter
      const { useDataStore: useDataStoreFn } = await import('../../services/store.js');
      const dataStore = useDataStoreFn();
      const params = {
        limit: 20,
        cog: this.location.code,
        dept: dataStore.getCommuneDepartementCode()
      };

      if (this.selectedLieu) {
        params.lieu = this.selectedLieu;
      }

      await dataStore.fetchFilteredArticles(params, false);
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    }
  }
};
</script>

<style scoped>
.articles-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
}

.article-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.article-item:last-child {
  border-bottom: none;
}

.article-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.article-date {
  font-size: 0.85rem;
  font-weight: 600;
  color: #666;
  line-height: 1.2;
}

.article-location {
  font-size: 0.8rem;
  color: #888;
  line-height: 1.2;
}

.article-title {
  line-height: 1.3;
  margin-top: 2px;
}

.article-title a {
  color: #1976d2;
  text-decoration: none;
  font-size: 0.9rem;
  display: block;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

.article-title a:hover {
  text-decoration: underline;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #666;
}

.loading-text {
  font-size: 0.9rem;
}

.no-articles {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
  font-size: 0.9rem;
}

.load-more {
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

.categories-container {
  margin-bottom: 16px;
}

.lieu-filter-container {
  margin-bottom: 16px;
}

.lieu-select {
  max-width: 300px;
}

/* Mobile specific improvements */
@media (max-width: 600px) {
  .article-item {
    padding: 10px;
  }

  .article-header {
    gap: 6px;
  }

  .article-date {
    font-size: 0.8rem;
  }

  .article-location {
    font-size: 0.75rem;
  }

  .article-title a {
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .categories-container :deep(.v-chip-group) {
    gap: 4px;
  }

  .categories-container :deep(.v-chip) {
    font-size: 0.75rem;
    height: auto;
    min-height: 28px;
    padding: 4px 8px;
  }
}

/* Very small screens */
@media (max-width: 400px) {
  .article-item {
    padding: 8px;
  }

  .article-title a {
    font-size: 0.8rem;
  }

  .categories-container :deep(.v-chip) {
    font-size: 0.7rem;
    padding: 3px 6px;
  }
}
</style>
