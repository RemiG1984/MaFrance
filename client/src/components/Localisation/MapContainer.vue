<template>
  <div class="map-container">
    <v-card class="mb-4">
      <v-card-text class="pa-0 position-relative">
        <div id="localisationMap" class="localisation-map"></div>

        <!-- Map Overlay Controls -->
        <div class="map-overlay-controls">
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
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useDataStore } from '../../services/store.js'
import L from 'leaflet'
import 'leaflet-fullscreen'

// Shared constants
const OVERSEAS_DEPARTMENTS = ['971', '972', '973', '974', '976']

const ICON_COLORS = {
  qpv: '#ff0000',
  migrant: '#000000',
  mosque: '#2e7d32'
}

const ICON_SIZES = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 20,
  xxlarge: 24
}

const ZOOM_THRESHOLDS = {
  small: 8,
  medium: 10,
  large: 12,
  xlarge: 14
}

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

// Icon cache for performance
const iconCache = new Map()

// Generic icon creation function with caching
const createIcon = (type, zoom, isInclusive) => {
   const key = `${type}-${zoom}-${isInclusive ? 'inclusive' : 'standard'}`
   if (iconCache.has(key)) {
     return iconCache.get(key)
   }

   let size = ICON_SIZES.small
   if (zoom >= ZOOM_THRESHOLDS.small) size = ICON_SIZES.medium
   if (zoom >= ZOOM_THRESHOLDS.medium) size = ICON_SIZES.large
   if (zoom >= ZOOM_THRESHOLDS.large) size = ICON_SIZES.xlarge
   if (zoom >= ZOOM_THRESHOLDS.xlarge) size = ICON_SIZES.xxlarge

   const color = ICON_COLORS[type]
   let symbol = ''
   if (type === 'migrant') {
     symbol = isInclusive ? '🧸' : '↑'
   } else if (type === 'mosque') {
     symbol = isInclusive ? '🦄' : '🕌'
   }

  const icon = L.divIcon({
    html: `<div style="
      background: ${color};
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${Math.max(12, size - 4)}px;
      border: 2px solid ${type === 'migrant' ? '#333333' : '#1b5e20'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${symbol}</div>`,
    className: `${type}-icon`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })

  iconCache.set(key, icon)
  return icon
}

// Fix for default Leaflet icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
})

// Translation labels
const labels = {
  displayPlaces: { fr: 'Affichage des lieux', en: 'Display of places' },
  qpv: { fr: 'Quartiers QPV', en: 'QPV Districts' },
  migrantCenters: { fr: 'Centres de migrants', en: 'Migrant Centers' },
  mosques: { fr: 'Mosquées', en: 'Mosques' },
  migrantCenter: { fr: 'Centre de migrants', en: 'Migrant Center' },
  type: { fr: 'Type:', en: 'Type:' },
  places: { fr: 'Places:', en: 'Places:' },
  manager: { fr: 'Gestionnaire:', en: 'Manager:' },
  commune: { fr: 'Commune:', en: 'Municipality:' },
  departement: { fr: 'Département:', en: 'Department:' },
  address: { fr: 'Adresse:', en: 'Address:' },
  mosque: { fr: 'Mosquée', en: 'Mosque' },
  latitude: { fr: 'Latitude:', en: 'Latitude:' },
  longitude: { fr: 'Longitude:', en: 'Longitude:' },
  qpvLabel: { fr: 'QPV:', en: 'QPV:' },
  code: { fr: 'Code:', en: 'Code:' },
  removePosition: { fr: 'Supprimer la position', en: 'Remove position' },
  position: { fr: 'Position:', en: 'Position:' },
  distance: { fr: 'Distance:', en: 'Distance:' },
  name: { fr: 'Nom:', en: 'Name:' }
}

