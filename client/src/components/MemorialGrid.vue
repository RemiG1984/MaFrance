
<template>
    <v-row>
      <v-col
        v-for="victim in victims"
        :key="victim.id || `${victim.prenom}-${victim.nom}-${victim.date_deces}`"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        xl="2"
      >
        <v-card class="memorial-card elevation-2 h-100">
          <v-img
            v-if="victim.photo"
            :src="`/images/francocides/${victim.photo}`"
            height="250"
            cover
            class="memorial-image"
            loading="lazy"
            :alt="'Photo de ' + victim.prenom + ' ' + victim.nom"
            @click="showResume(victim)"
            style="cursor: pointer;"
          >
            <template v-slot:placeholder>
              <v-skeleton-loader type="image" />
            </template>
          </v-img>
          <div v-else class="memorial-placeholder d-flex align-center justify-center" style="height: 250px; background-color: #e8ecef;">
            <v-icon size="64" color="grey-lighten-2">mdi-account</v-icon>
          </div>

          <v-card-title class="text-h6 pb-0">
            {{ victim.prenom }} {{ victim.nom }}
          </v-card-title>

          <v-card-subtitle class="pb-2">
            <div class="text-body-2 text-grey-darken-1 ml-1">({{ victim.age }} ans)</div>
          </v-card-subtitle>

          <v-card-subtitle class="pb-2 text-wrap">
            <div>{{ getGenderText(victim.sexe) }} le {{ formatDate(victim.date_deces) }} à {{ formatLocation(victim.cog) }}</div>
          </v-card-subtitle>

          <v-card-actions class="pt-0">
            <v-btn
              v-if="victim.source1"
              :href="victim.source1"
              target="_blank"
              variant="text"
              color="primary"
              size="small"
              aria-label="Voir la source 1"
            >
              Source 1
            </v-btn>
            <v-btn
              v-if="victim.source2"
              :href="victim.source2"
              target="_blank"
              variant="text"
              color="primary"
              size="small"
              aria-label="Voir la source 2"
            >
              Source 2
            </v-btn>
          </v-card-actions>

          <v-card-text v-if="victim.tags" class="pt-0 pb-0">
            <div class="tags-container">
              <v-chip
                v-for="tag in getTagsArray(victim.tags)"
                :key="tag"
                size="x-small"
                :color="isTagSelected(tag) ? 'primary' : 'blue-grey-lighten-3'"
                :variant="isTagSelected(tag) ? 'elevated' : 'outlined'"
                class="ma-1 memorial-tag"
                clickable
                role="button"
                @click="selectTag(tag)"
                :aria-label="`Filtrer par le tag ${tag}`"
              >
                {{ tag }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Resume Dialog -->
    <v-dialog v-model="resumeDialog" max-width="600px">
      <v-card>
        <v-card-title class="text-h5">
          {{ selectedVictim?.prenom }} {{ selectedVictim?.nom }}
        </v-card-title>
        <v-card-text>
          <div v-if="selectedVictim?.resume" class="text-body-1">
            {{ selectedVictim.resume }}
          </div>
          <div v-else class="text-body-2 text-grey">
            Aucun résumé disponible.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="resumeDialog = false">
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
  data() {
    return {
      resumeDialog: false,
      selectedVictim: null,
    };
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

    selectTag(tag) {
      this.dataStore.toggleSelectedTag(tag);
    },

    isTagSelected(tag) {
      return this.dataStore.memorials.selectedTags.includes(tag);
    },

    showResume(victim) {
      this.selectedVictim = victim;
      this.resumeDialog = true;
    },
  },
};
</script>

<style scoped>
.memorial-card {
  border: 1px double #b0b0b0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out;
  background: #f0f2f5;
}

.memorial-card:hover {
  transform: translateY(-2px);
}

.memorial-image {
  filter: grayscale(50%);
  transition: filter 0.3s ease-in-out;
  aspect-ratio: 1 / 1 !important; /* Ensure square aspect ratio */
  max-width: 250px !important; /* Cap width at height */
  width: 100% !important; /* Stretch to column width up to max-width */
  margin: 0 auto; /* Center within v-card */
}

.memorial-image:hover {
  filter: grayscale(0%);
}

.memorial-placeholder {
  border: 1px solid #d0d0d0;
  background: #e8ecef;
  aspect-ratio: 1 / 1 !important; /* Ensure square aspect ratio */
  max-width: 250px !important; /* Cap width at height */
  width: 100% !important; /* Stretch to column width up to max-width */
  margin: 0 auto; /* Center within v-card */
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.memorial-tag {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.memorial-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
