<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-0">
      {{ isEnglish ? 'Mosques for:' : 'Mosquées pour:' }} {{ locationName }} ({{ mosquesList.length }} {{ isEnglish ? 'mosques' : 'mosquées' }})
    </v-card-title>
    <v-card-text>
      <div
        class="table-container"
        ref="tableContainer"
        @scroll="handleScroll"
        v-if="visibleMosques && visibleMosques.length > 0"
        :style="{ maxHeight: computedContainerHeight + 'px' }"
      >
        <!-- Fixed header outside of virtual scroll -->
        <table class="mosques-table mosques-table-header">
          <thead>
            <tr>
              <th>{{ isEnglish ? 'Mosque Name' : 'Nom de la mosquée' }}</th>
              <th>{{ isEnglish ? 'Address' : 'Adresse' }}</th>
              <th>{{ isEnglish ? 'Municipality' : 'Commune' }}</th>
              <th>{{ isEnglish ? 'Dept.' : 'Dept.' }}</th>
            </tr>
          </thead>
        </table>

        <!-- Virtual scrolled content -->
        <div class="virtual-scroll-wrapper" :style="{ height: virtualHeight + 'px' }">
          <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)`, paddingTop: '40px' }">
            <table class="mosques-table mosques-table-body">
              <tbody>
                <tr
                  v-for="(mosque, i) in visibleMosques"
                  :key="mosque.id + '-' + i"
                  :style="{ height: itemHeight + 'px' }"
                >
                  <td class="row-title">{{ mosque.name || 'N/A' }}</td>
                  <td class="score-main">{{ mosque.address || 'N/A' }}</td>
                  <td class="score-main">{{ mosque.commune || 'N/A' }}</td>
                  <td class="score-main">{{ mosque.departement || 'N/A' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="isLoading" class="loading">
          <v-progress-circular indeterminate size="24" color="primary"></v-progress-circular>
          {{ isEnglish ? 'Loading...' : 'Chargement...' }}
        </div>
      </div>

      <div v-else class="text-center">
        <p>{{ isEnglish ? 'No mosques in this area.' : 'Aucune mosquée dans cette zone.' }}</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../../services/store.js'

export default {
  name: 'MosqueTable',
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
    ...mapStores(useDataStore),

    isEnglish() {
      return this.dataStore.labelState === 3;
    },

    locationName() {
      if (this.location.type === 'departement') {
        return this.location.name
      } else if (this.location.type === 'commune') {
        return this.location.name
      }
      return this.isEnglish ? 'France' : 'France'
    },

    mosquesList() {
      return this.data.list || []
    },

    // Virtual scrolling computed properties
    visibleStartIndex() {
      return Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize)
    },

    visibleEndIndex() {
      const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
      return Math.min(
        this.mosquesList.length - 1,
        this.visibleStartIndex + visibleCount + this.bufferSize * 2
      )
    },

    visibleMosques() {
      return this.mosquesList.slice(this.visibleStartIndex, this.visibleEndIndex + 1)
    },

    virtualHeight() {
      return this.mosquesList.length * this.itemHeight
    },

    offsetY() {
      return this.visibleStartIndex * this.itemHeight
    },

    computedContainerHeight() {
      // Reduce to 50px if no mosques and not loading
      return this.mosquesList.length === 0 && !this.isLoading ? 50 : 400;
    }
  },
  methods: {
    updateContainerHeight() {
      if (this.$refs.tableContainer) {
        this.containerHeight = this.$refs.tableContainer.clientHeight
      }
    },

    handleScroll(event) {
      this.scrollTop = event.target.scrollTop;
      // No loadMore for mosques as per API
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

.mosques-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
  table-layout: fixed;
}

.mosques-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fff;
}

.mosques-table-body {
  margin-top: -40px; /* Offset for header height */
}

.mosques-table th,
.mosques-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ececec;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mosques-table th {
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 13px;
  height: 40px;
}

/* Consistent column widths for both header and body tables */
.mosques-table th:nth-child(1),
.mosques-table td:nth-child(1) {
  width: 35%;
}

.mosques-table th:nth-child(2),
.mosques-table td:nth-child(2) {
  width: 35%;
}

.mosques-table th:nth-child(3),
.mosques-table td:nth-child(3) {
  width: 20%;
}

.mosques-table th:nth-child(4),
.mosques-table td:nth-child(4) {
  width: 10%;
}

.mosques-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.mosques-table tr:last-child td {
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