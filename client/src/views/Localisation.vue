<template>
  <div class="localisation-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>Localisation des QPV, centres de migrants et mosquées</h1>
    </div>

    <!-- Main Content Layout -->
    <v-row>
      <!-- Map Section (8/12 columns) -->
      <v-col cols="12" md="8">
        <div class="map-section">
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
                    <span class="text-subtitle-2">Affichage des lieux</span>
                    <v-icon size="16">{{ overlayExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                  </v-card-title>
                  <v-expand-transition>
                    <v-card-text v-show="overlayExpanded" class="pa-2 pt-0">
                      <v-checkbox
                        v-model="showQpv"
                        label="Quartiers QPV"
                        density="compact"
                        hide-details
                        @change="onOverlayToggle"
                      >
                        <template v-slot:prepend>
                          <div style="
                            background: #ff0000;
                            border: 2px solid #cc0000;
                            width: 16px;
                            height: 16px;
                            margin-right: 4px;
                          "></div>
                        </template>
                      </v-checkbox>
                      <v-checkbox
                        v-model="showMigrantCenters"
                        label="Centres de migrants"
                        density="compact"
                        hide-details
                        @change="onOverlayToggle"
                      >
                        <template v-slot:prepend>
                          <div style="
                            background: #000000;
                            color: white;
                            border-radius: 50%;
                            width: 16px;
                            height: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            font-weight: bold;
                            margin-right: 4px;
                            border: 1px solid #333333;
                          ">↑</div>
                        </template>
                      </v-checkbox>
                      <v-checkbox
                        v-model="showMosques"
                        label="Mosquées"
                        density="compact"
                        hide-details
                        @change="onOverlayToggle"
                      >
                        <template v-slot:prepend>
                          <div style="
                            background: #2e7d32;
                            color: white;
                            border-radius: 50%;
                            width: 16px;
                            height: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            font-weight: bold;
                            margin-right: 4px;
                            border: 1px solid #1b5e20;
                          ">🕌</div>
                        </template>
                      </v-checkbox>
                    </v-card-text>
                  </v-expand-transition>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-col>

      <!-- Controls and Distance Information Section (4/12 columns) -->
      <v-col cols="12" md="4">
        <!-- Controls Section -->
        <div class="controls-section mb-4">
          <v-card class="pa-4">
            <v-card-title class="pa-0 mb-3 text-h5">
              Recherche
            </v-card-title>
            <v-text-field
              v-model="addressInput"
              label="Rechercher une adresse"
              placeholder="Ex: 123 Rue de la Paix, Paris"
              variant="outlined"
              density="compact"
              append-inner-icon="mdi-magnify"
              @click:append-inner="searchAddress"
              @keyup.enter="searchAddress"
              :loading="searchingAddress"
              class="mb-3"
            />
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-crosshairs-gps"
              @click="getCurrentLocation"
              :loading="gettingLocation"
              block
            >
              Ma position
            </v-btn>
          </v-card>
        </div>

        <!-- Distance Information -->
        <div v-if="selectedLocation && distanceInfo" class="distance-info mb-4">
          <v-card class="pa-4">
            <h4 class="mb-3">Votre position est à:</h4>

            <!-- QPV Distance -->
            <div v-if="distanceInfo.qpv" class="mt-2">
              <div 
                class="distance-summary cursor-pointer d-flex align-center"
                @click="distanceInfo.qpv.expanded = !distanceInfo.qpv.expanded"
              >
                <div style="
                  display: inline-block;
                  background: #ff0000;
                  border: 2px solid #cc0000;
                  width: 18px;
                  height: 18px;
                  margin-right: 8px;
                  vertical-align: middle;
                "></div>
                <strong>{{ distanceInfo.qpv.distance }}&nbsp;</strong>du QPV le plus proche
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
                  <strong>QPV:</strong> <a :href="distanceInfo.qpv.link" target="_blank">{{ distanceInfo.qpv.name }}</a><br>
                  <strong>Commune:</strong> {{ distanceInfo.qpv.commune }}
                </div>
              </v-expand-transition>
            </div>

            <!-- Migrant Center Distance -->
            <div v-if="distanceInfo.migrantCenter" class="mt-2">
              <div 
                class="distance-summary cursor-pointer d-flex align-center"
                @click="distanceInfo.migrantCenter.expanded = !distanceInfo.migrantCenter.expanded"
              >
                <div style="
                  display: inline-flex;
                  background: #000000;
                  color: white;
                  border-radius: 50%;
                  width: 18px;
                  height: 18px;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: bold;
                  margin-right: 8px;
                  border: 1px solid #333333;
                  vertical-align: middle;
                ">↑</div>
                <strong>{{ distanceInfo.migrantCenter.distance }}&nbsp;</strong>du centre de migrants le plus proche
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
                  <strong>Type:</strong> {{ distanceInfo.migrantCenter.type }} | <strong>Places:</strong> {{ distanceInfo.migrantCenter.places }} | <strong>Gestionnaire:</strong> {{ distanceInfo.migrantCenter.gestionnaire }}<br>
                  <strong>Adresse:</strong> {{ distanceInfo.migrantCenter.address }}<br>
                  <strong>Commune:</strong> {{ distanceInfo.migrantCenter.commune }}
                </div>
              </v-expand-transition>
            </div>

            <!-- Mosque Distance -->
            <div v-if="distanceInfo.mosque" class="mt-2">
              <div 
                class="distance-summary cursor-pointer d-flex align-center"
                @click="distanceInfo.mosque.expanded = !distanceInfo.mosque.expanded"
              >
                <div style="
                  display: inline-flex;
                  background: #2e7d32;
                  color: white;
                  border-radius: 50%;
                  width: 18px;
                  height: 18px;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: bold;
                  margin-right: 8px;
                  border: 1px solid #1b5e20;
                  vertical-align: middle;
                ">🕌</div>
                <strong>{{ distanceInfo.mosque.distance }}&nbsp;</strong>de la mosquée la plus proche
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
                  <strong>Adresse:</strong> {{ distanceInfo.mosque.address }}<br>
                  <strong>Commune:</strong> {{ distanceInfo.mosque.commune }}
                </div>
              </v-expand-transition>
            </div>

            <div v-if="!distanceInfo.migrantCenter && !distanceInfo.qpv && !distanceInfo.mosque" class="text-grey">
              Aucune donnée disponible pour cette position
            </div>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import L from 'leaflet'
import 'leaflet.fullscreen'
import 'leaflet.fullscreen/Control.FullScreen.css'
import api from '../services/api.js'

// Shared constant for overseas departments
const OVERSEAS_DEPARTMENTS = ['971', '972', '973', '974', '976']

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

export default {
  name: 'Localisation',
  setup() {
    // Reactive data
    const addressInput = ref('')
    const selectedLocation = ref(null)
    const searchingAddress = ref(false)
    const gettingLocation = ref(false)
    const showMigrantCenters = ref(false)
    const showQpv = ref(true)
    const showMosques = ref(false)
    const distanceInfo = ref(null)
    const overlayExpanded = ref(true)
    // UI state only
    const showFilters = ref(true)

    // Computed for English state
    const isEnglish = computed(() => {
      // Access store through a global or import if needed
      return false // Default to false for now, can be enhanced later
    })

    // Map instance
    let map = null
    let selectedMarker = null
    let arrowLayers = []
    let qpvLayer = null
    let migrantCentersLayer = null
    let mosqueLayer = null
    let allMigrantCenters = []
    let allQpvs = []
    let allMosques = []

    // Distance calculation (Haversine formula)
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



    // Initialize map
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

      // Add fullscreen control
      map.addControl(new L.control.fullscreen({
        position: 'topleft'
      }))

      // Add click handler
      map.on('click', onMapClick)

      // Add zoom handler for updating icons
      map.on('zoomend', updateAllIcons)

      // Load QPV layer by default since showQpv is true by default
      if (showQpv.value) {
        await loadQpvLayer()
      }
    }

    // Handle map click
    const onMapClick = (e) => {
      setSelectedLocation(e.latlng.lat, e.latlng.lng)
    }

    // Set selected location and create arrows to closest locations
    const setSelectedLocation = async (lat, lng, address = null) => {
      selectedLocation.value = { lat, lng, address }

      // Clear existing marker and arrows
      if (selectedMarker) {
        map.removeLayer(selectedMarker)
      }
      clearArrows()

      // Add new marker with click handler
      const popupContent = `
        <div>
          <strong>${address || `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`}</strong><br>
          <button onclick="window.removePositionMarker()" style="
            margin-top: 8px;
            padding: 4px 8px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">Supprimer la position</button>
        </div>
      `

      selectedMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(popupContent)

      // Center map on location
      map.setView([lat, lng], Math.max(map.getZoom(), 10))

      // Create arrows to closest locations and calculate distance info
      await createArrowsToClosest(lat, lng)
    }

    // Create arrows pointing to closest locations of each type
    const createArrowsToClosest = async (lat, lng) => {
      try {
        const closestLocations = []
        const newDistanceInfo = {}

        // Find closest migrant center (only if migrant centers are shown)
        if (showMigrantCenters.value && allMigrantCenters.length > 0) {
          const migrantCentersWithDistances = allMigrantCenters
            .filter(center => center.latitude && center.longitude &&
                            !isNaN(parseFloat(center.latitude)) &&
                            !isNaN(parseFloat(center.longitude)))
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

            const formattedDistance = closest.distance < 1
              ? `${Math.round(closest.distance * 1000)}m`
              : `${closest.distance.toFixed(1)}km`

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

        // Find closest QPV (only if QPVs are shown)
        if (showQpv.value && qpvLayer) {
          let closestQpv = null
          let minDistance = Infinity

          qpvLayer.eachLayer((layer) => {
            const feature = layer.feature
            if (!feature || !feature.properties) return

            // Calculate distance to closest point on this QPV polygon
            const distanceToPolygon = getDistanceToPolygon(lat, lng, feature.geometry)

            if (distanceToPolygon < minDistance) {
              minDistance = distanceToPolygon
              const centroid = calculateGeometryCentroid(feature.geometry)
              closestQpv = {
                ...feature.properties,
                latitude: centroid ? centroid.lat : null,
                longitude: centroid ? centroid.lng : null,
                distance: distanceToPolygon,
                type: 'qpv'
              }
            }
          })

          if (closestQpv) {
            closestLocations.push(closestQpv)

            const formattedDistance = closestQpv.distance < 1
              ? `${Math.round(closestQpv.distance * 1000)}m`
              : `${closestQpv.distance.toFixed(1)}km`

            newDistanceInfo.qpv = {
              distance: formattedDistance,
              name: closestQpv.lib_qp || closestQpv.code_qp || 'N/A',
              link: `https://sig.ville.gouv.fr/territoire/${closestQpv.code_qp}`,
              commune: closestQpv.lib_com || 'N/A',
              expanded: false
            }
          }
        }

        // Find closest mosque (only if mosques are shown)
        if (showMosques.value && allMosques.length > 0) {
          const mosquesWithDistances = allMosques
            .filter(mosque => mosque.latitude && mosque.longitude &&
                              !isNaN(parseFloat(mosque.latitude)) &&
                              !isNaN(parseFloat(mosque.longitude)))
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

            const formattedDistance = closest.distance < 1
              ? `${Math.round(closest.distance * 1000)}m`
              : `${closest.distance.toFixed(1)}km`

            newDistanceInfo.mosque = {
              distance: formattedDistance,
              name: closest.name || 'Mosquée',
              address: closest.address || 'N/A',
              commune: closest.commune || 'N/A',
              expanded: false
            }
          }
        }

        // Update distance info
        distanceInfo.value = newDistanceInfo

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

      let targetLat = location.latitude
      let targetLng = location.longitude

      // For QPV, find the actual closest point on the polygon boundary
      if (location.type === 'qpv' && qpvLayer) {
        const closestPoint = findClosestPointOnQpvPolygon(fromLat, fromLng, location)
        if (closestPoint) {
          targetLat = closestPoint.lat
          targetLng = closestPoint.lng
        }
      }

      // Calculate direction vector
      const deltaLat = targetLat - fromLat
      const deltaLng = targetLng - fromLng
      const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)

      // Stop arrow just before the destination (about 80% of the way)
      const stopRatio = 0.8
      const endLat = fromLat + (deltaLat * stopRatio)
      const endLng = fromLng + (deltaLng * stopRatio)
      const endPoint = [endLat, endLng]

      // Determine arrow color based on location type
      let arrowColor = '#000000' // Black for migrant centers (consistent with icon)
      if (location.type === 'qpv') arrowColor = '#ff0000'
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
      const formattedDistance = location.distance < 1
        ? `${Math.round(location.distance * 1000)}m`
        : `${location.distance.toFixed(1)}km`

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
        locationName = `Centre de migrants - ${location.commune || 'N/A'}`
      } else if (location.type === 'qpv') {
        locationName = `QPV - ${location.lib_qp || location.code_qp || 'N/A'}`
      } else if (location.type === 'mosque') {
        locationName = `${location.name || 'Mosquée'} - ${location.commune || 'N/A'}`
      }

      arrowLine.bindPopup(`
        <strong>${locationName}</strong><br>
        <strong>Distance:</strong> ${formattedDistance}
        ${location.type === 'migrant'
          ? `<br><strong>Type:</strong> ${location.type_centre || location.type || 'N/A'} | <strong>Places:</strong> ${location.places || 'N/A'} | <strong>Gestionnaire:</strong> ${location.gestionnaire || 'N/A'}`
          : location.type === 'qpv'
          ? `<br><strong>Commune:</strong> ${location.lib_com || 'N/A'}
             <br><strong>Département:</strong> ${location.lib_dep || 'N/A'}`
          : location.type === 'mosque'
          ? `<br><strong>Nom:</strong> ${location.name || 'Mosquée'}
             <br><strong>Adresse:</strong> ${location.address || 'N/A'}
             <br><strong>Commune:</strong> ${location.commune || 'N/A'}`
          : ''
        }
      `)
    }

    // Handle overlay toggle changes
    const onOverlayToggle = async () => {
      // Handle migrant centers layer
      if (showMigrantCenters.value) {
        if (allMigrantCenters.length === 0) {
          await loadMigrantCenters()
        }
        showMigrantCentersOnMap()
      } else if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      // Handle QPV layer
      if (showQpv.value) {
        if (!qpvLayer) {
          await loadQpvLayer()
        } else if (!map.hasLayer(qpvLayer)) {
          qpvLayer.addTo(map)
        }
      } else if (qpvLayer && map.hasLayer(qpvLayer)) {
        map.removeLayer(qpvLayer)
      }

      // Handle mosque layer
      if (showMosques.value) {
        if (allMosques.length === 0) {
          await loadMosques()
        }
        showMosquesOnMap()
      } else if (mosqueLayer && map.hasLayer(mosqueLayer)) {
        map.removeLayer(mosqueLayer)
      }

      // Refresh arrows if a location is selected
      if (selectedLocation.value) {
        clearArrows()
        createArrowsToClosest(selectedLocation.value.lat, selectedLocation.value.lng)
      }
    }



    // Search address using geocoding
    const searchAddress = async () => {
      if (!addressInput.value.trim()) return

      searchingAddress.value = true
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput.value)}&limit=1&countrycodes=fr`
        )
        const data = await response.json()

        if (data && data.length > 0) {
          const result = data[0]
          await setSelectedLocation(
            parseFloat(result.lat),
            parseFloat(result.lon),
            result.display_name
          )
        } else {
          alert('Adresse non trouvée. Veuillez essayer une autre adresse.')
        }
      } catch (error) {
        console.error('Error searching address:', error)
        alert('Erreur lors de la recherche d\'adresse.')
      } finally {
        searchingAddress.value = false
      }
    }

    // Get current location
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par ce navigateur.')
        return
      }

      gettingLocation.value = true
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await setSelectedLocation(
            position.coords.latitude,
            position.coords.longitude,
            'Ma position actuelle'
          )
          gettingLocation.value = false
        },
        (error) => {
          console.error('Error getting location:', error)
          alert('Erreur lors de la géolocalisation. Veuillez vérifier vos paramètres de localisation.')
          gettingLocation.value = false
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    // Load migrant centers data
    const loadMigrantCenters = async () => {
      try {
        const response = await api.getMigrants({ limit: 1500 })
        if (response && response.list) {
          // Filter to metropolitan France only (exclude overseas territories)
          allMigrantCenters = response.list.filter(center =>
            center.latitude && center.longitude &&
            !isNaN(parseFloat(center.latitude)) &&
            !isNaN(parseFloat(center.longitude)) &&
            !OVERSEAS_DEPARTMENTS.includes(center.departement)
          )
          console.log('Loaded migrant centers:', allMigrantCenters.length)
        }
      } catch (error) {
        console.error('Error loading migrant centers:', error)
      }
    }

    // Create migration symbol icon based on zoom level
    const createMigrationIcon = (zoom) => {
      let size = 12
      if (zoom >= 8) size = 14
      if (zoom >= 10) size = 16
      if (zoom >= 12) size = 20
      if (zoom >= 14) size = 24

      return L.divIcon({
        html: `<div style="
          background: #000000;
          color: white;
          border-radius: 50%;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${Math.max(12, size - 4)}px;
          border: 2px solid #333333;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">↑</div>`,
        className: 'migration-icon',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      })
    }

    // Show migrant centers on map
    const showMigrantCentersOnMap = () => {
      if (!map || !allMigrantCenters.length) return

      if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      const currentZoom = map.getZoom()
      migrantCentersLayer = L.layerGroup()

      allMigrantCenters.forEach(center => {
        const marker = L.marker([parseFloat(center.latitude), parseFloat(center.longitude)], {
          icon: createMigrationIcon(currentZoom)
        })
        .bindPopup(`
          <strong>Centre de migrants</strong><br>
          <strong>Type:</strong> ${center.type_centre || center.type || 'N/A'} | <strong>Places:</strong> ${center.places || 'N/A'} | <strong>Gestionnaire:</strong> ${center.gestionnaire || 'N/A'}<br>
          <strong>Commune:</strong> ${center.commune || 'N/A'}<br>
          <strong>Département:</strong> ${center.departement || 'N/A'}<br>
          <strong>Adresse:</strong> ${center.adresse || 'N/A'}
        `)

        migrantCentersLayer.addLayer(marker)
      })

      migrantCentersLayer.addTo(map)
    }

    // Create mosque symbol icon based on zoom level
    const createMosqueIcon = (zoom) => {
      let size = 12
      if (zoom >= 8) size = 14
      if (zoom >= 10) size = 16
      if (zoom >= 12) size = 20
      if (zoom >= 14) size = 24

      return L.divIcon({
        html: `<div style="
          background: #2e7d32;
          color: white;
          border-radius: 50%;
          width: ${size}px;
          height: ${size}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${Math.max(12, size - 4)}px;
          border: 2px solid #1b5e20;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">🕌</div>`,
        className: 'mosque-icon',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      })
    }

    // Show mosques on map
    const showMosquesOnMap = async () => {
      if (!map || !allMosques.length) return

      if (mosqueLayer) {
        map.removeLayer(mosqueLayer)
      }

      const currentZoom = map.getZoom()
      mosqueLayer = L.layerGroup()

      allMosques.forEach(mosque => {
        const marker = L.marker([parseFloat(mosque.latitude), parseFloat(mosque.longitude)], {
          icon: createMosqueIcon(currentZoom)
        })
        .bindPopup(`
          <strong>${mosque.name || 'Mosquée'}</strong><br>
          <strong>Adresse:</strong> ${mosque.address || 'N/A'}<br>
          <strong>Commune:</strong> ${mosque.commune || 'N/A'}<br>
          <strong>Latitude:</strong> ${mosque.latitude.toFixed(4)}<br>
          <strong>Longitude:</strong> ${mosque.longitude.toFixed(4)}
        `)
        mosqueLayer.addLayer(marker)
      })

      mosqueLayer.addTo(map)
    }


    // Update migrant center icon sizes on zoom
    const updateMigrantCenterIcons = () => {
      if (!migrantCentersLayer || !map) return

      const currentZoom = map.getZoom()
      migrantCentersLayer.eachLayer(layer => {
        if (layer.setIcon) {
          layer.setIcon(createMigrationIcon(currentZoom))
        }
      })
    }

    // Update mosque icon sizes on zoom
    const updateMosqueIcons = () => {
      if (!mosqueLayer || !map) return

      const currentZoom = map.getZoom()
      mosqueLayer.eachLayer(layer => {
        if (layer.setIcon) {
          layer.setIcon(createMosqueIcon(currentZoom))
        }
      })
    }

    // Update all icon sizes on zoom
    const updateAllIcons = () => {
      updateMigrantCenterIcons()
      updateMosqueIcons()
    }


    // Load QPV GeoJSON layer
    const loadQpvLayer = async () => {
      try {
        const response = await api.getQpvs()
        if (response && response.geojson && response.geojson.features) {
          // Store QPV data with calculated centroids for arrow creation
          allQpvs = response.geojson.features.map(feature => {
            if (!feature || !feature.properties) return null;

            // Skip overseas territories
            if (OVERSEAS_DEPARTMENTS.includes(feature.properties.insee_dep)) return null;

            // Calculate centroid from geometry
            const centroid = calculateGeometryCentroid(feature.geometry)
            if (!centroid) return null;

            return {
              ...feature.properties,
              latitude: centroid.lat,
              longitude: centroid.lng
            }
          }).filter(qpv => qpv !== null)

          qpvLayer = L.geoJSON(response.geojson, {
            style: () => ({
              fillColor: '#ff0000',
              color: '#cc0000',
              weight: 1,
              fillOpacity: 0.4,
              opacity: 0.8
            }),
            onEachFeature: (feature, layer) => {
              if (!feature || !feature.properties) return;

              const qpvCode = feature.properties.code_qp || 'N/A'
              const qpvName = feature.properties.lib_qp || 'N/A'
              const commune = feature.properties.lib_com || 'N/A'
              const departement = feature.properties.lib_dep || 'N/A'

              layer.bindPopup(`
                <strong>QPV: ${qpvName}</strong><br>
                <strong>Code:</strong> ${qpvCode}<br>
                <strong>Commune:</strong> ${commune}<br>
                <strong>Département:</strong> ${departement}
              `)

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
                     !OVERSEAS_DEPARTMENTS.includes(feature.properties.insee_dep);
            }
          })

          qpvLayer.addTo(map)
          console.log('QPV layer loaded successfully')
        }
      } catch (error) {
        console.error('Error loading QPV layer:', error)
      }
    }

    // Load mosques data
    const loadMosques = async () => {
      try {
        const response = await api.getMosques()
        if (response && response.list) {
          // Filter to metropolitan France only (exclude overseas territories)
          allMosques = response.list
            .filter(mosque => 
              mosque.latitude && mosque.longitude &&
              !isNaN(parseFloat(mosque.latitude)) &&
              !isNaN(parseFloat(mosque.longitude)) &&
              !OVERSEAS_DEPARTMENTS.includes(mosque.departement)
            )
            .map(mosque => ({
              name: mosque.name,
              address: mosque.address,
              commune: mosque.commune,
              latitude: parseFloat(mosque.latitude),
              longitude: parseFloat(mosque.longitude)
            }))
          console.log('Loaded mosques:', allMosques.length)
        }
      } catch (error) {
        console.error('Error loading mosques:', error)
      }
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

    // Calculate distance from point to polygon (minimum distance to any point on polygon boundary)
    const getDistanceToPolygon = (pointLat, pointLng, geometry) => {
      try {
        let minDistance = Infinity

        const processCoordinateRing = (coordinates) => {
          for (let i = 0; i < coordinates.length - 1; i++) {
            const segmentDistance = getDistanceToLineSegment(
              pointLat, pointLng,
              coordinates[i][1], coordinates[i][0],
              coordinates[i + 1][1], coordinates[i + 1][0]
            )
            minDistance = Math.min(minDistance, segmentDistance)
          }
        }

        if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => processCoordinateRing(ring))
          })
        } else if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach(ring => processCoordinateRing(ring))
        }

        return minDistance
      } catch (error) {
        console.error('Error calculating distance to polygon:', error)
        return Infinity
      }
    }

    // Calculate distance from point to line segment
    const getDistanceToLineSegment = (px, py, x1, y1, x2, y2) => {
      // Convert to radians for more accurate calculation
      const toRad = (deg) => deg * Math.PI / 180

      px = toRad(px)
      py = toRad(py)
      x1 = toRad(x1)
      y1 = toRad(y1)
      x2 = toRad(x2)
      y2 = toRad(y2)

      // Calculate the closest point on the line segment
      const A = px - x1
      const B = py - y1
      const C = x2 - x1
      const D = y2 - y1

      const dot = A * C + B * D
      const lenSq = C * C + D * D

      let param = -1
      if (lenSq !== 0) {
        param = dot / lenSq
      }

      let xx, yy
      if (param < 0) {
        xx = x1
        yy = y1
      } else if (param > 1) {
        xx = x2
        yy = y2
      } else {
        xx = x1 + param * C
        yy = y1 + param * D
      }

      // Calculate distance using Haversine formula
      const R = 6371 // Earth's radius in km
      const dLat = px - xx
      const dLon = py - yy
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(xx) * Math.cos(px) *
                Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    // Find the closest point on a QPV polygon boundary for arrow targeting
    const findClosestPointOnQpvPolygon = (pointLat, pointLng, qpvLocation) => {
      let closestPoint = null
      let minDistance = Infinity

      qpvLayer.eachLayer((layer) => {
        const feature = layer.feature
        if (!feature || !feature.properties) return

        // Match the QPV by code
        if (feature.properties.code_qp !== qpvLocation.code_qp) return

        const geometry = feature.geometry

        const processCoordinateRing = (coordinates) => {
          for (let i = 0; i < coordinates.length - 1; i++) {
            const segmentClosestPoint = getClosestPointOnLineSegment(
              pointLat, pointLng,
              coordinates[i][1], coordinates[i][0],
              coordinates[i + 1][1], coordinates[i + 1][0]
            )

            const distance = calculateDistance(
              pointLat, pointLng,
              segmentClosestPoint.lat, segmentClosestPoint.lng
            )

            if (distance < minDistance) {
              minDistance = distance
              closestPoint = segmentClosestPoint
            }
          }
        }

        if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => processCoordinateRing(ring))
          })
        } else if (geometry.type === 'Polygon') {
          geometry.coordinates.forEach(ring => processCoordinateRing(ring))
        }
      })

      return closestPoint
    }

    // Get closest point on a line segment
    const getClosestPointOnLineSegment = (px, py, x1, y1, x2, y2) => {
      // Calculate the closest point on the line segment
      const A = px - x1
      const B = py - y1
      const C = x2 - x1
      const D = y2 - y1

      const dot = A * C + B * D
      const lenSq = C * C + D * D

      let param = -1
      if (lenSq !== 0) {
        param = dot / lenSq
      }

      let closestLat, closestLng
      if (param < 0) {
        closestLat = x1
        closestLng = y1
      } else if (param > 1) {
        closestLat = x2
        closestLng = y2
      } else {
        closestLat = x1 + param * C
        closestLng = y1 + param * D
      }

      return {
        lat: closestLat,
        lng: closestLng
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



    // Function to remove position marker and arrows
    const removePositionMarker = () => {
      if (selectedMarker) {
        map.removeLayer(selectedMarker)
        selectedMarker = null
      }
      clearArrows()
      selectedLocation.value = null
      distanceInfo.value = null
    }

    // Make removePositionMarker globally available for popup button
    window.removePositionMarker = removePositionMarker

    // Lifecycle
    onMounted(() => {
      initMap()
    })

    onUnmounted(() => {
      // Clean up global function
      delete window.removePositionMarker

      if (map) {
        map.remove()
      }
    })

    return {
      addressInput,
      selectedLocation,
      searchingAddress,
      gettingLocation,
      showMigrantCenters,
      showQpv,
      showMosques,
      distanceInfo,
      overlayExpanded,
      showFilters,
      isEnglish,
      searchAddress,
      getCurrentLocation,
      onOverlayToggle
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

.controls-section {
  /* Removed background and padding since it's now in a v-card */
}

.map-section {
  margin-bottom: 30px;
}

.localisation-map {
  height: 600px;
  width: 100%;
  border-radius: 8px;
}

.location-info {
  margin-top: 16px;
}

.results-section h3 {
  margin-bottom: 16px;
  color: #333;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.distance-cell {
  min-width: 100px;
}

.distance-info h4 {
  color: #333;
  font-weight: 500;
}

.distance-info .v-icon {
  vertical-align: middle;
}

.instructions {
  text-align: center;
  margin: 40px 0;
}

.no-results {
  margin: 20px 0;
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

@media (max-width: 768px) {
  .localisation-map {
    height: 400px;
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>