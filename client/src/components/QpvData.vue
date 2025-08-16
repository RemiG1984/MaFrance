<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6">
      Quartiers Prioritaires (QPV) à: {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div v-if="qpvList && qpvList.length > 0">
        <v-data-table
          :headers="headers"
          :items="qpvList"
          :loading="isLoading"
          :items-per-page="25"
          :items-per-page-options="[10, 25, 50, 100]"
          class="qpv-data-table"
          density="compact"
          :height="400"
          fixed-header
        >
          <!-- Custom template for QPV name with link -->
          <template v-slot:item.lib_qp="{ item }">
            <a
              :href="'https://sig.ville.gouv.fr/territoire/' + item.codeQPV"
              target="_blank"
              class="qpv-link"
            >
              {{ item.lib_qp || item.codeQPV }}
            </a>
          </template>

          <!-- Format population numbers -->
          <template v-slot:item.popMuniQPV="{ item }">
            {{ formatNumber(item.popMuniQPV) }}
          </template>

          <!-- Format indice jeunesse -->
          <template v-slot:item.indiceJeunesse="{ item }">
            {{ formatNumber(item.indiceJeunesse) }}
          </template>

          <!-- Format logements sociaux -->
          <template v-slot:item.nombre_logements_sociaux="{ item }">
            {{ formatNumber(item.nombre_logements_sociaux) }}
          </template>

          <!-- Format percentage values -->
          <template v-slot:item.taux_logements_sociaux="{ item }">
            {{ formatPercentage(item.taux_logements_sociaux) }}
          </template>

          <template v-slot:item.partPopImmi="{ item }">
            {{ formatPercentage(item.partPopImmi) }}
          </template>

          <template v-slot:item.partPopEt="{ item }">
            {{ formatPercentage(item.partPopEt) }}
          </template>

          <template v-slot:item.taux_d_emploi="{ item }">
            {{ formatPercentage(item.taux_d_emploi) }}
          </template>

          <template v-slot:item.taux_pauvrete_60="{ item }">
            {{ formatPercentage(item.taux_pauvrete_60) }}
          </template>

          <!-- Format other numbers -->
          <template v-slot:item.RSA_socle="{ item }">
            {{ formatNumber(item.RSA_socle) }}
          </template>

          <template v-slot:item.allocataires_CAF="{ item }">
            {{ formatNumber(item.allocataires_CAF) }}
          </template>

          <template v-slot:item.personnes_couvertes_CAF="{ item }">
            {{ formatNumber(item.personnes_couvertes_CAF) }}
          </template>

          <!-- Loading template -->
          <template v-slot:loading>
            <div class="text-center">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
              <p class="mt-2">Chargement des données...</p>
            </div>
          </template>

          <!-- No data template -->
          <template v-slot:no-data>
            <div class="text-center py-4">
              <p>Aucun quartier prioritaire dans cette zone.</p>
            </div>
          </template>
        </v-data-table>

        <!-- Load more button for country level -->
        <div v-if="location.type === 'country' && data.pagination?.hasMore" class="text-center mt-4">
          <v-btn
            @click="loadMoreQpvs"
            :loading="isLoading"
            color="primary"
            variant="outlined"
          >
            Charger plus de QPV
          </v-btn>
        </div>
      </div>

      <div v-else class="text-center py-8">
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
      headers: [
        {
          title: 'Quartier QPV',
          key: 'lib_qp',
          sortable: true,
          width: '200px'
        },
        {
          title: 'Population',
          key: 'popMuniQPV',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Commune',
          key: 'lib_com',
          sortable: true,
          width: '150px'
        },
        {
          title: 'Indice Jeunesse',
          key: 'indiceJeunesse',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Logements sociaux',
          key: 'nombre_logements_sociaux',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Taux logements sociaux',
          key: 'taux_logements_sociaux',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Pop. Immigrée',
          key: 'partPopImmi',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Pop. Étrangère',
          key: 'partPopEt',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Taux d\'emploi',
          key: 'taux_d_emploi',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Taux de pauvreté',
          key: 'taux_pauvrete_60',
          sortable: true,
          align: 'end'
        },
        {
          title: 'RSA socle',
          key: 'RSA_socle',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Allocataires CAF',
          key: 'allocataires_CAF',
          sortable: true,
          align: 'end'
        },
        {
          title: 'Couverture CAF',
          key: 'personnes_couvertes_CAF',
          sortable: true,
          align: 'end'
        }
      ]
    }
  },
  computed: {
    locationName() {
      if (!this.location) return '';

      switch (this.location.type) {
        case 'country':
          return 'France (1609 QPV)';
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

    async loadMoreQpvs() {
      if (this.isLoading || !this.data.pagination?.hasMore) return;
      // Skip if not country
      if (this.location.type !== 'country') return;

      this.isLoading = true;
      try {
        const { useDataStore } = await import('../services/store.js');
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
  }
}
</script>

<style scoped>
.qpv-data-table {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qpv-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
}

.qpv-link:hover {
  text-decoration: underline;
}

/* Ensure table headers are sticky and visible */
:deep(.v-data-table__thead) {
  background-color: #f5f5f5;
}

:deep(.v-data-table__th) {
  font-weight: 600 !important;
  background-color: #f5f5f5 !important;
}

/* Responsive table styling */
:deep(.v-data-table) {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  :deep(.v-data-table) {
    font-size: 0.75rem;
  }
}
</style>