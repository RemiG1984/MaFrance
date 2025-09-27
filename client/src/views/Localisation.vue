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
          @location-selected="handleLocationSelected"
          @overlay-toggled="handleOverlayToggled"
          @location-cleared="handleLocationCleared"
        />
      </v-col>

      <!-- Controls and Distance Information Section (4/12 columns) -->
      <v-col cols="12" md="4">
        <!-- Controls Section -->
        <div class="controls-section mb-4">
          <LocationSearch @location-found="handleLocationFound" />
        </div>

        <!-- Distance Information -->
        <div v-if="selectedLocation && distanceInfo" class="distance-info mb-4">
          <DistanceInfo :distanceInfo="distanceInfo" @toggle-qpv="toggleQpv" @toggle-migrant="toggleMigrant" @toggle-mosque="toggleMosque" />
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

// Shared constants
const OVERSEAS_DEPARTMENTS = ['971', '972', '973', '974', '976']

// Utility function to format distance
const formatDistance = (distance) => {
  return distance < 1
    ? `${Math.round(distance * 1000)}m`
    : `${distance.toFixed(1)}km`
}

// Utility function to check if coordinates are valid
const isValidCoordinates = (lat, lng) => {
  return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))
}

// Utility function to check if department is metropolitan France
const isMetropolitan = (department) => {
  return !OVERSEAS_DEPARTMENTS.includes(department)
}

// Calculate centroid from GeoJSON geometry
const calculateGeometryCentroid = (geometry) => {
  try {
    if (geometry.type === 'MultiPolygon') {
      // For MultiPolygon, use the first polygon's first ring
      const coordinates = geometry.coordinates[0][0]
      return getPolygonCentroid(coordinates)
    } else if (geometry.type === 'Polygon') {
      const coordinates = geometry.coordinates[0]
      return getPolygonCentroid(coordinates)
    }
    return null
  } catch (error) {
    console.error('Error calculating centroid:', error)
    return null
  }
}

