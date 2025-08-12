
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

      <div v-else class="text-center">
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
      // Virtual scrolling
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
      if (this.location.type === 'departement') {
        return this.location.name
      } else if (this.location.type === 'commune') {
        return this.location.name
      }
      return 'France'
    },

    migrantsList() {
      return this.data.list || []
    },

    // Virtual scrolling computed properties
    visibleStartIndex() {
      return Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize)
    },

    visibleEndIndex() {
      const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
      return Math.min(
        this.migrantsList.length - 1,
        this.visibleStartIndex + visibleCount + this.bufferSize * 2
      )
    },

    visibleMigrants() {
      return this.migrantsList.slice(this.visibleStartIndex, this.visibleEndIndex + 1)
    },

    virtualHeight() {
      return this.migrantsList.length * this.itemHeight
    },

    offsetY() {
      return this.visibleStartIndex * this.itemHeight
    },

    computedContainerHeight() {
      // Reduce to 50px if no migrants and not loading
      return this.migrantsList.length === 0 && !this.isLoading ? 50 : 400;
    }
  },
  methods: {
    formatNumber(number) {
      if (number == null || isNaN(number)) return "N/A";
      return number.toLocaleString("fr-FR");
    },

    updateContainerHeight() {
      if (this.$refs.tableContainer) {
        this.containerHeight = this.$refs.tableContainer.clientHeight
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
      // Skip if not country (per proposal)
      if (this.location.type !== 'country') return;

      this.isLoading = true;
      try {
        const { useDataStore } = await import('../services/store.js');
        const dataStore = useDataStore();
        const params = {
          cursor: this.data.pagination.nextCursor,
          limit: 20
        };
        await dataStore.loadMoreMigrants('country', null, params);
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
          this.updateContainerHeight()
        })
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
  max-height: 400px;
  margin: 15px 0;
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

.centres-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.centres-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fff;
}

.centres-table-body {
  margin-top: -40px; /* Offset for header height */
}

.centres-table th,
.centres-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ececec;
  white-space: normal;
}

.centres-table th {
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 13px;
  height: 40px;
}

.centres-table th:first-child,
.centres-table td:first-child {
  width: 20%;
}

.centres-table-header th:first-child {
  background-color: #e9ecef;
}

.centres-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.centres-table tr:last-child td {
  border-bottom: none;
}

.row-title {
  font-weight: 600;
  color: #333;
}

.score-main {
  color: #555;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #6c757d;
}
</style>
