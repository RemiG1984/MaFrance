<template>
  <v-card class="pa-4">
    <h4 class="mb-3">{{ isEnglish ? 'Your position is at:' : 'Votre position est à:' }}</h4>

      <!-- QPV Distance -->
      <div v-if="locationStore.distanceInfo.qpv" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="locationStore.toggleExpandedQpv()"
        >
          <div class="distance-indicator qpv-indicator"></div>
          <strong>{{ locationStore.distanceInfo.qpv.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest QPV' : 'du QPV le plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="locationStore.expandedQpv ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="locationStore.expandedQpv" class="text-caption text-grey ml-6 mt-1">
            <strong>{{ isEnglish ? 'QPV:' : 'QPV:' }}</strong> <a :href="locationStore.distanceInfo.qpv.link" target="_blank">{{ locationStore.distanceInfo.qpv.name }}</a><br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ locationStore.distanceInfo.qpv.commune }}
          </div>
        </v-expand-transition>
      </div>

      <!-- Migrant Center Distance -->
      <div v-if="locationStore.distanceInfo.migrantCenter" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="locationStore.toggleExpandedMigrant()"
        >
          <div class="distance-indicator migrant-indicator">↑</div>
          <strong>{{ locationStore.distanceInfo.migrantCenter.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest migrant center' : 'du centre de migrants le plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="locationStore.expandedMigrant ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="locationStore.expandedMigrant" class="text-caption text-grey ml-6 mt-1">
            <strong>{{ isEnglish ? 'Type:' : 'Type:' }}</strong> {{ locationStore.distanceInfo.migrantCenter.type }} | <strong>{{ isEnglish ? 'Places:' : 'Places:' }}</strong> {{ locationStore.distanceInfo.migrantCenter.places }} | <strong>{{ isEnglish ? 'Manager:' : 'Gestionnaire:' }}</strong> {{ locationStore.distanceInfo.migrantCenter.gestionnaire }}<br>
            <strong>{{ isEnglish ? 'Address:' : 'Adresse:' }}</strong> {{ locationStore.distanceInfo.migrantCenter.address }}<br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ locationStore.distanceInfo.migrantCenter.commune }}
          </div>
        </v-expand-transition>
      </div>

      <!-- Mosque Distance -->
      <div v-if="locationStore.distanceInfo.mosque" class="mt-2">
        <div
          class="distance-summary cursor-pointer d-flex align-center"
          @click="locationStore.toggleExpandedMosque()"
        >
          <div class="distance-indicator mosque-indicator">🕌</div>
          <strong>{{ locationStore.distanceInfo.mosque.distance }}&nbsp;</strong>{{ isEnglish ? 'from the nearest mosque' : 'de la mosquée la plus proche' }}
          <v-icon
            size="16"
            class="ml-2"
            :class="locationStore.expandedMosque ? 'rotate-180' : ''"
          >
            mdi-chevron-down
          </v-icon>
        </div>
        <v-expand-transition>
          <div v-show="locationStore.expandedMosque" class="text-caption text-grey ml-6 mt-1">
            {{ locationStore.distanceInfo.mosque.name }}<br>
            <strong>{{ isEnglish ? 'Address:' : 'Adresse:' }}</strong> {{ locationStore.distanceInfo.mosque.address }}<br>
            <strong>{{ isEnglish ? 'Municipality:' : 'Commune:' }}</strong> {{ locationStore.distanceInfo.mosque.commune }}
          </div>
        </v-expand-transition>
      </div>

      <div v-if="!locationStore.distanceInfo.migrantCenter && !locationStore.distanceInfo.qpv && !locationStore.distanceInfo.mosque" class="text-grey">
        {{ isEnglish ? 'No data available for this position' : 'Aucune donnée disponible pour cette position' }}
      </div>
    </v-card>
</template>

<script>
import { defineComponent, computed, ref, watch } from 'vue'
import { useDataStore } from '../../services/store.js'
import { useLocationStore } from './locationStore.js'

// Utility function to format distance
const formatDistance = (distance) => {
  return distance < 1
    ? `${Math.round(distance * 1000)}m`
    : `${distance.toFixed(1)}km`
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

export default defineComponent({
  name: 'DistanceInfo',
  props: {
    // Props no longer needed as data comes from store
  },
  setup(props) {
    const dataStore = useDataStore()
    const locationStore = useLocationStore()
    const isEnglish = computed(() => dataStore.labelState === 3)

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

    const computeDistances = () => {
      if (!locationStore.selectedLocation) {
        locationStore.setDistanceInfo({}, [])
        return
      }

      const lat = locationStore.selectedLocation.lat
      const lng = locationStore.selectedLocation.lng
      const newDistanceInfo = {}
      const newClosestLocations = []

      // Find closest migrant center
      if (locationStore.overlayStates.showMigrantCenters && locationStore.migrantCentersData.length > 0) {
        const migrantCentersWithDistances = locationStore.migrantCentersData
          .filter(center => locationStore.isValidCoordinates(center.latitude, center.longitude))
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
            commune: closest.commune || 'N/A'
          }
          newClosestLocations.push(closest)
        }
      }

      // Find closest QPV
      if (locationStore.overlayStates.showQpv && locationStore.qpvData && locationStore.qpvData.geojson && locationStore.qpvData.geojson.features) {
        const allQpvs = locationStore.qpvData.geojson.features.map(feature => {
          if (!feature || !feature.properties) return null

          if (!locationStore.isMetropolitan(feature.properties.insee_dep)) return null

          const centroid = calculateGeometryCentroid(feature.geometry)
          if (!centroid) return null

          return {
            ...feature.properties,
            latitude: centroid.lat,
            longitude: centroid.lng
          }
        }).filter(qpv => qpv !== null)

        const qpvsWithDistances = allQpvs
          .filter(qpv => locationStore.isValidCoordinates(qpv.latitude, qpv.longitude))
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
            commune: closest.lib_com || 'N/A'
          }
          newClosestLocations.push(closest)
        }
      }

      // Find closest mosque
      if (locationStore.overlayStates.showMosques && locationStore.mosquesData.length > 0) {
        const mosquesWithDistances = locationStore.mosquesData
          .filter(mosque => locationStore.isValidCoordinates(mosque.latitude, mosque.longitude))
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
            commune: closest.commune || 'N/A'
          }
          newClosestLocations.push(closest)
        }
      }

      locationStore.setDistanceInfo(newDistanceInfo, newClosestLocations)
    }

    // Watch for changes in store state that affect distance calculation
    watch([() => locationStore.selectedLocation, () => locationStore.overlayStates], computeDistances, { deep: true })

    return { dataStore, isEnglish, locationStore }
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