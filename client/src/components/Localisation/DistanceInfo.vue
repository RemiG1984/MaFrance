<template>
  <v-card class="pa-4">
    <h4 class="mb-3">{{ isEnglish ? 'Your position is at:' : 'Votre position est à:' }}</h4>

      <!-- QPV Distance -->
      <div v-if="distanceInfo.qpv" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="$emit('toggle-qpv')"
        >
          <div class="distance-indicator qpv-indicator"></div>
          <strong>{{ distanceInfo.qpv.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest QPV' : 'du QPV le plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="distanceInfo.qpv.expanded ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="distanceInfo.qpv.expanded" class="text-caption text-grey ml-6 mt-1">
            <strong>{{ isEnglish ? 'QPV:' : 'QPV:' }}</strong> <a :href="distanceInfo.qpv.link" target="_blank">{{ distanceInfo.qpv.name }}</a><br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ distanceInfo.qpv.commune }}
          </div>
        </v-expand-transition>
      </div>

      <!-- Migrant Center Distance -->
      <div v-if="distanceInfo.migrantCenter" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="$emit('toggle-migrant')"
        >
          <div class="distance-indicator migrant-indicator">↑</div>
          <strong>{{ distanceInfo.migrantCenter.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest migrant center' : 'du centre de migrants le plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="distanceInfo.migrantCenter.expanded ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="distanceInfo.migrantCenter.expanded" class="text-caption text-grey ml-6 mt-1">
            <strong>{{ isEnglish ? 'Type:' : 'Type:' }}</strong> {{ distanceInfo.migrantCenter.type }} | <strong>{{ isEnglish ? 'Places:' : 'Places:' }}</strong> {{ distanceInfo.migrantCenter.places }} | <strong>{{ isEnglish ? 'Manager:' : 'Gestionnaire:' }}</strong> {{ distanceInfo.migrantCenter.gestionnaire }}<br>
            <strong>{{ isEnglish ? 'Address:' : 'Adresse:' }}</strong> {{ distanceInfo.migrantCenter.address }}<br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ distanceInfo.migrantCenter.commune }}
          </div>
        </v-expand-transition>
      </div>

      <!-- Mosque Distance -->
      <div v-if="distanceInfo.mosque" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="$emit('toggle-mosque')"
        >
          <div class="distance-indicator mosque-indicator">🕌</div>
          <strong>{{ distanceInfo.mosque.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest mosque' : 'de la mosquée la plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="distanceInfo.mosque.expanded ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="distanceInfo.mosque.expanded" class="text-caption text-grey ml-6 mt-1">
            {{ distanceInfo.mosque.name }}<br>
            <strong>{{ isEnglish ? 'Address:' : 'Adresse:' }}</strong> {{ distanceInfo.mosque.address }}<br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ distanceInfo.mosque.commune }}
          </div>
        </v-expand-transition>
      </div>

      <div v-if="!distanceInfo.migrantCenter && !distanceInfo.qpv && !distanceInfo.mosque" class="text-grey">
        {{ isEnglish ? 'No data available for this position' : 'Aucune donnée disponible pour cette position' }}
      </div>
    </v-card>
</template>

<script>
import { defineComponent, computed } from 'vue'
import { useDataStore } from '../../services/store.js'

export default defineComponent({
  name: 'DistanceInfo',
  props: {
    distanceInfo: {
      type: Object,
      default: null
    }
  },
  emits: ['toggle-qpv', 'toggle-migrant', 'toggle-mosque'],
  setup() {
    const dataStore = useDataStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    return { dataStore, isEnglish }
  },
})
</script>

<style scoped>
.distance-info h4 {
  color: #333;
  font-weight: 500;
}

.distance-info .v-icon {
  vertical-align: middle;
}

.distance-summary {
  padding: 4px 0;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.distance-summary:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.v-icon {
  transition: transform 0.2s ease;
}

/* Distance indicators */
.distance-indicator {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  vertical-align: middle;
  font-size: 12px;
  font-weight: bold;
}

.distance-indicator.qpv-indicator {
  display: inline-block;
  background: #ff0000;
  border: 2px solid #cc0000;
}

.distance-indicator.migrant-indicator,
.distance-indicator.mosque-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.distance-indicator.migrant-indicator {
  background: #000000;
  color: white;
  border: 1px solid #333333;
}

.distance-indicator.mosque-indicator {
  background: #2e7d32;
  color: white;
  border: 1px solid #1b5e20;
}
</style>