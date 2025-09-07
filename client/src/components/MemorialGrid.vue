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

          <v-card-text v-if="victim.tags" class="pt-0 pb-2">
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
    <v-dialog v-model="resumeDialog" max-width="700px">
      <v-card>
        <!-- Victim Photo and Basic Info -->
        <v-row no-gutters>
          <v-col cols="12" md="4" v-if="selectedVictim?.photo">
            <v-img
              :src="`/images/francocides/${selectedVictim.photo}`"
              height="250"
              cover
              class="dialog-image"
              :alt="'Photo de ' + selectedVictim.prenom + ' ' + selectedVictim.nom"
            >
              <template v-slot:placeholder>
                <v-skeleton-loader type="image" />
              </template>
            </v-img>
          </v-col>
          <v-col :cols="selectedVictim?.photo ? 12 : 12" :md="selectedVictim?.photo ? 8 : 12">
            <v-card-title class="text-h5 pb-2">
              {{ selectedVictim?.prenom }} {{ selectedVictim?.nom }}
            </v-card-title>

            <!-- Victim Details -->
            <v-card-text class="pb-2">
              <div class="victim-details">
                <div class="detail-item mb-2">
                  <v-icon size="small" class="mr-2">mdi-calendar</v-icon>
                  <strong>Âge:</strong> {{ selectedVictim?.age }} ans
                </div>
                <div class="detail-item mb-2">
                  <v-icon size="small" class="mr-2">mdi-calendar-remove</v-icon>
                  <strong>{{ getGenderText(selectedVictim?.sexe) }} le:</strong> {{ formatDate(selectedVictim?.date_deces) }}
                </div>
                <div class="detail-item mb-2">
                  <v-icon size="small" class="mr-2">mdi-map-marker</v-icon>
                  <strong>Lieu:</strong> {{ formatLocation(selectedVictim?.cog) }}
                </div>

                <!-- Tags -->
                <div v-if="selectedVictim?.tags" class="detail-item mb-3">
                  <v-icon size="small" class="mr-2">mdi-tag-multiple</v-icon>
                  <strong>Tags:</strong>
                  <div class="tags-container dialog-tags mt-1">
                    <v-chip
                      v-for="tag in getTagsArray(selectedVictim.tags)"
                      :key="tag"
                      size="small"
                      color="blue-grey-lighten-3"
                      variant="outlined"
                      class="ma-1"
                    >
                      {{ tag }}
                    </v-chip>
                  </div>
                </div>

                <!-- Sources -->
                <div v-if="selectedVictim?.source1 || selectedVictim?.source2" class="detail-item">
                  <v-icon size="small" class="mr-2">mdi-link</v-icon>
                  <strong>Sources:</strong>
                  <div class="sources-container dialog-sources mt-1 ml-6">
                    <v-btn
                      v-if="selectedVictim.source1"
                      :href="selectedVictim.source1"
                      target="_blank"
                      variant="outlined"
                      color="primary"
                      size="x-small"
                      class="mr-2 mb-1"
                      prepend-icon="mdi-open-in-new"
                    >
                      Source 1
                    </v-btn>
                    <v-btn
                      v-if="selectedVictim.source2"
                      :href="selectedVictim.source2"
                      target="_blank"
                      variant="outlined"
                      color="primary"
                      size="x-small"
                      class="mb-1"
                      prepend-icon="mdi-open-in-new"
                    >
                      Source 2
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-col>
        </v-row>

        <!-- Resume Section -->
        <v-divider class="mx-4"></v-divider>
        <v-card-text>
          <div class="text-h6 mb-3">
            <v-icon class="mr-2">mdi-text-box</v-icon>
            Résumé
          </div>
          <div v-if="selectedVictim?.resume" class="text-body-1">
            {{ selectedVictim.resume }}
          </div>
          <div v-else class="text-body-2 text-grey">
            Aucun résumé disponible.
          </div>
        </v-card-text>



        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="elevated" @click="resumeDialog = false">
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
import { getDepartementFromCog, normalizeDepartementCode, formatDate, getGenderText, parseTagsArray } from '../utils/utils.js';

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
    formatDate,

    async fetchLocationData() {
      const uniqueCogs = [...new Set(this.victims.map(v => v.cog).filter(Boolean))];
      await this.dataStore.fetchLocationData(uniqueCogs);
    },

    formatLocation(cog) {
      if (!cog) return 'Lieu inconnu';
      return this.locationData[cog] || `Lieu inconnu (COG: ${cog})`;
    },

    getGenderText,

    getTagsArray: parseTagsArray,

    selectTag(tag) {
      this.dataStore.toggleSelectedTag(tag);
    },

    isTagSelected(tag) {
      return this.dataStore.memorials.selectedTags.includes(tag);
    },

    async showResume(victim) {
      // If resume is not loaded yet, fetch it
      if (!victim.resume && victim.id) {
        try {
          const victimDetails = await this.dataStore.fetchVictimDetails(victim.id);
          if (victimDetails) {
            // Update the victim object with the resume
            victim.resume = victimDetails.resume;
          }
        } catch (error) {
          console.error('Error fetching victim resume:', error);
        }
      }

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
  box-sizing: border-box;
  min-height: 100%;
}

.memorial-card:hover {
  transform: translateY(-2px);
}

.memorial-image {
  filter: grayscale(50%);
  transition: filter 0.3s ease-in-out;
  aspect-ratio: 1 / 1 !important;
  max-width: 250px !important;
  width: 100% !important;
  margin: 0 auto;
}

.memorial-image:hover {
  filter: grayscale(0%);
}

.memorial-placeholder {
  border: 1px solid #d0d0d0;
  background: #e8ecef;
  aspect-ratio: 1 / 1 !important;
  max-width: 250px !important;
  width: 100% !important;
  margin: 0 auto;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px 0; /* Vertical padding only */
  overflow: hidden;
  margin-left: 0; /* Default no margin for grid view */
}

.tags-container.dialog-tags {
  margin-left: 24px; /* Specific margin for dialog view */
}

.memorial-tag {
  font-size: 0.7rem !important;
  flex-shrink: 1;
  max-width: 48%;
  min-width: 0;
  word-break: break-word;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
  padding: 2px 6px;
}

.memorial-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
  .memorial-tag {
    font-size: 0.65rem;
    max-width: 49%;
    padding: 1px 4px;
  }
}

.dialog-image {
  border-radius: 8px 0 0 0;
}

.victim-details {
  font-size: 0.95rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  line-height: 1.4;
}

.detail-item .v-icon {
  margin-top: 2px;
  opacity: 0.7;
}

.v-card-text {
  padding: 8px; /* Adjust to match your design */
}

.sources-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sources-container.dialog-sources {
  margin-left: 0;
}
</style>