<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Centres d'hébergement de migrants pour: {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div
        class="table-container"
        v-if="data && data.length > 0"
      >
        <table class="centres-table">
          <thead>
            <tr>
              <th>Type de centre</th>
              <th>Places</th>
              <th>Gestionnaire</th>
              <th>Adresse</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="centre in data"
              :key="centre.COG + '-' + centre.gestionnaire_centre"
            >
              <td class="row-title">{{ centre.type_centre || 'N/A' }}</td>
              <td class="score-main">{{ formatNumber(centre.places) }}</td>
              <td class="score-main">{{ centre.gestionnaire_centre || 'N/A' }}</td>
              <td class="score-main">{{ centre.adresse || 'N/A' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center">
        <p v-if="location.type === 'country'">
          Sélectionnez un département ou une commune pour voir les centres de migrants.
        </p>
        <p v-else>
          Aucun centre d'hébergement de migrants dans cette zone.
        </p>
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
      type: Array,
      default: () => []
    }
  },
  computed: {
    locationName() {
      if (this.location.type === 'departement') {
        return this.location.name
      } else if (this.location.type === 'commune') {
        return this.location.name
      }
      return 'France'
    }
  },
  methods: {
    formatNumber(number) {
      if (number == null || isNaN(number)) return "N/A";
      return number.toLocaleString("fr-FR");
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
}

.centres-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.centres-table th,
.centres-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ececec;
  white-space: normal;
}

.centres-table th {
  position: sticky;
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 13px;
  top: 0;
  z-index: 2;
}

.centres-table th:first-child,
.centres-table td:first-child {
  position: sticky;
  left: 0;
  background-color: #fff;
  z-index: 3;
  width: 20%;
}

.centres-table th:first-child {
  background-color: #e9ecef;
  z-index: 4;
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
</style>