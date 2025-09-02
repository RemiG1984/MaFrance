
<template>
  <v-row>
    <v-col
      v-for="victim in victims"
      :key="`${victim.prenom}-${victim.nom}-${victim.id}`"
      cols="12" sm="6" md="4"
    >
      <v-card class="memorial-card elevation-2 h-100">
        <v-img
          v-if="victim.photo"
          :src="`/images/francocides/${victim.photo}`"
          height="200"
          cover
          class="memorial-image"
        >
          <template v-slot:placeholder>
            <v-skeleton-loader type="image" />
          </template>
        </v-img>
        <div v-else class="memorial-placeholder d-flex align-center justify-center" style="height: 200px; background-color: #f5f5f5;">
          <v-icon size="64" color="grey-lighten-2">mdi-account</v-icon>
        </div>

        <v-card-title class="text-h6 pb-2">
          {{ victim.prenom }} {{ victim.nom }}
          <span class="text-body-2 text-grey-darken-1 ml-2">({{ victim.age }} ans)</span>
        </v-card-title>

        <v-card-subtitle class="pb-2">
          <div>{{ formatDate(victim.date_deces) }}</div>
          <div class="text-caption text-grey-darken-1">{{ formatLocation(victim.cog) }}</div>
        </v-card-subtitle>

        <v-card-actions class="pt-0">
          <v-btn
            v-if="victim.url_fdesouche"
            :href="victim.url_fdesouche"
            target="_blank"
            variant="text"
            color="primary"
            size="small"
          >
            FdeSouche
          </v-btn>
          <v-btn
            v-if="victim.url_wikipedia"
            :href="victim.url_wikipedia"
            target="_blank"
            variant="text"
            color="primary"
            size="small"
          >
            Wikipedia
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col v-if="loading" cols="12">
      <v-skeleton-loader type="card@6" />
    </v-col>

    <v-col v-if="!loading && !victims.length" cols="12">
      <v-alert type="info">Aucune donnée disponible.</v-alert>
    </v-col>
  </v-row>
</template>

<script>
import api from '../services/api.js';

export default {
  name: 'MemorialGrid',
  props: {
    victims: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  data() {
    return {
      locationData: {},
    };
  },
  mounted() {
    this.fetchLocationData();
  },
  watch: {
    victims: {
      handler() {
        this.fetchLocationData();
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return 'Date inconnue';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return dateString;
      }
    },

    async fetchLocationData() {
      const uniqueCogs = [...new Set(this.victims.map(v => v.cog).filter(Boolean))];
      console.log('Fetching location data for COGs:', uniqueCogs);
      
      for (const cog of uniqueCogs) {
        if (!this.locationData[cog]) {
          try {
            console.log(`Fetching commune details for COG: ${cog}`);
            const data = await api.getCommuneDetails(cog);
            console.log(`API response for COG ${cog}:`, data);
            
            if (data?.commune && data?.departement) {
              this.locationData[cog] = `${data.commune} (${data.departement})`;
              console.log(`Successfully cached location for COG ${cog}: ${data.commune} (${data.departement})`);
            } else {
              console.warn(`Invalid API response for COG ${cog}:`, data);
            }
          } catch (error) {
            console.error(`Failed to fetch location for COG ${cog}:`, error);
          }
        }
      }
    },

    formatLocation(cog) {
      if (!cog) return 'Lieu inconnu';
      return this.locationData[cog] || `COG: ${cog}`;
    },
  },
};
</script>

<style scoped>
.memorial-card {
  transition: transform 0.2s ease-in-out;
}

.memorial-card:hover {
  transform: translateY(-2px);
}

.memorial-image {
  filter: grayscale(20%);
}

.memorial-placeholder {
  border: 1px solid #e0e0e0;
}
</style>
