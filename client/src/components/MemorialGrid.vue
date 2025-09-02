
<template>
  <v-container fluid class="pa-0">
    <v-row>
      <v-col
        v-for="victim in victims"
        :key="victim.id || `${victim.prenom}-${victim.nom}-${victim.date_deces}`"
        cols="12"
        sm="6"
        md="4"
        lg="4"
        xl="3"
      >
        <v-card class="memorial-card elevation-2 h-100">
          <v-img
            v-if="victim.photo"
            :src="`/images/francocides/${victim.photo}`"
            height="200"
            cover
            class="memorial-image"
            loading="lazy"
            :alt="'Photo de ' + victim.prenom + ' ' + victim.nom"
          >
            <template v-slot:placeholder>
              <v-skeleton-loader type="image" />
            </template>
          </v-img>
          <div v-else class="memorial-placeholder d-flex align-center justify-center" style="height: 200px; background-color: #e8ecef;">
            <v-icon size="64" color="grey-lighten-2">mdi-account</v-icon>
          </div>

          <v-card-title class="text-h6 pb-0">
            {{ victim.prenom }} {{ victim.nom }}
          </v-card-title>

          <v-card-subtitle class="pb-2">
            <div class="text-body-2 text-grey-darken-1 ml-1">({{ victim.age }} ans)</div>
          </v-card-subtitle>

          <v-card-subtitle class="pb-2">
            <div>{{ getGenderText(victim.sexe) }} le {{ formatDate(victim.date_deces) }}</div>
            <div class="text-caption text-grey-darken-1">à {{ formatLocation(victim.cog) }}</div>
          </v-card-subtitle>

          <v-card-actions class="pt-0">
            <v-btn
              v-if="victim.url_fdesouche"
              :href="victim.url_fdesouche"
              target="_blank"
              variant="text"
              color="primary"
              size="small"
              aria-label="Voir l'article FdeSouche"
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
              aria-label="Voir la page Wikipédia"
            >
              Wikipedia
            </v-btn>
          </v-card-actions>

          <v-card-text v-if="victim.tags" class="pt-0 pb-0">
            <div class="tags-container">
              <v-chip
                v-for="(tag, index) in displayedTags(victim.tags)"
                :key="tag"
                size="x-small"
                color="primary"
                variant="outlined"
                class="ma-1"
                clickable
                role="button"
              >
                {{ tag }}
              </v-chip>
              <v-chip
                v-if="getTagsArray(victim.tags).length > 3"
                size="x-small"
                color="grey"
                variant="outlined"
                class="ma-1"
                clickable
                role="button"
                @click="showAllTags(victim)"
                :aria-label="`Voir ${getTagsArray(victim.tags).length - 3} autres étiquettes`"
              >
                +{{ getTagsArray(victim.tags).length - 3 }} plus
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading and Empty States -->
    <v-row v-if="loading" class="mt-4">
      <v-col cols="12">
        <v-skeleton-loader type="card@6" />
      </v-col>
    </v-row>

    <v-row v-if="!loading && !victims.length" class="mt-4">
      <v-col cols="12">
        <v-alert type="info" icon="mdi-information">
          Aucune donnée disponible.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';

export default {
  name: 'MemorialGrid',
  props: {
    victims: { type: Array, default: () => [], required: true },
    loading: { type: Boolean, default: false },
  },
  computed: {
    ...mapStores(useDataStore),
    locationData() {
      return this.dataStore.locationCache;
    },
  },
  watch: {
    victims: {
      handler() {
        this.fetchLocationData();
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) return 'Date inconnue';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (error) {
        return dateString;
      }
    },

    async fetchLocationData() {
      const uniqueCogs = [...new Set(this.victims.map(v => v.cog).filter(Boolean))];
      await this.dataStore.fetchLocationData(uniqueCogs);
    },

    formatLocation(cog) {
      if (!cog) return 'Lieu inconnu';
      return this.locationData[cog] || `Lieu inconnu (COG: ${cog})`;
    },

    getGenderText(sexe) {
      if (sexe?.toLowerCase() === 'f') return 'Tuée';
      if (sexe?.toLowerCase() === 'm') return 'Tué';
      return 'Tué(e)';
    },

    getTagsArray(tags) {
      if (!tags) return [];
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    },

    displayedTags(tags) {
      return this.getTagsArray(tags).slice(0, 3);
    },

    showAllTags(victim) {
      this.$emit('show-tags', victim);
    },
  },
};
</script>

<style scoped>
.memorial-card {
  transition: transform 0.2s ease-in-out;
  background: #e8ecef;
}

.memorial-card:hover {
  transform: translateY(-2px);
}

.memorial-image {
  filter: grayscale(50%);
  transition: filter 0.3s ease-in-out;
}

.memorial-image:hover {
  filter: grayscale(0%);
}

.memorial-placeholder {
  border: 1px solid #d0d0d0;
  background: #e8ecef;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.transition-group {
  transition: all 0.3s ease-in-out;
}

@media (max-width: 600px) {
  .memorial-card {
    font-size: 0.9rem;
  }
  .v-card-title {
    font-size: 1.1rem !important;
  }
  .v-chip {
    font-size: 0.75rem;
  }
}
</style>