export default {
  name: 'MapContainer',
  props: {
    qpvData: {
      type: Object,
      required: true
    },
    migrantCentersData: {
      type: Array,
      required: true
    },
    mosquesData: {
      type: Array,
      required: true
    },
    selectedLocation: {
      type: Object,
      default: null
    },
    overlayStates: {
      type: Object,
      required: true
    }
  },
  emits: ['location-selected', 'overlay-toggled'],
  setup(props, { emit }) {
    const dataStore = useDataStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    const isInclusive = computed(() => dataStore.labelState === 1)
    // ==================== REACTIVE DATA ====================

    // Layer visibility toggles
    const showMigrantCenters = ref(false)
    const showQpv = ref(true)
    const showMosques = ref(false)
    const overlayExpanded = ref(true)

    // ==================== MAP STATE ====================

    // Map instance and layers
    let map = null
    let qpvLayer = null
    let migrantCentersLayer = null
    let mosqueLayer = null

    // Map markers and layers
    let selectedMarker = null
    let arrowLayers = []

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

    // ==================== MAP MANAGEMENT ====================

    /**
     * Initialize the Leaflet map with default settings
     */
    const initMap = async () => {
      await nextTick()

      // Initialize map centered on France
      map = L.map('localisationMap').setView([46.603354, 1.888334], 6)

      // Set map bounds to metropolitan France (including Corsica)
      const bounds = L.latLngBounds(
        [41.0, -5.5], // Southwest corner (south of Corsica, west of Brittany)
        [51.5, 10.0]  // Northeast corner (north of Nord, east of Alsace)
      )
      map.setMaxBounds(bounds)
      map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false })
      })

      // Add tile layer - using CartoDB for consistency and caching
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> | <a href="https://mafrance.app">mafrance.app</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      // Add fullscreen control if available
      if (L.control && L.control.fullscreen) {
        map.addControl(new L.control.fullscreen({
          position: "topleft"
        }))
      }

      // Add click handler
      map.on('click', onMapClick)

      // Add zoom handler for updating icons
      map.on('zoomend', updateAllIcons)

      // Load QPV layer by default since showQpv is true by default
      if (showQpv.value) {
        loadQpvLayer()
      }
    }

    // Handle map click
    const onMapClick = (e) => {
      emit('location-selected', { lat: e.latlng.lat, lng: e.latlng.lng })
    }

    // ==================== LAYER MANAGEMENT ====================

    /**
     * Display migrant centers as markers on the map
     */
    const showMigrantCentersOnMap = () => {
      if (!map || !props.migrantCentersData.length) return

      if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      const currentZoom = map.getZoom()
      migrantCentersLayer = L.layerGroup()

      props.migrantCentersData.forEach(center => {
        const marker = L.marker([parseFloat(center.latitude), parseFloat(center.longitude)], {
          icon: createIcon('migrant', currentZoom, isInclusive.value)
        })
        .bindPopup(
          `<strong>${isEnglish.value ? labels.migrantCenter.en : labels.migrantCenter.fr}</strong><br>` +
          `<strong>${isEnglish.value ? labels.type.en : labels.type.fr}</strong> ${center.type_centre || center.type || 'N/A'} | <strong>${isEnglish.value ? labels.places.en : labels.places.fr}</strong> ${center.places || 'N/A'} | <strong>${isEnglish.value ? labels.manager.en : labels.manager.fr}</strong> ${center.gestionnaire || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.commune.en : labels.commune.fr}</strong> ${center.commune || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.departement.en : labels.departement.fr}</strong> ${center.departement || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.address.en : labels.address.fr}</strong> ${center.adresse || 'N/A'}`
        )

        migrantCentersLayer.addLayer(marker)
      })

      migrantCentersLayer.addTo(map)
    }

    // Show mosques on map
    const showMosquesOnMap = () => {
      if (!map || !props.mosquesData.length) return

      if (mosqueLayer) {
        map.removeLayer(mosqueLayer)
      }

      const currentZoom = map.getZoom()
      mosqueLayer = L.layerGroup()

      props.mosquesData.forEach(mosque => {
        const marker = L.marker([parseFloat(mosque.latitude), parseFloat(mosque.longitude)], {
          icon: createIcon('mosque', currentZoom, isInclusive.value)
        })
        .bindPopup(
          `<strong>${mosque.name || (isEnglish.value ? labels.mosque.en : labels.mosque.fr)}</strong><br>` +
          `<strong>${isEnglish.value ? labels.address.en : labels.address.fr}</strong> ${mosque.address || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.commune.en : labels.commune.fr}</strong> ${mosque.commune || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.latitude.en : labels.latitude.fr}</strong> ${mosque.latitude.toFixed(4)}<br>` +
          `<strong>${isEnglish.value ? labels.longitude.en : labels.longitude.fr}</strong> ${mosque.longitude.toFixed(4)}`
        )
        mosqueLayer.addLayer(marker)
      })

      mosqueLayer.addTo(map)
    }

    /**
     * Update migrant center icon sizes when zoom level changes
     */
    const updateMigrantCenterIcons = () => {
      if (!migrantCentersLayer || !map) return

      const currentZoom = map.getZoom()
      migrantCentersLayer.eachLayer(layer => {
        if (layer.setIcon) {
          layer.setIcon(createIcon('migrant', currentZoom, isInclusive.value))
        }
      })
    }

    // Update mosque icon sizes on zoom
    const updateMosqueIcons = () => {
      if (!mosqueLayer || !map) return

      const currentZoom = map.getZoom()
      mosqueLayer.eachLayer(layer => {
        if (layer.setIcon) {
          layer.setIcon(createIcon('mosque', currentZoom, isInclusive.value))
        }
      })
    }

    // Update all icon sizes on zoom
    const updateAllIcons = () => {
      updateMigrantCenterIcons()
      updateMosqueIcons()
    }

    // Load QPV GeoJSON layer
    const loadQpvLayer = () => {
      if (!props.qpvData || !props.qpvData.geojson || !props.qpvData.geojson.features) return

      qpvLayer = L.geoJSON(props.qpvData.geojson, {
        style: () => ({
          fillColor: isInclusive.value ? '#0000ff' : '#ff0000',
          color: isInclusive.value ? '#0000cc' : '#cc0000',
          weight: 1,
          fillOpacity: 0.4,
          opacity: 0.8
        }),
        onEachFeature: (feature, layer) => {
          if (!feature || !feature.properties) return

          const qpvCode = feature.properties.code_qp || 'N/A'
          const qpvName = feature.properties.lib_qp || 'N/A'
          const commune = feature.properties.lib_com || 'N/A'
          const departement = feature.properties.lib_dep || 'N/A'

          layer.bindPopup(
            `<strong>${isEnglish.value ? labels.qpvLabel.en : labels.qpvLabel.fr} ${qpvName}</strong><br>` +
            `<strong>${isEnglish.value ? labels.code.en : labels.code.fr}</strong> ${qpvCode}<br>` +
            `<strong>${isEnglish.value ? labels.commune.en : labels.commune.fr}</strong> ${commune}<br>` +
            `<strong>${isEnglish.value ? labels.departement.en : labels.departement.fr}</strong> ${departement}`
          )

          layer.on('mouseover', (e) => {
            layer.setStyle({
              fillOpacity: 0.7,
              weight: 2
            })
          })

          layer.on('mouseout', (e) => {
            layer.setStyle({
              fillOpacity: 0.4,
              weight: 1
            })
          })
        },
        filter: (feature) => {
          // Only include metropolitan France features
          return feature && feature.geometry && feature.properties &&
                 isMetropolitan(feature.properties.insee_dep)
        }
      })

      qpvLayer.addTo(map)
    }

    // Handle overlay toggle changes
    const onOverlayToggle = () => {
      emit('overlay-toggled', {
        showQpv: showQpv.value,
        showMigrantCenters: showMigrantCenters.value,
        showMosques: showMosques.value
      })

      // Handle migrant centers layer
      if (showMigrantCenters.value) {
        showMigrantCentersOnMap()
      } else if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      // Handle QPV layer
      if (showQpv.value) {
        if (!qpvLayer) {
          loadQpvLayer()
        } else if (!map.hasLayer(qpvLayer)) {
          qpvLayer.addTo(map)
        }
      } else if (qpvLayer && map.hasLayer(qpvLayer)) {
        map.removeLayer(qpvLayer)
      }

      // Handle mosque layer
      if (showMosques.value) {
        showMosquesOnMap()
      } else if (mosqueLayer && map.hasLayer(mosqueLayer)) {
        map.removeLayer(mosqueLayer)
      }
    }

    // ==================== SELECTED LOCATION MANAGEMENT ====================

    // Set selected location and create arrows to closest locations
    const setSelectedLocation = (lat, lng, address = null) => {
      // Clear existing marker and arrows
      if (selectedMarker) {
        map.removeLayer(selectedMarker)
      }
      clearArrows()

      // Add new marker with click handler
      const popupContent = `
        <div>
          <strong>${address || `${isEnglish.value ? labels.position.en : labels.position.fr} ${lat.toFixed(4)}, ${lng.toFixed(4)}`}</strong><br>
          <button onclick="window.removePositionMarker()" style="
            margin-top: 8px;
            padding: 4px 8px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">${isEnglish.value ? labels.removePosition.en : labels.removePosition.fr}</button>
        </div>
      `

      selectedMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(popupContent)

      // Center map on location
      map.setView([lat, lng], Math.max(map.getZoom(), 10))

      // Create arrows to closest locations
      createArrowsToClosest(lat, lng)
    }

    // Create arrows pointing to closest locations of each type
    const createArrowsToClosest = (lat, lng) => {
      try {
        const closestLocations = []

        // Find closest migrant center (only if migrant centers are shown)
        if (props.overlayStates.showMigrantCenters && props.migrantCentersData.length > 0) {
          const migrantCentersWithDistances = props.migrantCentersData
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
            closestLocations.push(closest)
          }
        }

        // Find closest QPV (only if QPVs are shown)
        if (props.overlayStates.showQpv && props.qpvData && props.qpvData.geojson && props.qpvData.geojson.features) {
          const allQpvs = props.qpvData.geojson.features.map(feature => {
            if (!feature || !feature.properties) return null

            // Skip overseas territories
            if (!isMetropolitan(feature.properties.insee_dep)) return null

            // Calculate centroid from geometry
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
            closestLocations.push(closest)
          }
        }

        // Find closest mosque (only if mosques are shown)
        if (props.overlayStates.showMosques && props.mosquesData.length > 0) {
          const mosquesWithDistances = props.mosquesData
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
            closestLocations.push(closest)
          }
        }

        // Create arrows for each closest location
        closestLocations.forEach(location => {
          createArrowToLocation(lat, lng, location)
        })

      } catch (error) {
        console.error('Error creating arrows to closest locations:', error)
      }
    }

    // Clear all arrow layers
    const clearArrows = () => {
      arrowLayers.forEach(layer => {
        map.removeLayer(layer)
      })
      arrowLayers = []
    }

    // Create an arrow pointing from selected location to target location
    const createArrowToLocation = (fromLat, fromLng, location) => {
      const fromPoint = [fromLat, fromLng]

      // Calculate direction vector
      const deltaLat = location.latitude - fromLat
      const deltaLng = location.longitude - fromLng
      const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)

      // Stop arrow just before the destination marker (about 80% of the way)
      const stopRatio = 0.8
      const endLat = fromLat + (deltaLat * stopRatio)
      const endLng = fromLng + (deltaLng * stopRatio)
      const endPoint = [endLat, endLng]

      // Determine arrow color based on location type
      let arrowColor = '#000000' // Black for migrant centers (consistent with icon)
      if (location.type === 'qpv') arrowColor = isInclusive.value ? '#0000ff' : '#ff0000'
      if (location.type === 'mosque') arrowColor = '#2e7d32'

      // Create polyline arrow
      const arrowLine = L.polyline([fromPoint, endPoint], {
        color: arrowColor,
        weight: 3,
        opacity: 0.8
      }).addTo(map)

      // Calculate angle for arrow head (pointing toward destination)
      const angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI

      const arrowHead = L.marker(endPoint, {
        icon: L.divIcon({
          html: `<div style="
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 16px solid ${arrowColor};
            transform: rotate(${angle}deg);
            transform-origin: center bottom;
          "></div>`,
          className: 'arrow-head',
          iconSize: [16, 16],
          iconAnchor: [8, 16]
        })
      }).addTo(map)

      // Format distance
      const formattedDistance = formatDistance(location.distance)

      // Create distance label at midpoint of the visible arrow
      const midPoint = [
        (fromLat + endLat) / 2,
        (fromLng + endLng) / 2
      ]

      const distanceLabel = L.marker(midPoint, {
        icon: L.divIcon({
          html: `<div style="
            background: white;
            padding: 2px 6px;
            border: 1px solid ${arrowColor};
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: ${arrowColor};
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            width: max-content;
            text-align: center;
          ">${formattedDistance}</div>`,
          className: 'distance-label',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        })
      }).addTo(map)

      // Store layers for cleanup
      arrowLayers.push(arrowLine, arrowHead, distanceLabel)

      // Add popup to arrow line
      let locationName
      if (location.type === 'migrant') {
        locationName = `${isEnglish.value ? labels.migrantCenter.en : labels.migrantCenter.fr} - ${location.commune || 'N/A'}`
      } else if (location.type === 'qpv') {
        locationName = `${isEnglish.value ? labels.qpvLabel.en : labels.qpvLabel.fr} ${location.lib_qp || location.code_qp || 'N/A'}`
      } else if (location.type === 'mosque') {
        locationName = `${location.name || (isEnglish.value ? labels.mosque.en : labels.mosque.fr)} - ${location.commune || 'N/A'}`
      }

      arrowLine.bindPopup(
        `<strong>${locationName}</strong><br>` +
        `<strong>${isEnglish.value ? labels.distance.en : labels.distance.fr}</strong> ${formattedDistance}` +
        (location.type === 'migrant'
          ? `<br><strong>${isEnglish.value ? labels.type.en : labels.type.fr}</strong> ${location.type_centre || location.type || 'N/A'} | <strong>${isEnglish.value ? labels.places.en : labels.places.fr}</strong> ${location.places || 'N/A'} | <strong>${isEnglish.value ? labels.manager.en : labels.manager.fr}</strong> ${location.gestionnaire || 'N/A'}`
          : location.type === 'qpv'
          ? `<br><strong>${isEnglish.value ? labels.commune.en : labels.commune.fr}</strong> ${location.lib_com || 'N/A'}` +
            `<br><strong>${isEnglish.value ? labels.departement.en : labels.departement.fr}</strong> ${location.lib_dep || 'N/A'}`
          : location.type === 'mosque'
          ? `<br><strong>${isEnglish.value ? labels.name.en : labels.name.fr}</strong> ${location.name || (isEnglish.value ? labels.mosque.en : labels.mosque.fr)}` +
            `<br><strong>${isEnglish.value ? labels.address.en : labels.address.fr}</strong> ${location.address || 'N/A'}` +
            `<br><strong>${isEnglish.value ? labels.commune.en : labels.commune.fr}</strong> ${location.commune || 'N/A'}`
          : ''
        )
      )
    }

    // Function to remove position marker and arrows
    const removeSelectedLocation = () => {
      if (selectedMarker) {
        map.removeLayer(selectedMarker)
        selectedMarker = null
      }
      clearArrows()
    }

    // Make removeSelectedLocation globally available for popup button
    window.removePositionMarker = removeSelectedLocation

    // Watch for prop changes to update layers
    watch(() => props.migrantCentersData, (newData) => {
      if (showMigrantCenters.value) {
        showMigrantCentersOnMap()
      }
    }, { deep: true })

    watch(() => props.mosquesData, (newData) => {
      if (showMosques.value) {
        showMosquesOnMap()
      }
    }, { deep: true })

    watch(() => props.qpvData, (newData) => {
      if (showQpv.value) {
        loadQpvLayer()
      }
    }, { deep: true })

    watch(() => props.selectedLocation, (newLocation) => {
      if (newLocation) {
        setSelectedLocation(newLocation.lat, newLocation.lng, newLocation.address)
      } else {
        removeSelectedLocation()
      }
    })

    // Lifecycle
    onMounted(() => {
      initMap()
    })

    onUnmounted(() => {
      if (map) {
        map.remove()
      }
    })

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
.map-container {
  margin-bottom: 30px;
}

.localisation-map {
  height: 600px;
  width: 100%;
  border-radius: 8px;
}

.map-overlay-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 999;
  max-width: 200px;
}

/* Custom marker styles */
:deep(.custom-div-icon) {
  border: none;
  background: transparent;
}

:deep(.migration-icon) {
  border: none;
  background: transparent;
}

:deep(.arrow-head) {
  border: none;
  background: transparent;
}

:deep(.distance-label) {
  border: none;
  background: transparent;
}

:deep(.mosque-icon) {
  border: none;
  background: transparent;
}

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

@media (max-width: 768px) {
  .localisation-map {
    height: 400px;
  }
}
</style>