// Get polygon centroid
const getPolygonCentroid = (coordinates) => {
  let x = 0, y = 0
  const len = coordinates.length

  coordinates.forEach(coord => {
    x += coord[0] // longitude
    y += coord[1] // latitude
  })

  return {
    lng: x / len,
    lat: y / len
  }
}

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

    // Data for map
    const qpvData = ref(null)
    const migrantCentersData = ref([])
    const mosquesData = ref([])
    const overlayStates = ref({
      showQpv: true,
      showMigrantCenters: false,
      showMosques: false
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
          api.getMosques()
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

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in kilometers
     */
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371 // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }





    // ==================== TOGGLE FUNCTIONS ====================

    const toggleQpv = () => {
      if (distanceInfo.value && distanceInfo.value.qpv) {
        distanceInfo.value.qpv.expanded = !distanceInfo.value.qpv.expanded
      }
    }

    const toggleMigrant = () => {
      if (distanceInfo.value && distanceInfo.value.migrantCenter) {
        distanceInfo.value.migrantCenter.expanded = !distanceInfo.value.migrantCenter.expanded
      }
    }

    const toggleMosque = () => {
      if (distanceInfo.value && distanceInfo.value.mosque) {
        distanceInfo.value.mosque.expanded = !distanceInfo.value.mosque.expanded
      }
    }

    const handleLocationSelected = (location) => {
      selectedLocation.value = { lat: location.lat, lng: location.lng, address: location.address }

      // Calculate distance info
      const newDistanceInfo = {}
      const lat = location.lat
      const lng = location.lng

      // Find closest migrant center
      if (overlayStates.value.showMigrantCenters && migrantCentersData.value.length > 0) {
        const migrantCentersWithDistances = migrantCentersData.value
          .filter(center => isValidCoordinates(center.latitude, center.longitude))
          .map(center => ({
            ...center,
            latitude: parseFloat(center.latitude),
            longitude: parseFloat(center.longitude),
            distance: calculateDistance(lat, lng, parseFloat(center.latitude), parseFloat(center.longitude)),
            type: 'migrant'
          }))
          .sort((a, b) => a.distance - b.distance)

        if (migrantCentersWithDistances.length > 0) {
          const closest = migrantCentersWithDistances[0]
          const formattedDistance = formatDistance(closest.distance)

          newDistanceInfo.migrantCenter = {
            distance: formattedDistance,
            type: closest.type_centre || closest.type || 'N/A',
            places: closest.places || 'N/A',
            gestionnaire: closest.gestionnaire || 'N/A',
            address: closest.adresse || 'N/A',
            commune: closest.commune || 'N/A',
            expanded: false
          }
        }
      }

      // Find closest QPV
      if (overlayStates.value.showQpv && qpvData.value && qpvData.value.geojson && qpvData.value.geojson.features) {
        const allQpvs = qpvData.value.geojson.features.map(feature => {
          if (!feature || !feature.properties) return null

          if (!isMetropolitan(feature.properties.insee_dep)) return null

          const centroid = calculateGeometryCentroid(feature.geometry)
          if (!centroid) return null

          return {
            ...feature.properties,
            latitude: centroid.lat,
            longitude: centroid.lng
          }
        }).filter(qpv => qpv !== null)

        const qpvsWithDistances = allQpvs
          .filter(qpv => isValidCoordinates(qpv.latitude, qpv.longitude))
          .map(qpv => ({
            ...qpv,
            latitude: parseFloat(qpv.latitude),
            longitude: parseFloat(qpv.longitude),
            distance: calculateDistance(lat, lng, parseFloat(qpv.latitude), parseFloat(qpv.longitude)),
            type: 'qpv'
          }))
          .sort((a, b) => a.distance - b.distance)

        if (qpvsWithDistances.length > 0) {
          const closest = qpvsWithDistances[0]
          const formattedDistance = formatDistance(closest.distance)

          newDistanceInfo.qpv = {
            distance: formattedDistance,
            name: closest.lib_qp || closest.code_qp || 'N/A',
            link: `https://sig.ville.gouv.fr/territoire/${closest.code_qp}`,
            commune: closest.lib_com || 'N/A',
            expanded: false
          }
        }
      }

      // Find closest mosque
      if (overlayStates.value.showMosques && mosquesData.value.length > 0) {
        const mosquesWithDistances = mosquesData.value
          .filter(mosque => isValidCoordinates(mosque.latitude, mosque.longitude))
          .map(mosque => ({
            ...mosque,
            latitude: parseFloat(mosque.latitude),
            longitude: parseFloat(mosque.longitude),
            distance: calculateDistance(lat, lng, parseFloat(mosque.latitude), parseFloat(mosque.longitude)),
            type: 'mosque'
          }))
          .sort((a, b) => a.distance - b.distance)

        if (mosquesWithDistances.length > 0) {
          const closest = mosquesWithDistances[0]
          const formattedDistance = formatDistance(closest.distance)

          newDistanceInfo.mosque = {
            distance: formattedDistance,
            name: closest.name || 'Mosquée',
            address: closest.address || 'N/A',
            commune: closest.commune || 'N/A',
            expanded: false
          }
        }
      }

      distanceInfo.value = newDistanceInfo
    }

    const handleOverlayToggled = (states) => {
      overlayStates.value = states
    }

    const handleLocationCleared = () => {
      selectedLocation.value = null
      distanceInfo.value = null
    }

    const handleLocationFound = (location) => {
      handleLocationSelected(location)
    }

    // Lifecycle
    onMounted(() => {
      loadData()
    })

    return {
      selectedLocation,
      distanceInfo,
      qpvData,
      migrantCentersData,
      mosquesData,
      overlayStates,
      isEnglish,
      handleLocationFound,
      toggleQpv,
      toggleMigrant,
      toggleMosque,
      handleLocationSelected,
      handleOverlayToggled,
      handleLocationCleared
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