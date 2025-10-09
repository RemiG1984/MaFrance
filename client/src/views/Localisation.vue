<template>
  <div class="localisation-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>{{ isEnglish ? 'Localization of priority districts (QPV), migrant centers and mosques' : 'Localisation des QPV, centres de migrants et mosquées' }}</h1>
    </div>

    <!-- Main Content Layout -->
    <v-row>
      <!-- Map Section (8/12 columns) -->
      <v-col cols="12" md="8">
        <MapContainer
          :qpvData="qpvData"
          :migrantCentersData="migrantCentersData"
          :mosquesData="mosquesData"
          :selectedLocation="selectedLocation"
          :overlayStates="overlayStates"
          :closestLocations="closestLocations"
          :cadastralData="cadastralData"
          :zoom="zoom"
          :center="center"
          @location-selected="handleLocationSelected"
          @overlay-toggled="handleOverlayToggled"
          @location-cleared="handleLocationCleared"
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
          <DistanceInfo
            :selectedLocation="selectedLocation"
            :migrantCentersData="migrantCentersData"
            :qpvData="qpvData"
            :mosquesData="mosquesData"
            :overlayStates="overlayStates"
            :expanded-qpv="expandedQpv"
            :expanded-migrant="expandedMigrant"
            :expanded-mosque="expandedMosque"
            @distance-computed="handleDistanceComputed"
            @toggle-qpv="toggleQpv"
            @toggle-migrant="toggleMigrant"
            @toggle-mosque="toggleMosque"
          />
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api.js'
import { useDataStore } from '@/services/store.js'
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
    // ==================== REACTIVE DATA ====================

    // User input and location state
    const selectedLocation = ref(null)
    const distanceInfo = ref(null)
    const closestLocations = ref([])
    const expandedQpv = ref(false)
    const expandedMigrant = ref(false)
    const expandedMosque = ref(false)

    // Cadastral data
    const zoom = ref(null)
    const center = ref(null)
    const cadastralData = ref(null)

    // Data for map
    const qpvData = ref(null)
    const migrantCentersData = ref([])
    const mosquesData = ref([])
    const overlayStates = ref({
      showQpv: true,
      showMigrantCenters: false,
      showMosques: false,
      cadastral: false
    })

    const dataStore = useDataStore()

    // Computed properties
    const isEnglish = computed(() => dataStore.labelState === 3)

    // ==================== DATA LOADING ====================

    const loadData = async () => {
      try {
        const [qpvResponse, migrantsResponse, mosquesResponse] = await Promise.all([
          api.getQpvs(),
          api.getMigrants({ limit: 1500 }),
          api.getMosques({ limit: 3000 })
        ])

        qpvData.value = qpvResponse

        migrantCentersData.value = migrantsResponse.list.filter(center =>
          isValidCoordinates(center.latitude, center.longitude) &&
          isMetropolitan(center.departement)
        )

        mosquesData.value = mosquesResponse.list.filter(mosque =>
          isValidCoordinates(mosque.latitude, mosque.longitude) &&
          isMetropolitan(mosque.departement)
        )
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

// ==================== UTILITY FUNCTIONS ====================

const isValidCoordinates = (latitude, longitude) => {
  if (latitude == null || longitude == null) return false
  if (isNaN(latitude) || isNaN(longitude)) return false
  // Check if coordinates are within reasonable bounds for France
  return latitude >= 41 && latitude <= 51 && longitude >= -5 && longitude <= 10
}

const isMetropolitan = (departement) => {
  if (!departement) return false
  const dept = departement.toString().toUpperCase()
  // Exclude overseas territories
  const overseas = ['971', '972', '973', '974', '976']
  return !overseas.includes(dept)
}

// ==================== TOGGLE FUNCTIONS ====================

    const toggleQpv = () => {
      expandedQpv.value = !expandedQpv.value
    }

    const toggleMigrant = () => {
      expandedMigrant.value = !expandedMigrant.value
    }

    const toggleMosque = () => {
      expandedMosque.value = !expandedMosque.value
    }

    const handleLocationSelected = (location) => {
      selectedLocation.value = { lat: location.lat, lng: location.lng, address: location.address }
    }

    const handleOverlayToggled = (states) => {
      overlayStates.value = states
    }

    const handleLocationCleared = () => {
      selectedLocation.value = null
      distanceInfo.value = null
    }

    const handleDistanceComputed = ({ distanceInfo: newDistanceInfo, closestLocations: newClosestLocations }) => {
      distanceInfo.value = newDistanceInfo
      closestLocations.value = newClosestLocations
      expandedQpv.value = false
      expandedMigrant.value = false
      expandedMosque.value = false
    }

    const handleLocationFound = (location) => {
      handleLocationSelected(location)
    }


    const handleCadastralDataLoaded = (data) => {
      console.log('Cadastral data loaded:', data)
      cadastralData.value = data
    }

    // Lifecycle
    onMounted(() => {
      loadData()
    })

    return {
      selectedLocation,
      distanceInfo,
      closestLocations,
      expandedQpv,
      expandedMigrant,
      expandedMosque,
      zoom,
      center,
      cadastralData,
      qpvData,
      migrantCentersData,
      mosquesData,
      overlayStates,
      isEnglish,
      handleLocationFound,
      handleDistanceComputed,
      toggleQpv,
      toggleMigrant,
      toggleMosque,
      handleLocationSelected,
      handleOverlayToggled,
      handleLocationCleared,
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
}
</style>