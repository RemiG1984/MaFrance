<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-0">
      {{ isEnglish ? 'Priority Districts (QPV) in:' : 'Quartiers Prioritaires (QPV) à:' }} {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div
        class="table-container"
        ref="tableContainer"
        @scroll="handleScroll"
        v-if="visibleQpvs && visibleQpvs.length > 0"
        :style="{ maxHeight: computedContainerHeight + 'px' }"
      >
        <!-- Fixed header outside of virtual scroll -->
        <table class="qpv-table qpv-table-header">
          <thead>
            <tr>
              <th v-if="isEnglish">Priority District</th>
              <th v-else>Quartier QPV</th>
              <th>Population</th>
              <th v-if="isEnglish">Municipality</th>
              <th v-else>Commune</th>
              <th v-if="isEnglish">Immigrant Pop.</th>
              <th v-else>Pop. Immigrée</th>
              <th v-if="isEnglish">Foreign Pop.</th>
              <th v-else>Pop. Étrangère</th>
              <th v-if="isEnglish">Employment Rate</th>
              <th v-else>Taux d'emploi</th>
              <th v-if="isEnglish">Poverty Rate</th>
              <th v-else>Taux de pauvreté</th>
              <th v-if="isEnglish">Basic RSA</th>
              <th v-else>RSA socle</th>
              <th v-if="isEnglish">CAF Recipients</th>
              <th v-else>Allocataires CAF</th>
              <th v-if="isEnglish">CAF Coverage</th>
              <th v-else>Couverture CAF</th>
              <th v-if="isEnglish">Youth Index</th>
              <th v-else>Indice Jeunesse</th>
              <th v-if="isEnglish">Social Housing</th>
              <th v-else>Logements sociaux</th>
              <th v-if="isEnglish">Social Housing Rate</th>
              <th v-else>Taux logements sociaux</th>
            </tr>
          </thead>
        </table>
        
        <!-- Virtual scrolled content -->
        <div class="virtual-scroll-wrapper" :style="{ height: virtualHeight + 'px' }">
          <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)`, paddingTop: '36px' }">
            <table class="qpv-table qpv-table-body">
              <tbody>
                <tr
                  v-for="(qpv, i) in visibleQpvs"
                  :key="qpv.codeQPV + '-' + i"
                  :style="{ height: itemHeight + 'px' }"
                >
                  <td class="row-title">
                      <a :href="'https://sig.ville.gouv.fr/territoire/'+qpv.codeQPV" target="_blank">
                          {{qpv.lib_qp || qpv.codeQPV}}
                      </a>
                  </td>
                  <td class="score-main">{{formatNumber(qpv.popMuniQPV)}}</td>
                  <td class="score-main">{{qpv.lib_com}}</td>
                  <td class="score-main">{{formatPercentage(qpv.partPopImmi)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.partPopEt)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_d_emploi)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_pauvrete_60)}}</td>
                  <td class="score-main">{{formatNumber(qpv.RSA_socle)}}</td>
                  <td class="score-main">{{formatNumber(qpv.allocataires_CAF)}}</td>
                  <td class="score-main">{{formatNumber(qpv.personnes_couvertes_CAF)}}</td>
                  <td class="score-main">{{formatNumber(qpv.indiceJeunesse)}}</td>
                  <td class="score-main">{{formatNumber(qpv.nombre_logements_sociaux)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_logements_sociaux)}}</td>
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
        <p v-if="location.type === 'country'">
          {{ isEnglish ? 'No priority districts in this area.' : 'Aucun quartier prioritaire dans cette zone.' }}
        </p>
        <p v-else>
          {{ isEnglish ? 'No priority districts in this area.' : 'Aucun quartier prioritaire dans cette zone.' }}
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../../services/store.js'
export default {
  name: 'QpvData',
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
      if (!this.location) return '';
      
      // Check if store is available and get label state
      const isEnglish = this.isEnglish;

      switch (this.location.type) {
        case 'country':
          return isEnglish ? 'France (1609 Priority Districts)' : 'France (1609 QPV)';
        case 'departement':
          if (isEnglish) {
            return this.location.name || `Department ${this.location.code}`;
          }
          return this.location.name || `Département ${this.location.code}`;
        case 'commune':
          return isEnglish ? (this.location.name || 'Municipality') : (this.location.name || 'Commune');
        default:
          return '';
      }
    },

    qpvList() {
      if (Array.isArray(this.data)) {
        return this.data
      }
      return this.data.list || []
    },

    // Virtual scrolling computed properties
    visibleStartIndex() {
      return Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize)
    },

    visibleEndIndex() {
      const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
      return Math.min(
        this.qpvList.length - 1,
        this.visibleStartIndex + visibleCount + this.bufferSize * 2
      )
    },

    visibleQpvs() {
      return this.qpvList.slice(this.visibleStartIndex, this.visibleEndIndex + 1)
    },

    virtualHeight() {
      return this.qpvList.length * this.itemHeight
    },

    offsetY() {
      return this.visibleStartIndex * this.itemHeight
    },

    computedContainerHeight() {
      // Reduce to 50px if no QPVs and not loading
      return this.qpvList.length === 0 && !this.isLoading ? 50 : 400;
    }
  },
  methods: {
    formatNumber(number) {
      if (number == null || isNaN(number)) return "N/A";
      return number.toLocaleString("fr-FR");
    },

    formatPercentage(value) {
      if (value == null || isNaN(value)) return "N/A";
      return value.toFixed(1) + "%";
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
        this.loadMoreQpvs();
      }
    },

    async loadMoreQpvs() {
      if (this.isLoading || !this.data.pagination?.hasMore) return;
      // Skip if not country
      if (this.location.type !== 'country') return;

      this.isLoading = true;
      try {
        const { useDataStore } = await import('../../services/store.js');
        const dataStore = useDataStore();
        const params = {
          limit: 20
        };
        
        // Only add cursor if it's a valid value
        if (this.data.pagination.nextCursor != null) {
          params.cursor = this.data.pagination.nextCursor;
        }
        
        await dataStore.loadMoreQpv('country', null, params);
      } catch (error) {
        console.error('Failed to load more QPVs:', error);
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

.qpv-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
  table-layout: fixed;
}

.qpv-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fff;
}

.qpv-table-body {
  margin-top: -36px; /* Offset for header height */
}

.qpv-table th,
.qpv-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #ececec;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.qpv-table th {
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 12px;
  height: 36px;
  line-height: 1.2;
}

.qpv-table th:first-child,
.qpv-table td:first-child {
  position: sticky;
  left: 0;
  background-color: #fff;
  z-index: 3;
  min-width: 200px;
  max-width: 250px;
  white-space: normal;
}

.qpv-table th:first-child {
  background-color: #e9ecef;
  z-index: 4;
}

.qpv-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.qpv-table tr:nth-child(even) td:first-child {
  background-color: #f8f9fa;
}

.qpv-table tr:last-child td {
  border-bottom: none;
}

.qpv-table a {
  color: #007bff;
  text-decoration: none;
  display: block;
  white-space: normal;
  word-wrap: break-word;
}

.qpv-table a:hover {
  text-decoration: underline;
}

/* Optimized column widths for horizontal scrolling */
.qpv-table th:nth-child(1),
.qpv-table td:nth-child(1) {
  width: 200px;
}

.qpv-table th:nth-child(2),
.qpv-table td:nth-child(2) {
  width: 100px;
}

.qpv-table th:nth-child(3),
.qpv-table td:nth-child(3) {
  width: 120px;
}

.qpv-table th:nth-child(4),
.qpv-table td:nth-child(4) {
  width: 120px;
}

.qpv-table th:nth-child(5),
.qpv-table td:nth-child(5) {
  width: 140px;
}

.qpv-table th:nth-child(6),
.qpv-table td:nth-child(6) {
  width: 110px;
}

.qpv-table th:nth-child(7),
.qpv-table td:nth-child(7) {
  width: 120px;
}

.qpv-table th:nth-child(8),
.qpv-table td:nth-child(8) {
  width: 100px;
}

.qpv-table th:nth-child(9),
.qpv-table td:nth-child(9) {
  width: 120px;
}

.qpv-table th:nth-child(10),
.qpv-table td:nth-child(10) {
  width: 120px;
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