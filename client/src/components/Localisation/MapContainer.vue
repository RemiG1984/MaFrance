<template>
  <div class="map-container">
    <v-card class="mb-4">
      <v-card-text class="pa-0 position-relative">
        <div id="localisationMap" class="localisation-map"></div>

        <LocationDataBox @cadastral-data-loaded="$emit('cadastral-data-loaded', $event)" />
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useDataStore } from '../../services/store.js'
import { useLocationStore } from './locationStore.js'
import L from 'leaflet'
import 'leaflet-fullscreen'
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css'
import LocationDataBox from './LocationDataBox.vue'

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


export default {
  name: 'MapContainer',
  props: {
    // Props no longer needed as data comes from store
  },
  emits: ['location-selected', 'cadastral-data-loaded'],
  components: {
    LocationDataBox
  },
  setup(props, { emit }) {
    const dataStore = useDataStore()
    const locationStore = useLocationStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    const isInclusive = computed(() => dataStore.labelState === 1)

    const labels = computed(() => ({
      qpvLabel: {
        en: 'QPV',
        fr: 'QPV'
      },
      qpv: {
        en: 'QPV Districts',
        fr: 'Quartiers QPV'
      },
      code: {
        en: 'Code',
        fr: 'Code'
      },
      commune: {
        en: 'Commune',
        fr: 'Commune'
      },
      departement: {
        en: 'Department',
        fr: 'Département'
      },
      migrantCenter: {
        en: 'Migrant Center',
        fr: 'Centre de migrants'
      },
      type: {
        en: 'Type',
        fr: 'Type'
      },
      places: {
        en: 'Places',
        fr: 'Places'
      },
      manager: {
        en: 'Manager',
        fr: 'Gestionnaire'
      },
      address: {
        en: 'Address',
        fr: 'Adresse'
      },
      mosque: {
        en: 'Mosque',
        fr: 'Mosquée'
      },
      latitude: {
        en: 'Latitude',
        fr: 'Latitude'
      },
      longitude: {
        en: 'Longitude',
        fr: 'Longitude'
      },
      position: {
        en: 'Position',
        fr: 'Position'
      },
      removePosition: {
        en: 'Remove Position',
        fr: 'Supprimer Position'
      },
      distance: {
        en: 'Distance',
        fr: 'Distance'
      },
      name: {
        en: 'Name',
        fr: 'Nom'
      },
      sectionID: {
        en: 'Section ID',
        fr: 'ID Section'
      },
      price: {
        en: 'Average Price',
        fr: 'Prix Moyen'
      },
      cog: {
        en: 'COG',
        fr: 'COG'
      }
    }))

    // ==================== REACTIVE DATA ====================

    // Layer visibility toggles - now computed from store
    const showMigrantCenters = computed(() => locationStore.overlayStates.showMigrantCenters)
    const showQpv = computed(() => locationStore.overlayStates.showQpv)
    const showMosques = computed(() => locationStore.overlayStates.showMosques)
    const showCadastral = computed(() => locationStore.overlayStates.cadastral)


    // ==================== MAP STATE ====================

    // Map instance and layers
    let map = null
    let qpvLayer = null
    let migrantCentersLayer = null
    let mosqueLayer = null
    let cadastralLayer = null

    // Map markers and layers
    let selectedMarker = null
    let arrowLayers = []

    // Current map zoom and center
    const currentZoom = ref(6)
    const currentCenter = ref({ lat: 46.603354, lng: 1.888334 })

    // ==================== UTILITY FUNCTIONS ====================

    // Format distance as "X.Xkm" or "XXXm"
    const formatDistance = (distance) => {
      return distance < 1
        ? `${Math.round(distance * 1000)}m`
        : `${distance.toFixed(1)}km`
    }

    // ==================== MAP MANAGEMENT ====================
    /**
     * Initialize the Leaflet map with default settings
     */
    const initMap = async () => {
      await nextTick()

      // Initialize map centered on France
      map = L.map('localisationMap').setView([currentCenter.value.lat, currentCenter.value.lng], currentZoom.value)

      // Set initial zoom and center values
      currentZoom.value = map.getZoom()
      const center = map.getCenter()
      currentCenter.value = { lat: center.lat, lng: center.lng }
      locationStore.setZoom(currentZoom.value)
      locationStore.setCenter(currentCenter.value)

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

      // Create custom panes for layer ordering
      const choroplethPane = map.createPane('choroplethPane', map.getPanes().overlayPane)
      choroplethPane.style.zIndex = 400

      const qpvPane = map.createPane('qpvPane', map.getPanes().overlayPane)
      qpvPane.style.zIndex = 500

      // Add fullscreen control if available
      if (L.control && L.control.fullscreen) {
        map.addControl(new L.control.fullscreen({
          position: "topleft"
        }))
      }

      // Add click handler
      map.on('click', onMapClick)

      // Add event handlers to update zoom and center
      map.on('zoomend', () => {
        currentZoom.value = map.getZoom()
        locationStore.setZoom(currentZoom.value)
      })

      map.on('moveend', () => {
        const center = map.getCenter()
        currentCenter.value = { lat: center.lat, lng: center.lng }
        locationStore.setCenter(currentCenter.value)
      })

    }

    // Handle map click
    const onMapClick = (e) => {
        locationStore.setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
    }

    // ==================== LAYER MANAGEMENT ====================

    /**
     * Display migrant centers as markers on the map
     */
    const showMigrantCentersOnMap = () => {
      if (!map || !locationStore.migrantCentersData.length) return

      if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      const currentZoom = map.getZoom()
      migrantCentersLayer = L.layerGroup()

      locationStore.migrantCentersData.forEach(center => {
        const marker = L.marker([parseFloat(center.latitude), parseFloat(center.longitude)], {
          icon: createIcon('migrant', currentZoom, isInclusive.value)
        })
        .bindPopup(
          `<strong>${isEnglish.value ? labels.value.migrantCenter.en : labels.value.migrantCenter.fr}</strong><br>` +
          `<strong>${isEnglish.value ? labels.value.type.en : labels.value.type.fr}</strong> ${center.type_centre || center.type || 'N/A'} | <strong>${isEnglish.value ? labels.value.places.en : labels.value.places.fr}</strong> ${center.places || 'N/A'} | <strong>${isEnglish.value ? labels.value.manager.en : labels.value.manager.fr}</strong> ${center.gestionnaire || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}</strong> ${center.commune || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.value.departement.en : labels.value.departement.fr}</strong> ${center.departement || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.value.address.en : labels.value.address.fr}</strong> ${center.adresse || 'N/A'}`
        )

        migrantCentersLayer.addLayer(marker)
      })

      migrantCentersLayer.addTo(map)
    }

    // Show mosques on map
    const showMosquesOnMap = () => {
      if (!map || !locationStore.mosquesData.length) return

      if (mosqueLayer) {
        map.removeLayer(mosqueLayer)
      }

      const currentZoom = map.getZoom()
      mosqueLayer = L.layerGroup()

      locationStore.mosquesData.forEach(mosque => {
        const marker = L.marker([parseFloat(mosque.latitude), parseFloat(mosque.longitude)], {
          icon: createIcon('mosque', currentZoom, isInclusive.value)
        })
        .bindPopup(
          `<strong>${mosque.name || (isEnglish.value ? labels.value.mosque.en : labels.value.mosque.fr)}</strong><br>` +
          `<strong>${isEnglish.value ? labels.value.address.en : labels.value.address.fr}</strong> ${mosque.address || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}</strong> ${mosque.commune || 'N/A'}<br>` +
          `<strong>${isEnglish.value ? labels.value.latitude.en : labels.value.latitude.fr}</strong> ${mosque.latitude.toFixed(4)}<br>` +
          `<strong>${isEnglish.value ? labels.value.longitude.en : labels.value.longitude.fr}</strong> ${mosque.longitude.toFixed(4)}`
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
      if (!locationStore.qpvData || !locationStore.qpvData.geojson || !locationStore.qpvData.geojson.features) return

      qpvLayer = L.geoJSON(locationStore.qpvData.geojson, {
        pane: 'qpvPane',
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
            `<strong>${isEnglish.value ? labels.value.qpvLabel.en : labels.value.qpvLabel.fr} ${qpvName}</strong><br>` +
            `<strong>${isEnglish.value ? labels.value.code.en : labels.value.code.fr}</strong> ${qpvCode}<br>` +
            `<strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}</strong> ${commune}<br>` +
            `<strong>${isEnglish.value ? labels.value.departement.en : labels.value.departement.fr}</strong> ${departement}`
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
                 locationStore.isMetropolitan(feature.properties.insee_dep)
        }
      })

      qpvLayer.addTo(map)
    }

    // Load cadastral GeoJSON layer
    const loadCadastralLayer = () => {
      try {
        if (!map) {
          return
        }

        if (!locationStore.cadastralData || !locationStore.cadastralData.sections) {
          return
        }

        if (cadastralLayer) {
          map.removeLayer(cadastralLayer)
        }

        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        const rgbToHex = (r, g, b) => {
          return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        };
        // Color function for choropleth
        const getColor = (price) => {
          const minPrice = locationStore.minPrice
          const maxPrice = locationStore.maxPrice
          if (price === null || price === undefined || minPrice === null || maxPrice === null) {
            return '#808080' // gray for null or no data
          }
          if (price < minPrice) {
            return '#4682B4' // lowColor for prices below min
          }
          if (price > maxPrice) {
            return '#DAA520' // highColor for prices above max
          }
          const ratio = (price - minPrice) / (maxPrice - minPrice)
          const lowColor = hexToRgb('#4682B4')
          const midColor = hexToRgb('#F0E68C')
          const highColor = hexToRgb('#DAA520')
          const interpolate = (color1, color2, t) => {
            return {
              r: Math.round(color1.r + (color2.r - color1.r) * t),
              g: Math.round(color1.g + (color2.g - color1.g) * t),
              b: Math.round(color1.b + (color2.b - color1.b) * t)
            }
          }
          let color;
          if (ratio <= 0.5) {
            color = interpolate(lowColor, midColor, ratio / 0.5)
          } else {
            color = interpolate(midColor, highColor, (ratio - 0.5) / 0.5)
          }
          return rgbToHex(color.r, color.g, color.b)
        }

        const features = locationStore.cadastralData.sections.map(section => ({
          type: 'Feature',
          properties: {
            sectionID: section.sectionID,
            cog: section.cog,
            communeName: section.communeName,
            price: section.price
          },
          geometry: { type: "Polygon", coordinates: [section.geometry] }
        }))

        const geoJsonData = {
          type: 'FeatureCollection',
          features: features
        }

        cadastralLayer = L.geoJSON(geoJsonData, {
          pane: 'choroplethPane',
          style: (feature) => {
            const mam = feature.properties.price
            return {
              fillColor: getColor(mam),
              color: '#000000',
              weight: 1,
              fillOpacity: 0.6,
              opacity: 0.8
            }
          },
          onEachFeature: (feature, layer) => {
            const sectionID = feature.properties.sectionID || 'N/A'
            const communeName = feature.properties.communeName || 'N/A'
            const mam = feature.properties.price
            const priceText = mam !== null && mam !== undefined ? `${mam.toLocaleString()}` : 'N/A'
            layer.bindPopup(`<strong>${isEnglish.value ? labels.value.sectionID.en : labels.value.sectionID.fr}:</strong> ${sectionID}<br><strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}:</strong> ${communeName}<br><strong>${isEnglish.value ? labels.value.price.en : labels.value.price.fr}:</strong> ${priceText} €/m²`)

            layer.on('mouseover', () => {
              layer.setStyle({
                fillOpacity: 0.8,
                weight: 2
              })
            })

            layer.on('mouseout', () => {
              const mam = feature.properties.price
              layer.setStyle({
                fillColor: getColor(mam),
                fillOpacity: 0.6,
                weight: 1
              })
            })
          }
        })

        cadastralLayer.addTo(map)

        map.invalidateSize()
      } catch (error) {
        console.error('loadCadastralLayer: Error occurred:', error)
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
          <strong>${address || `${isEnglish.value ? labels.value.position.en : labels.value.position.fr} ${lat.toFixed(4)}, ${lng.toFixed(4)}`}</strong><br>
          <button onclick="window.removePositionMarker()" style="
            margin-top: 8px;
            padding: 4px 8px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">${isEnglish.value ? labels.value.removePosition.en : labels.value.removePosition.fr}</button>
        </div>
      `

      selectedMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(popupContent)

      // Center map on location
      map.setView([lat, lng], Math.max(map.getZoom(), 10))
    }

    // Create arrows pointing to closest locations using provided closestLocations
    const createArrowsFromClosestLocations = (lat, lng, locations) => {
      if (!map) {
        console.log('Map not initialized yet, skipping arrow creation')
        return
      }
      clearArrows()
      try {
          // Create arrows for each closest location
          locations.forEach(location => {
            createArrowToLocation(lat, lng, location)
          })
      } catch (error) {
        console.error('Error creating arrows from closest locations:', error)
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
        locationName = `${isEnglish.value ? labels.value.migrantCenter.en : labels.value.migrantCenter.fr} - ${location.commune || 'N/A'}`
      } else if (location.type === 'qpv') {
        locationName = `${isEnglish.value ? labels.value.qpvLabel.en : labels.value.qpvLabel.fr} ${location.lib_qp || location.code_qp || 'N/A'}`
      } else if (location.type === 'mosque') {
        locationName = `${location.name || (isEnglish.value ? labels.value.mosque.en : labels.value.mosque.fr)} - ${location.commune || 'N/A'}`
      }

      arrowLine.bindPopup(
        `<strong>${locationName}</strong><br>` +
        `<strong>${isEnglish.value ? labels.value.distance.en : labels.value.distance.fr}</strong> ${formattedDistance}` +
        (location.type === 'migrant'
          ? `<br><strong>${isEnglish.value ? labels.value.type.en : labels.value.type.fr}</strong> ${location.type_centre || location.type || 'N/A'} | <strong>${isEnglish.value ? labels.value.places.en : labels.value.places.fr}</strong> ${location.places || 'N/A'} | <strong>${isEnglish.value ? labels.value.manager.en : labels.value.manager.fr}</strong> ${location.gestionnaire || 'N/A'}`
          : location.type === 'qpv'
          ? `<br><strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}</strong> ${location.lib_com || 'N/A'}` +
            `<br><strong>${isEnglish.value ? labels.value.departement.en : labels.value.departement.fr}</strong> ${location.lib_dep || 'N/A'}`
          : location.type === 'mosque'
          ? `<br><strong>${isEnglish.value ? labels.value.name.en : labels.value.name.fr}</strong> ${location.name || (isEnglish.value ? labels.value.mosque.en : labels.value.mosque.fr)}` +
            `<br><strong>${isEnglish.value ? labels.value.address.en : labels.value.address.fr}</strong> ${location.address || 'N/A'}` +
            `<br><strong>${isEnglish.value ? labels.value.commune.en : labels.value.commune.fr}</strong> ${location.commune || 'N/A'}`
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
      locationStore.clearLocation()
    }

    // Make removeSelectedLocation globally available for popup button
    window.removePositionMarker = removeSelectedLocation

    // Watch for store data changes to update layers
    watch(() => locationStore.migrantCentersData, (newData) => {
      if (showMigrantCenters.value) {
        showMigrantCentersOnMap()
      }
    }, { deep: true })

    watch(() => locationStore.mosquesData, (newData) => {
      if (showMosques.value) {
        showMosquesOnMap()
      }
    }, { deep: true })

    watch(() => locationStore.qpvData, (newData) => {
      if (showQpv.value) {
        loadQpvLayer()
      }
    }, { deep: true })

    watch(() => locationStore.selectedLocation, (newLocation) => {
      if (newLocation) {
            setSelectedLocation(newLocation.lat, newLocation.lng, newLocation.address)
      } else {
        removeSelectedLocation()
      }
    })

    watch(() => locationStore.closestLocations, (newClosestLocations) => {
      if (locationStore.selectedLocation && newClosestLocations && newClosestLocations.length > 0) {
            createArrowsFromClosestLocations(locationStore.selectedLocation.lat, locationStore.selectedLocation.lng, newClosestLocations)
      }
    }, { deep: true, immediate: true })

    watch(() => locationStore.cadastralData, (newData) => {
      if (newData && newData.sections) {
        loadCadastralLayer()
      } else if (cadastralLayer) {
        map.removeLayer(cadastralLayer)
        cadastralLayer = null
      }
    }, { deep: true })

    watch(() => locationStore.overlayStates.cadastral, async (newVal) => {
      if (newVal) {
        await nextTick()
        if (locationStore.cadastralData && locationStore.cadastralData.sections && locationStore.cadastralData.sections.length > 0) {
          loadCadastralLayer()
        }
      } else if (cadastralLayer) {
        map.removeLayer(cadastralLayer)
        cadastralLayer = null
      }
    })

    // Watch for boundary changes to update choropleth colors in real time
    watch(() => [locationStore.minPrice, locationStore.maxPrice], ([newMin, newMax]) => {
      if (locationStore.cadastralData && locationStore.cadastralData.sections && locationStore.cadastralData.sections.length > 0) {
        loadCadastralLayer()
      }
    })

    // Watchers for overlay toggles
    watch(showQpv, (newVal) => {
      if (newVal && locationStore.qpvData && locationStore.qpvData.geojson && locationStore.qpvData.geojson.features) {
        loadQpvLayer()
      } else if (!newVal && qpvLayer) {
        map.removeLayer(qpvLayer)
        qpvLayer = null
      }
    })

    watch(showMigrantCenters, (newVal) => {
      if (newVal && locationStore.migrantCentersData && locationStore.migrantCentersData.length > 0) {
        showMigrantCentersOnMap()
      } else if (!newVal && migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
        migrantCentersLayer = null
      }
    })

    watch(showMosques, (newVal) => {
      if (newVal && locationStore.mosquesData && locationStore.mosquesData.length > 0) {
        showMosquesOnMap()
      } else if (!newVal && mosqueLayer) {
        map.removeLayer(mosqueLayer)
        mosqueLayer = null
      }
    })

    // Lifecycle
    onMounted(() => {
      initMap()
      if (locationStore.cadastralData && locationStore.cadastralData.sections) {
        loadCadastralLayer()
      }
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
      showCadastral,
      isEnglish,
      isInclusive,
      labels,
      currentZoom,
      currentCenter,
      locationStore
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


@media (max-width: 768px) {
  .localisation-map {
    height: 400px;
  }
}
</style>