
<template>
  <v-card class="memorial-card elevation-2 h-100">
    <v-img
      v-if="victim.photo"
      :src="`/images/francocides/${victim.photo}`"
      height="250"
      cover
      class="memorial-image"
      loading="lazy"
      :alt="'Photo de ' + victim.prenom + (victim.nom ? ' ' + victim.nom : '')"
      @click="$emit('show-resume', victim)"
      style="cursor: pointer;"
    >
      <template v-slot:placeholder>
        <v-skeleton-loader type="image" />
      </template>
    </v-img>
    <div v-else class="memorial-placeholder d-flex align-center justify-center" style="height: 250px; background-color: #e8ecef; cursor: pointer;" @click="$emit('show-resume', victim)">
      <v-icon size="64" color="grey-lighten-2">mdi-account</v-icon>
    </div>

    <v-card-title class="text-h6 pb-0">
      {{ victim.prenom }}{{ victim.nom ? ' ' + victim.nom : '' }}
    </v-card-title>

    <v-card-subtitle class="pb-2">
      <div class="text-body-2 text-grey-darken-1 ml-1">({{ formatAge(victim.age) }})</div>
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
          v-for="tag in victimTags"
          :key="tag"
          size="x-small"
          :color="isTagSelected(tag) ? 'primary' : 'blue-grey-lighten-3'"
          :variant="isTagSelected(tag) ? 'elevated' : 'outlined'"
          class="ma-1 memorial-tag"
          clickable
          role="button"
          @click="$emit('select-tag', tag)"
          :aria-label="`Filtrer par le tag ${tag}`"
        >
          {{ tag }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../services/store.js';
import { formatDate, getGenderText, parseTagsArray, formatAge } from '../utils/utils.js';

export default {
  name: 'VictimCard',
  props: {
    victim: { type: Object, required: true }
  },
  emits: ['show-resume', 'select-tag'],
  computed: {
    ...mapStores(useDataStore),
    locationData() {
      return this.dataStore.locationCache;
    },
    victimTags() {
      // Memoize tag parsing
      if (!this._cachedTags || this._lastTagString !== this.victim.tags) {
        this._lastTagString = this.victim.tags;
        this._cachedTags = parseTagsArray(this.victim.tags);
      }
      return this._cachedTags;
    }
  },
  methods: {
    formatDate,
    formatAge,
    getGenderText,

    formatLocation(cog) {
      if (!cog) return 'Lieu inconnu';
      
      // Handle international locations
      const internationalLocations = {
        'UK': 'Royaume-Uni',
        'ES': 'Espagne',
        'IT': 'Italie',
        'DE': 'Allemagne',
        'BE': 'Belgique',
        'CH': 'Suisse',
        'LU': 'Luxembourg',
        'NL': 'Pays-Bas',
        'AT': 'Autriche',
        'PT': 'Portugal',
        'IE': 'Irlande',
        'DK': 'Danemark',
        'SE': 'Suède',
        'NO': 'Norvège',
        'FI': 'Finlande',
        'PL': 'Pologne',
        'CZ': 'République tchèque',
        'SK': 'Slovaquie',
        'HU': 'Hongrie',
        'RO': 'Roumanie',
        'BG': 'Bulgarie',
        'GR': 'Grèce',
        'HR': 'Croatie',
        'SI': 'Slovénie',
        'EE': 'Estonie',
        'LV': 'Lettonie',
        'LT': 'Lituanie',
        'MT': 'Malte',
        'CY': 'Chypre',
        'US': 'États-Unis',
        'CA': 'Canada',
        'AU': 'Australie',
        'NZ': 'Nouvelle-Zélande',
        'JP': 'Japon',
        'CN': 'Chine',
        'IN': 'Inde',
        'BR': 'Brésil',
        'AR': 'Argentine',
        'MX': 'Mexique',
        'ZA': 'Afrique du Sud',
        'EG': 'Égypte',
        'MA': 'Maroc',
        'TN': 'Tunisie',
        'DZ': 'Algérie',
        'TR': 'Turquie',
        'RU': 'Russie',
        'UA': 'Ukraine'
      };
      
      if (internationalLocations[cog]) {
        return internationalLocations[cog];
      }
      
      return this.locationData[cog] || `Lieu inconnu (COG: ${cog})`;
    },

    isTagSelected(tag) {
      return this.dataStore.memorials.selectedTags.includes(tag);
    }
  }
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
  gap: 3px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 4px 0;
  justify-content: flex-start;
  align-items: flex-start;
  margin-left: 0;
}

.memorial-tag {
  font-size: 0.7rem !important;
  flex: 0 0 auto;
  min-width: fit-content;
  max-width: 100%;
  word-break: break-word;
  white-space: nowrap;
  box-sizing: border-box;
  padding: 2px 6px;
  margin: 0 !important;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.memorial-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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
    padding: 1px 4px;
  }
  .tags-container {
    gap: 2px;
  }
}

@media (max-width: 400px) {
  .memorial-tag {
    font-size: 0.6rem;
    padding: 1px 3px;
  }
}
</style>
