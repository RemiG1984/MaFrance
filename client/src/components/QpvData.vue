<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Quartiers Prioritaires (QPV) à: {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div
        class="table-container"
        v-if="data.length > 0"
      >
        <table class="qpv-table">
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
          <tbody>
            <tr
              v-for="qpv in data"
              :key="qpv.codeQPV"
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

      <div v-else class="text-center">
        <p v-if="location.type === 'country'">
          Sélectionnez un département ou une commune pour voir les QPV.
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
      default: null
    }
  },
  data() {
    return {
      loading: false
    }
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
    }
  },

  watch: {

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
}

.qpv-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
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
</style>