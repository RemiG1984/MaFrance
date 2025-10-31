<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-0" style="cursor: pointer" @click="toggleCollapse">
      {{ isEnglish ? 'Public subsidies to associations for:' : 'Subventions publiques aux associations pour:' }} {{ locationName }}
    </v-card-title>
    <v-card-subtitle class="text-caption text-grey pt-0 pb-0">
      <a
        href="https://data.ofgl.fr/pages/acces-donnees-comptables-detaillees/"
        target="_blank"
        class="text-decoration-none"
      >
        {{ isEnglish ? 'data.ofgl.fr source' : 'source data.ofgl.fr' }}
      </a>
    </v-card-subtitle>
    <v-expand-transition>
      <v-card-text v-show="!isCollapsed">
        <div v-if="subventionRows && subventionRows.length > 0">
          <div class="table-container">
            <table class="subventions-table">
              <thead>
                <tr>
                  <th />
                  <th>{{ isEnglish ? 'Value /per capita/year' : 'Valeur /hab./an' }}</th>
                  <th>{{ isEnglish ? 'National average /per capita/year' : 'Moyenne nationale /hab./an' }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in subventionRows" :key="index">
                  <td class="row-title">
                    {{ row.entity }}
                  </td>
                  <td class="score-main">
                    {{ formatNumber(row.perCapita) }} €
                  </td>
                  <td class="score-main">
                    {{ formatNumber(row.nationalAverage) }} €
                  </td>
                </tr>
                <tr class="total-row">
                  <td class="row-title total-title">
                    {{ isEnglish ? 'Total per capita per year' : 'Total par hab. et par an' }}
                  </td>
                  <td class="score-main">
                    {{ formatNumber(totalPerCapita) }} €
                  </td>
                  <td class="score-main">
                    {{ formatNumber(totalNationalAverage) }} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="text-center">
          <p>{{ isEnglish ? 'No subsidy data available for this area.' : 'Aucune donnée de subvention disponible pour cette zone.' }}</p>
        </div>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../../services/store.js';

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
  data() {
    return {
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

      // Get country subventions data - prefer france metro, fallback to france entiere or first available
      const countrySubventions = this.getCountrySubventions();

      // Get population from the country details array - match the same country as subventions
      let countryPopulation = 0;
      if (this.countryData.details && Array.isArray(this.countryData.details)) {
        const selectedCountry = countrySubventions?.country || 'france metro';
        const countryDetails = this.countryData.details.find(item => item.country === selectedCountry);
        countryPopulation = countryDetails?.population || 0;
      } else if (this.countryData.details?.population) {
        // Fallback for old structure
        countryPopulation = this.countryData.details.population;
      }

      // Row 1: Ministères (country data) - use country population
      if (countrySubventions?.etat_central !== null) {
        const value = countrySubventions.etat_central;
        rows.push({
          entity: this.isEnglish ? 'By ministries' : 'Par les ministères',
          perCapita: countryPopulation > 0 ? value / countryPopulation : 0,
          nationalAverage: countryPopulation > 0 ? value / countryPopulation : 0
        });
      }

      // Row 2: Autres organismes publics (country data) - use country population
      if (countrySubventions?.autres_organismes_publics !== null) {
        const value = countrySubventions.autres_organismes_publics;
        rows.push({
          entity: this.isEnglish ? 'By other public organizations' : 'Par les autres organismes publics',
          perCapita: countryPopulation > 0 ? value / countryPopulation : 0,
          nationalAverage: countryPopulation > 0 ? value / countryPopulation : 0
        });
      }

      // Row 3: Région (departement data) - use departement population
      if (this.departementData.subventions?.subvention_region_distributed !== null) {
        const value = this.departementData.subventions.subvention_region_distributed;
        const departementPopulation = this.departementData.details?.population || 0;
        const nationalRegionAverage = countrySubventions?.total_subv_region && countryPopulation > 0
          ? countrySubventions.total_subv_region / countryPopulation : 0;
        rows.push({
          entity: this.isEnglish ? 'By the region' : 'Par la région',
          perCapita: departementPopulation > 0 ? value / departementPopulation : 0,
          nationalAverage: nationalRegionAverage
        });
      }

      // Row 4: Département (departement data) - use departement population
      if (this.departementData.subventions?.subvention_departement !== null) {
        const value = this.departementData.subventions.subvention_departement;
        const departementPopulation = this.departementData.details?.population || 0;
        const nationalDeptAverage = countrySubventions?.total_subv_dept && countryPopulation > 0
          ? countrySubventions.total_subv_dept / countryPopulation : 0;
        rows.push({
          entity: this.isEnglish ? 'By the department' : 'Par le département',
          perCapita: departementPopulation > 0 ? value / departementPopulation : 0,
          nationalAverage: nationalDeptAverage
        });
      }

      // Row 5: Agglomération (commune data) - use commune population
      if (this.communeData.subventions?.subvention_EPCI_distributed !== null) {
        const value = this.communeData.subventions.subvention_EPCI_distributed;
        const communePopulation = this.communeData.details?.population || 0;
        const nationalEPCIAverage = countrySubventions?.total_subv_EPCI && countryPopulation > 0
          ? countrySubventions.total_subv_EPCI / countryPopulation : 0;
        rows.push({
          entity: this.isEnglish ? 'By the agglomeration' : 'Par l\'agglomération',
          perCapita: communePopulation > 0 ? value / communePopulation : 0,
          nationalAverage: nationalEPCIAverage
        });
      }

      // Row 6: Commune (commune data) - use commune population
      if (this.communeData.subventions?.subvention_commune !== null) {
        const value = this.communeData.subventions.subvention_commune;
        const communePopulation = this.communeData.details?.population || 0;
        const nationalCommuneAverage = countrySubventions?.total_subv_commune && countryPopulation > 0
          ? countrySubventions.total_subv_commune / countryPopulation : 0;
        rows.push({
          entity: this.isEnglish ? 'By the municipality' : 'Par la commune',
          perCapita: communePopulation > 0 ? value / communePopulation : 0,
          nationalAverage: nationalCommuneAverage
        });
      }

      return rows;
    },

    totalPerCapita() {
      return this.subventionRows.reduce((sum, row) => sum + row.perCapita, 0);
    },

    totalNationalAverage() {
      return this.subventionRows.reduce((sum, row) => sum + row.nationalAverage, 0);
    }
  },
  methods: {
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    },

    formatNumber(number) {
      if (number === null || isNaN(number)) {
        return 'N/A';
      }
      return Math.round(number).toLocaleString('fr-FR').replace(/\s/g, ' ');
    },

    getCountrySubventions() {
      // Handle both old structure (direct subventions object) and new structure (array)
      if (this.countryData.subventions) {
        // New structure - array of country entries
        if (Array.isArray(this.countryData.subventions)) {
          // Prefer "france metro", fallback to "france entiere" or first available
          const franceMetro = this.countryData.subventions.find(item => item.country === 'france metro');
          if (franceMetro) {
            return franceMetro;
          }

          const franceEntiere = this.countryData.subventions.find(item => item.country === 'france entiere');
          if (franceEntiere) {
            return franceEntiere;
          }

          // Fallback to first item if available
          return this.countryData.subventions[0] || null;
        } else {
          // Old structure - direct object
          return this.countryData.subventions;
        }
      }
      return null;
    }
  }
};
</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  margin: 0px 0;
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

.total-row {
  border-top: 2px solid #495057;
  font-weight: bold;
  background-color: #e9ecef !important;
}

.total-title {
  font-weight: 700;
  color: #343a40;
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
