<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Quartiers Prioritaires (QPV) à: {{ locationName }}
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
              <th>Quartier QPV</th>
              <th>Population</th>
              <th>Indice Jeunesse</th>
              <th>Logements sociaux</th>
              <th>Taux logements sociaux</th>
              <th>Taux d'emploi</th>
              <th>Taux de pauvreté</th>
              <th>RSA socle</th>
              <th>Allocataires CAF</th>
              <th>Couverture CAF</th>
            </tr>
          </thead>
        </table>
        
        <!-- Virtual scrolled content -->
        <div class="virtual-scroll-wrapper" :style="{ height: virtualHeight + 'px' }">
          <div class="virtual-scroll-content" :style="{ transform: `translateY(${offsetY}px)`, paddingTop: '40px' }">
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
                  <td class="score-main">{{formatNumber(qpv.indiceJeunesse)}}</td>
                  <td class="score-main">{{formatNumber(qpv.nombre_logements_sociaux)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_logements_sociaux)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_d_emploi)}}</td>
                  <td class="score-main">{{formatPercentage(qpv.taux_pauvrete_60)}}</td>
                  <td class="score-main">{{formatNumber(qpv.RSA_socle)}}</td>
                  <td class="score-main">{{formatNumber(qpv.allocataires_CAF)}}</td>
                  <td class="score-main">{{formatNumber(qpv.personnes_couvertes_CAF)}}</td>
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
        <p v-if="location.type === 'country'">
          Aucun quartier prioritaire dans cette zone.
        </p>
        <p v-else>
          Aucun quartier prioritaire dans cette zone.
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
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
        const { useDataStore } = await import('../services/store.js');
        const dataStore = useDataStore();
        const params = {
          cursor: this.data.pagination.nextCursor,
          limit: 20
        };
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
  min-width: 800px;
  table-layout: fixed;
}

.qpv-table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fff;
}

.qpv-table-body {
  margin-top: -40px; /* Offset for header height */
}

.qpv-table th,
.qpv-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ececec;
  white-space: normal;
}

.qpv-table th {
  position: sticky;
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 13px;
  top: 0;
  z-index: 2;
}

.qpv-table th:first-child,
.qpv-table td:first-child {
  position: sticky;
  left: 0;
  background-color: #fff;
  z-index: 3;
  width: 30%;
}

.qpv-table th:first-child {
  background-color: #e9ecef;
  z-index: 4;
}

.qpv-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.qpv-table tr:last-child td {
  border-bottom: none;
}

.qpv-table a {
  color: #007bff;
  text-decoration: none;
}

.qpv-table a:hover {
  text-decoration: underline;
}

/* Consistent column widths for both header and body tables */
.qpv-table th:nth-child(1),
.qpv-table td:nth-child(1) {
  width: 25%;
}

.qpv-table th:nth-child(2),
.qpv-table td:nth-child(2) {
  width: 10%;
}

.qpv-table th:nth-child(3),
.qpv-table td:nth-child(3) {
  width: 12%;
}

.qpv-table th:nth-child(4),
.qpv-table td:nth-child(4) {
  width: 10%;
}

.qpv-table th:nth-child(5),
.qpv-table td:nth-child(5) {
  width: 12%;
}

.qpv-table th:nth-child(6),
.qpv-table td:nth-child(6) {
  width: 10%;
}

.qpv-table th:nth-child(7),
.qpv-table td:nth-child(7) {
  width: 11%;
}

.qpv-table th:nth-child(8),
.qpv-table td:nth-child(8) {
  width: 10%;
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