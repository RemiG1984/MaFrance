<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6 pb-0" @click="toggleCollapse" style="cursor: pointer;">
      {{ cardTitle }}
    </v-card-title>

    <v-expand-transition>
      <v-card-text v-show="!isCollapsed">
        <div v-if="loading" class="d-flex justify-center align-center py-8">
          <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
        </div>

        <div v-else-if="executiveData" class="executive-box">
          <p>
            {{ executiveData.position }} {{ executiveData.locationPreposition }} {{ executiveData.location }}:
            <span class="executive-name font-weight-bold">{{ executiveData.prenom }} {{ executiveData.nom }}</span>
            <span v-if="executiveData.dateLabel">{{ executiveData.dateLabel }}</span>
            <br v-if="executiveData.familleNuance">
            <span v-if="executiveData.familleNuance">
              {{ politicalFamilyLabel }}: <span class="executive-famille">{{ executiveData.familleNuance }}</span>
            </span>
          </p>
        </div>

        <div v-else class="text-center py-8 text-grey">
          <p v-if="location.type === 'country'">
            {{ noDataMessages.country }}
          </p>
          <p v-else-if="location.type === 'departement'">
            {{ noDataMessages.departement }}
          </p>
          <p v-else-if="location.type === 'commune'">
            {{ noDataMessages.commune }}
          </p>
          <p v-else>
            {{ noDataMessages.default }}
          </p>
        </div>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../../services/store.js'
import { DepartementNames } from '../../utils/departementNames.js'

export default {
  name: 'ExecutiveDetails',
  props: {
    location: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      isCollapsed: false
    }
  },
  computed: {
    ...mapStores(useDataStore),

    cardTitle() {
      const isEnglish = this.dataStore.labelState === 3;
      const baseTitle = isEnglish ? 'Executive leader of' : 'Responsable exécutif de';
      return `${baseTitle}: ${this.locationName}`;
    },

    politicalFamilyLabel() {
      return this.dataStore.labelState === 3 ? 'Political family' : 'Famille politique';
    },

    locationName() {
      if (!this.location) return '';

      const isEnglish = this.dataStore.labelState === 3;

      switch (this.location.type) {
        case 'country':
          return 'France';
        case 'departement':
          return this.location.name || (isEnglish ? `Department ${this.location.code}` : `Département ${this.location.code}`);
        case 'commune':
          return this.location.name || (isEnglish ? 'Municipality' : 'Commune');
        default:
          return '';
      }
    },

    noDataMessages() {
      const isEnglish = this.dataStore.labelState === 3;

      if (isEnglish) {
        return {
          country: 'Displaying the Minister of Interior for France.',
          departement: 'No information available about the prefect.',
          commune: 'No information available about the mayor.',
          default: 'Select an administrative level to see elected officials details.'
        };
      } else {
        return {
          country: 'Affichage du ministre de l\'intérieur pour la France.',
          departement: 'Aucune information disponible sur le préfet.',
          commune: 'Aucune information disponible sur le maire.',
          default: 'Sélectionnez un niveau administratif pour voir les détails des élus.'
        };
      }
    },

    executiveData() {
      if (!this.location) return null;

      let executive = null;
      let position = '';
      let locationName = '';

      const isEnglish = this.dataStore.labelState === 3;

      switch (this.location.type) {
        case 'country':
          executive = this.dataStore.country.executive;
          position = isEnglish ? 'Minister of Interior' : 'Ministre de l\'intérieur';
          locationName = 'France';
          break;

        case 'departement':
          executive = this.dataStore.departement.executive;
          position = isEnglish ? 'Prefect' : 'Préfet';
          const deptCode = this.location.code;
          locationName = `${DepartementNames[deptCode]} (${deptCode})`;
          break;

        case 'commune':
          executive = this.dataStore.commune.executive;
          position = isEnglish ? 'Mayor' : 'Maire';
          const communeDetails = this.dataStore.commune.details;
          if (communeDetails) {
            locationName = `${this.location.name} (${communeDetails.departement})`;
          } else {
            locationName = this.location.name || (isEnglish ? 'Municipality' : 'Commune');
          }
          break;

        default:
          return null;
      }

      if (!executive) return null;

      // Format the date label
      let dateLabel = '';
      if (executive.date_mandat) {
        dateLabel = isEnglish 
          ? ` since ${this.formatDate(executive.date_mandat)}`
          : ` depuis le ${this.formatDate(executive.date_mandat)}`;
      } else if (executive.date_poste) {
        dateLabel = isEnglish 
          ? ` since ${this.formatDate(executive.date_poste)}`
          : ` depuis le ${this.formatDate(executive.date_poste)}`;
      }

      // Get appropriate preposition for English
      const locationPreposition = isEnglish ? 'of' : 'de';

      return {
        position,
        location: locationName,
        locationPreposition,
        prenom: executive.prenom,
        nom: executive.nom,
        dateLabel,
        familleNuance: executive.famille_nuance
      };
    }
  },

  methods: {
    formatDate(dateString) {
      if (!dateString) return '';

      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
      }
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    }
  },

  watch: {
    location: {
      handler(newLocation) {
        // The store will handle loading the executive data
        // when the location changes through the main app logic
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.executive-box {
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  border-left: 4px solid #1976d2;
}

.executive-name {
  color: #1976d2;
}

.executive-famille {
  color: #666;
  font-style: italic;
}
</style>