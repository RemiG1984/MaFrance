<template>
  <div class="data-selection-controls">
    <v-card elevation="2">
      <v-card-title
        class="pa-2 pb-0 d-flex align-center justify-space-between cursor-pointer"
        @click="overlayExpanded = !overlayExpanded"
      >
        <span class="text-subtitle-2">{{ isEnglish ? labels.displayPlaces.en : labels.displayPlaces.fr }}</span>
        <v-icon size="16">{{ overlayExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-card-title>
      <v-expand-transition>
        <v-card-text v-show="overlayExpanded" class="pa-2 pt-0">
          <v-checkbox
            v-model="showQpv"
            :label="isEnglish ? labels.qpv.en : labels.qpv.fr"
            density="compact"
            hide-details
            @change="onOverlayToggle"
          >
            <template v-slot:prepend>
              <div class="overlay-indicator qpv-indicator" :style="{ backgroundColor: isInclusive ? '#0000ff' : '#ff0000', borderColor: isInclusive ? '#0000cc' : '#cc0000' }"></div>
            </template>
          </v-checkbox>
          <v-checkbox
            v-model="showMigrantCenters"
            :label="isEnglish ? labels.migrantCenters.en : labels.migrantCenters.fr"
            density="compact"
            hide-details
            @change="onOverlayToggle"
          >
            <template v-slot:prepend>
              <div class="overlay-indicator migrant-indicator">{{ isInclusive ? '🧸' : '↑' }}</div>
            </template>
          </v-checkbox>
          <v-checkbox
            v-model="showMosques"
            :label="isEnglish ? labels.mosques.en : labels.mosques.fr"
            density="compact"
            hide-details
            @change="onOverlayToggle"
          >
            <template v-slot:prepend>
              <div class="overlay-indicator mosque-indicator">{{ isInclusive ? '🦄' : '🕌' }}</div>
            </template>
          </v-checkbox>
        </v-card-text>
      </v-expand-transition>
    </v-card>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useDataStore } from '../../services/store.js'

// Translation labels
const labels = {
  displayPlaces: { fr: 'Affichage des lieux', en: 'Display of places' },
  qpv: { fr: 'Quartiers QPV', en: 'QPV Districts' },
  migrantCenters: { fr: 'Centres de migrants', en: 'Migrant Centers' },
  mosques: { fr: 'Mosquées', en: 'Mosques' },
}

export default {
  name: 'LocationDataBox',
  emits: ['overlay-toggled'],
  setup(props, { emit }) {
    const dataStore = useDataStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    const isInclusive = computed(() => dataStore.labelState === 1)

    // Layer visibility toggles
    const showMigrantCenters = ref(false)
    const showQpv = ref(true)
    const showMosques = ref(false)
    const overlayExpanded = ref(true)

    // Handle overlay toggle changes
    const onOverlayToggle = () => {
      emit('overlay-toggled', {
        showQpv: showQpv.value,
        showMigrantCenters: showMigrantCenters.value,
        showMosques: showMosques.value
      })
    }

    return {
      showMigrantCenters,
      showQpv,
      showMosques,
      overlayExpanded,
      onOverlayToggle,
      isEnglish,
      isInclusive,
      labels
    }
  }
}
</script>

<style scoped>
/* Overlay indicators */
.overlay-indicator {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.qpv-indicator {
  background: #ff0000;
  border: 2px solid #cc0000;
}

.migrant-indicator {
  background: #000000;
  color: white;
  border-radius: 50%;
  border: 1px solid #333333;
}

.mosque-indicator {
  background: #2e7d32;
  color: white;
  border-radius: 50%;
  border: 1px solid #1b5e20;
}
</style>