
<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Responsable exécutif de: {{ locationName }}
    </v-card-title>
    
    <v-card-text>
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
      </div>
      
      <div v-else-if="executiveData" class="executive-box">
        <p>
          {{ executiveData.position }} de {{ executiveData.location }}: 
          <span class="executive-name font-weight-bold">{{ executiveData.prenom }} {{ executiveData.nom }}</span>
          <span v-if="executiveData.dateLabel">{{ executiveData.dateLabel }}</span>
          <br v-if="executiveData.familleNuance">
          <span v-if="executiveData.familleNuance">
            Famille politique: <span class="executive-famille">{{ executiveData.familleNuance }}</span>
          </span>
        </p>
      </div>

      <div v-else class="text-center py-8 text-grey">
        <p v-if="location.type === 'country'">
          Affichage du ministre de l'intérieur pour la France.
        </p>
        <p v-else-if="location.type === 'departement'">
          Aucune information disponible sur le préfet.
        </p>
        <p v-else-if="location.type === 'commune'">
          Aucune information disponible sur le maire.
        </p>
        <p v-else>
          Sélectionnez un niveau administratif pour voir les détails des élus.
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { useDataStore } from '../services/store.js'
import { DepartementNames } from '../utils/departementNames.js'

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
      loading: false
    }
  },
  computed: {
    dataStore() {
      return useDataStore()
    },
    
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
    
    executiveData() {
      if (!this.location) return null;
      
      let executive = null;
      let position = '';
      let locationName = '';
      
      switch (this.location.type) {
        case 'country':
          executive = this.dataStore.country.executive;
          position = 'Ministre de l\'intérieur';
          locationName = 'France';
          break;
          
        case 'departement':
          executive = this.dataStore.departement.executive;
          position = 'Préfet';
          const deptCode = this.location.code;
          locationName = `${DepartementNames[deptCode]} (${deptCode})`;
          break;
          
        case 'commune':
          executive = this.dataStore.commune.executive;
          position = 'Maire';
          const communeDetails = this.dataStore.commune.details;
          if (communeDetails) {
            locationName = `${this.location.name} (${communeDetails.departement})`;
          } else {
            locationName = this.location.name || 'Commune';
          }
          break;
          
        default:
          return null;
      }
      
      if (!executive) return null;
      
      // Format the date label
      let dateLabel = '';
      if (executive.date_mandat) {
        dateLabel = ` depuis le ${this.formatDate(executive.date_mandat)}`;
      } else if (executive.date_poste) {
        dateLabel = ` depuis le ${this.formatDate(executive.date_poste)}`;
      }
      
      return {
        position,
        location: locationName,
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
