<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6">
      Subventions publiques aux associations pour: {{ locationName }}
    </v-card-title>
    <v-card-text>
      <div v-if="subventionRows && subventionRows.length > 0">
        <div class="table-container">
          <table class="subventions-table">
            <thead>
              <tr>
                <th>Entité</th>
                <th>Valeur</th>
                <th>Valeur par habitant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in subventionRows" :key="index">
                <td class="row-title">{{ row.entity }}</td>
                <td class="score-main value-column">{{ formatNumber(row.value) }} €</td>
                <td class="score-main">{{ formatNumber(row.perCapita) }} €</td>
              </tr>
              <tr class="total-row">
                <td class="row-title total-title">Total par habitant</td>
                <td class="score-main value-column">-</td>
                <td class="score-main total-value">{{ formatNumber(totalPerCapita) }} €</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="text-center">
        <p>Aucune donnée de subvention disponible pour cette zone.</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'Subventions',
  props: {
    location: {
      type: Object,
      required: true
    },
    countryData: {
      type: Object,
      default: () => ({})
    },
    departementData: {
      type: Object,
      default: () => ({})
    },
    communeData: {
      type: Object,
      default: () => ({})
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
    },

    currentPopulation() {
      switch (this.location.type) {
        case 'country':
          return this.countryData.details?.population || 0;
        case 'departement':
          return this.departementData.details?.population || 0;
        case 'commune':
          return this.communeData.details?.population || 0;
        default:
          return 0;
      }
    },

    subventionRows() {
      const rows = [];

      // Row 1: Ministères (country data) - use country population
      if (this.countryData.subventions?.etat_central != null) {
        const value = this.countryData.subventions.etat_central;
        const countryPopulation = this.countryData.details?.population || 0;
        rows.push({
          entity: 'Ministères',
          value: value,
          perCapita: countryPopulation > 0 ? value / countryPopulation : 0
        });
      }

      // Row 2: Autres organismes publics (country data) - use country population
      if (this.countryData.subventions?.autres_organismes_publics != null) {
        const value = this.countryData.subventions.autres_organismes_publics;
        const countryPopulation = this.countryData.details?.population || 0;
        rows.push({
          entity: 'Autres organismes publics',
          value: value,
          perCapita: countryPopulation > 0 ? value / countryPopulation : 0
        });
      }

      // Row 3: Région (departement data) - use departement population
      if (this.departementData.subventions?.subvention_region_distributed != null) {
        const value = this.departementData.subventions.subvention_region_distributed;
        const departementPopulation = this.departementData.details?.population || 0;
        rows.push({
          entity: 'Région (rapportée au dept.)',
          value: value,
          perCapita: departementPopulation > 0 ? value / departementPopulation : 0
        });
      }

      // Row 4: Département (departement data) - use departement population
      if (this.departementData.subventions?.subvention_departement != null) {
        const value = this.departementData.subventions.subvention_departement;
        const departementPopulation = this.departementData.details?.population || 0;
        rows.push({
          entity: 'Département',
          value: value,
          perCapita: departementPopulation > 0 ? value / departementPopulation : 0
        });
      }

      // Row 5: Agglomération (commune data) - use commune population
      if (this.communeData.subventions?.subvention_EPCI_distributed != null) {
        const value = this.communeData.subventions.subvention_EPCI_distributed;
        const communePopulation = this.communeData.details?.population || 0;
        rows.push({
          entity: 'Agglomération (rapportée à la commune)',
          value: value,
          perCapita: communePopulation > 0 ? value / communePopulation : 0
        });
      }

      // Row 6: Commune (commune data) - use commune population
      if (this.communeData.subventions?.subvention_commune != null) {
        const value = this.communeData.subventions.subvention_commune;
        const communePopulation = this.communeData.details?.population || 0;
        rows.push({
          entity: 'Commune',
          value: value,
          perCapita: communePopulation > 0 ? value / communePopulation : 0
        });
      }

      return rows;
    },

    totalPerCapita() {
      return this.subventionRows.reduce((sum, row) => sum + row.perCapita, 0);
    }
  },
  methods: {
    formatNumber(number) {
      if (number == null || isNaN(number)) return "N/A";
      return Math.round(number).toLocaleString("fr-FR").replace(/\s/g, ' ');
    }
  }
}
</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  margin: 15px 0;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.subventions-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 400px;
}

.subventions-table th,
.subventions-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #ececec;
}

.subventions-table th {
  background-color: #e9ecef;
  font-weight: 700;
  font-size: 14px;
  color: #495057;
}

.subventions-table tr:nth-child(even) {
  background-color: #f8f9fa;
}

.subventions-table tr:last-child td {
  border-bottom: none;
}

.row-title {
  font-weight: 600;
  color: #495057;
}

.score-main {
  font-weight: 500;
  text-align: right;
}

.value-column {
  font-family: 'Courier New', 'Monaco', monospace;
  letter-spacing: 0.5px;
}

.total-row {
  border-top: 2px solid #495057;
  font-weight: bold;
  background-color: #e9ecef !important;
}

.total-title {
  font-weight: 700;
  color: #343a40;
}

.total-value {
  font-weight: 700;
  color: #495057;
  font-family: 'Courier New', 'Monaco', monospace;
}

@media (max-width: 768px) {
  .subventions-table th,
  .subventions-table td {
    padding: 8px 10px;
    font-size: 12px;
  }

  .subventions-table th {
    font-size: 11px;
  }
}
</style>