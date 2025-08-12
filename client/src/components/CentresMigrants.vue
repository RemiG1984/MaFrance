<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Centres d'hébergement de migrants pour: {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div
        class="table-container"
        ref="tableContainer"
        @scroll="handleScroll"
        v-if="visibleMigrants && visibleMigrants.length > 0"
        :style="{ maxHeight: computedContainerHeight + 'px' }"
      >
        <!-- Fixed header outside of virtual scroll -->
        <table class="centres-table centres-table-header">
          <thead>
            <tr>
              <th>Type de centre</th>
              <th>Places</th>
              <th>Gestionnaire</th>
              <th v-if="location.type === 'country'">Département</th>
              <th>Adresse</th>
            </tr>
          </thead>
        </table>

        <!-- Virtual scrolled content -->
        <div class="virtual-scroll-wrapper" :style="{ height: virtualHeight + 'px' }">
          <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)`, paddingTop: '40px' }">
            <table class="centres-table centres-table-body">
              <tbody>
                <tr
                  v-for="(centre, i) in visibleMigrants"
                  :key="centre.COG + '-' + centre.gestionnaire_centre + '-' + i"
                  :style="{ height: itemHeight + 'px' }"
                >
                  <td class="row-title">{{ centre.type_centre || 'N/A' }}</td>
                  <td class="score-main">{{ formatNumber(centre.places) }}</td>
                  <td class="score-main">{{ centre.gestionnaire_centre || 'N/A' }}</td>
                  <td v-if="location.type === 'country'" class="score-main">{{ centre.departement || 'N/A' }}</td>
                  <td class="score-main">{{ centre.adresse || 'N/A' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="isLoading" class="loading">
          <v-progress-circular indeterminate size="24" color="primary"></v-progress-circular>
          Chargement...
        </div>
      </div>

      <div v-else class="text-center no-data">
        <p>Aucun centre d'hébergement de migrants dans cette zone.</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'CentresMigrants',
  props: {
    location: {
      type: Object,
      required: true
    },
    data: {
      type: Object,
      default: () => ({
        list: [],
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
      isLoading: false,
      containerHeight: 400,
      itemHeight: 60,
      scrollTop: 0,
      bufferSize: 5
    }
  },
  mounted() {
    this.updateContainerHeight()
    window.addEventListener('resize', this.updateContainerHeight)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateContainerHeight)
  },
  computed: {
    locationName() {
      // ... (unchanged)
    },
    migrantsList() {
      return this.data.list || []
    },
    visibleStartIndex() {
      // ... (unchanged)
    },
    visibleEndIndex() {
      // ... (unchanged)
    },
    visibleMigrants() {
      // ... (unchanged)
    },
    virtualHeight() {
      // ... (unchanged)
    },
    offsetY() {
      // ... (unchanged)
    },
    computedContainerHeight() {
      // Reduce to 50px if no migrants and not loading
      return this.migrantsList.length === 0 && !this.isLoading ? 50 : 400;
    }
  },
  methods: {
    formatNumber(number) {
      // ... (unchanged)
    },
    updateContainerHeight() {
      if (this.$refs.tableContainer) {
        this.containerHeight = this.computedContainerHeight;
      }
    },
    handleScroll(event) {
      this.scrollTop = event.target.scrollTop;
      const scrollBottom = this.scrollTop + this.containerHeight;
      const contentHeight = this.virtualHeight;
      // Only load more if country level
      if (
        this.location.type === 'country' &&
        scrollBottom >= contentHeight - 200 &&
        !this.isLoading &&
        this.data.pagination?.hasMore
      ) {
        this.loadMoreMigrants();
      }
    },
    async loadMoreMigrants() {
      if (this.isLoading || !this.data.pagination?.hasMore) return;
      if (this.location.type !== 'country') return;

      this.isLoading = true;
      try {
        const { useDataStore } = await import('../services/store.js');
        const dataStore = useDataStore();
        const params = {
          cursor: this.data.pagination.nextCursor,
          limit: 20
        };
        await dataStore.loadMoreMigrants(this.location.type, this.location.code, params); // Use consolidated action
      } catch (error) {
        console.error('Failed to load more migrants:', error);
      } finally {
        this.isLoading = false;
      }
    }
  },
  watch: {
    data: {
      handler() {
        this.$nextTick(() => {
          this.updateContainerHeight();
        });
      },
      deep: true
    }
  }
}
</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-y: auto;
  overflow-x: auto;
  margin: 15px 0;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.no-data {
  text-align: center;
  padding: 20px;
  color: #6c757d;
  font-style: italic;
}

/* ... (unchanged other styles) */
</style>