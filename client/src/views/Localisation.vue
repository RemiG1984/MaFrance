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
            :migrantCentersData="migrantCentersData"
            :qpvData="qpvData"
            :mosquesData="mosquesData"
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

    // ==================== REACTIVE DATA ====================

    // Data for map
    const qpvData = ref(null)
    const migrantCentersData = ref([])
    const mosquesData = ref([])

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
      loadData()
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

      // Local reactive data
      qpvData,
      migrantCentersData,
      mosquesData,
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
}
</style>