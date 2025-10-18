<template>
  <div class="localisation-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>{{ isEnglish ? 'Localization of priority districts (QPV), migrant centers and mosques vs real estate price' : 'Localisation des QPV, centres de migrants et mosquées vs prix de l\'immobilier' }}</h1>
    </div>

    <!-- Main Content Layout -->
    <v-row>
      <!-- Map Section (8/12 columns) -->
      <v-col cols="12" md="8">
        <MapContainer
          @cadastral-data-loaded="handleCadastralDataLoaded"
        />
      </v-col>

      <!-- Controls and Distance Information Section (4/12 columns) -->
      <v-col cols="12" md="4">
        <!-- Controls Section -->
        <div class="controls-section mb-4">
          <LocationSearch @location-found="handleLocationFound" />
        </div>

        <!-- Distance Information -->
        <div v-if="selectedLocation" class="distance-info mb-4">
          <DistanceInfo />
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useDataStore } from '@/services/store.js'
import { useLocationStore } from '../components/Localisation/locationStore.js'
import LocationSearch from '../components/Localisation/LocationSearch.vue'
import DistanceInfo from '../components/Localisation/DistanceInfo.vue'
import MapContainer from '../components/Localisation/MapContainer.vue'


export default {
  name: 'Localisation',
  components: {
    LocationSearch,
    DistanceInfo,
    MapContainer
  },
  setup() {
    // ==================== STORES ====================
    const dataStore = useDataStore()
    const locationStore = useLocationStore()

    // ==================== COMPUTED PROPERTIES ====================
    const isEnglish = computed(() => dataStore.labelState === 3)

// ==================== HANDLER FUNCTIONS ====================

const handleLocationSelected = (location) => {
  locationStore.setSelectedLocation(location)
}

const handleLocationFound = (location) => {
  handleLocationSelected(location)
}

const handleCadastralDataLoaded = (data) => {
  locationStore.setCadastralData(data)
}

// Lifecycle
onMounted(() => {
  locationStore.loadData()
})

return {
  // Store state (reactive)
  selectedLocation: computed(() => locationStore.selectedLocation),
  distanceInfo: computed(() => locationStore.distanceInfo),
  closestLocations: computed(() => locationStore.closestLocations),
  zoom: computed(() => locationStore.zoom),
  center: computed(() => locationStore.center),
  cadastralData: computed(() => locationStore.cadastralData),
  minPrice: computed(() => locationStore.minPrice),
  maxPrice: computed(() => locationStore.maxPrice),

  // Store data (reactive)
  qpvData: computed(() => locationStore.qpvData),
  migrantCentersData: computed(() => locationStore.migrantCentersData),
  mosquesData: computed(() => locationStore.mosquesData),
  isEnglish,

  // Handlers
  handleLocationFound,
  handleLocationSelected,
  handleCadastralDataLoaded
}
  }
}
</script>

<style scoped>
.localisation-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-section h1 {
  margin: 0;
  font-size: 2rem;
  color: #333;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-section h1 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .header-section h1 {
    font-size: 1.25rem;
  }
}
</style>