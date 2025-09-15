<template>
  <div class="localisation-container">
    <!-- Header Section -->
    <div class="header-section">
      <h1>Localisation des centres proches</h1>
    </div>

    <!-- Controls Section -->
    <div class="controls-section">
      <v-row class="align-center mb-4">
        <v-col cols="12" md="6">
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
          />
        </v-col>
        <v-col cols="12" md="6">
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
        </v-col>
      </v-row>
    </div>

    <!-- Map Section -->
    <div class="map-section">
      <v-card class="mb-4">
        <v-card-text class="pa-0 position-relative">
          <div id="localisationMap" class="localisation-map"></div>
          
          <!-- Map Overlay Controls -->
          <div class="map-overlay-controls">
            <v-card class="pa-2" elevation="2">
              <div class="text-subtitle-2 mb-2">Affichage des lieux</div>
              <v-checkbox
                v-model="showMigrantCenters"
                label="Centres de migrants"
                density="compact"
                hide-details
                @change="onOverlayToggle"
              ></v-checkbox>
              <v-checkbox
                v-model="showQpv"
                label="Quartiers Prioritaires (QPV)"
                density="compact"
                hide-details
                @change="onOverlayToggle"
              ></v-checkbox>
            </v-card>
          </div>
        </v-card-text>
      </v-card>

      <!-- Selected Location Info -->
      <div v-if="selectedLocation" class="location-info mb-4">
        <v-alert type="info" class="mb-0">
          <strong>Position sélectionnée:</strong> 
          {{ selectedLocation.address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` }}
        </v-alert>
      </div>
    </div>

    

    <!-- Instructions -->
    <div v-if="!selectedLocation" class="instructions">
      <v-card class="text-center pa-6">
        <v-icon size="64" color="grey-lighten-1">mdi-map-marker-question</v-icon>
        <h3 class="text-grey-darken-1 mt-4">Comment utiliser cette page</h3>
        <p class="text-grey">
          1. Saisissez une adresse dans le champ de recherche<br>
          2. Ou utilisez le bouton "Ma position" pour vous géolocaliser<br>
          3. Ou cliquez directement sur la carte pour choisir un point<br>
          4. Les 5 lieux les plus proches s'afficheront automatiquement
        </p>
      </v-card>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import api from '../services/api.js'

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
    const showMigrantCenters = ref(true)
    const showQpv = ref(false)

    // Map instance
    let map = null
    let selectedMarker = null
    let arrowLayers = []
    let qpvLayer = null
    let migrantCentersLayer = null
    let allMigrantCenters = []
    let allQpvs = []

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

    // Color coding for distances
    const getDistanceColor = (distance) => {
      if (distance <= 10) return 'red'
      if (distance <= 30) return 'orange'
      return 'grey'
    }

    // Initialize map
    const initMap = async () => {
      await nextTick()

      // Initialize map centered on France
      map = L.map('localisationMap').setView([46.603354, 1.888334], 6)

      // Add tile layer - using CartoDB for consistency and caching
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      // Add click handler
      map.on('click', onMapClick)

      // Add zoom handler for updating migrant center icons
      map.on('zoomend', updateMigrantCenterIcons)

      // Load layers
      await loadQpvLayer()
      await loadMigrantCenters()
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

      // Add new marker
      selectedMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(address || `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup()

      // Center map on location
      map.setView([lat, lng], Math.max(map.getZoom(), 10))

      // Create arrows to closest locations
      await createArrowsToClosest(lat, lng)
    }

    // Create arrows pointing to closest locations of each type
    const createArrowsToClosest = async (lat, lng) => {
      try {
        const closestLocations = []

        // Find closest migrant center
        if (allMigrantCenters.length > 0) {
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
            closestLocations.push(migrantCentersWithDistances[0])
          }
        }

        // Find closest QPV
        if (allQpvs.length > 0) {
          const qpvsWithDistances = allQpvs
            .filter(qpv => qpv.latitude && qpv.longitude && 
                          !isNaN(parseFloat(qpv.latitude)) && 
                          !isNaN(parseFloat(qpv.longitude)))
            .map(qpv => ({
              ...qpv,
              latitude: parseFloat(qpv.latitude),
              longitude: parseFloat(qpv.longitude),
              distance: calculateDistance(lat, lng, parseFloat(qpv.latitude), parseFloat(qpv.longitude)),
              type: 'qpv'
            }))
            .sort((a, b) => a.distance - b.distance)

          if (qpvsWithDistances.length > 0) {
            closestLocations.push(qpvsWithDistances[0])
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
      const toPoint = [location.latitude, location.longitude]
      
      // Create polyline arrow
      const arrowLine = L.polyline([fromPoint, toPoint], {
        color: location.type === 'migrant' ? '#424242' : '#ff0000',
        weight: 3,
        opacity: 0.8
      }).addTo(map)

      // Create arrow head using a marker
      const angle = Math.atan2(location.longitude - fromLng, location.latitude - fromLat) * 180 / Math.PI
      
      const arrowHead = L.marker(toPoint, {
        icon: L.divIcon({
          html: `<div style="
            width: 0; 
            height: 0; 
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 20px solid ${location.type === 'migrant' ? '#424242' : '#ff0000'};
            transform: rotate(${angle}deg);
            transform-origin: center;
          "></div>`,
          className: 'arrow-head',
          iconSize: [16, 20],
          iconAnchor: [8, 20]
        })
      }).addTo(map)

      // Format distance
      const formattedDistance = location.distance < 1 
        ? `${Math.round(location.distance * 1000)}m`
        : `${location.distance.toFixed(1)}km`

      // Create distance label
      const midPoint = [
        (fromLat + location.latitude) / 2,
        (fromLng + location.longitude) / 2
      ]
      
      const distanceLabel = L.marker(midPoint, {
        icon: L.divIcon({
          html: `<div style="
            background: white;
            padding: 2px 6px;
            border: 1px solid ${location.type === 'migrant' ? '#424242' : '#ff0000'};
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: ${location.type === 'migrant' ? '#424242' : '#ff0000'};
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          ">${formattedDistance}</div>`,
          className: 'distance-label',
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        })
      }).addTo(map)

      // Store layers for cleanup
      arrowLayers.push(arrowLine, arrowHead, distanceLabel)

      // Add popup to arrow line
      const locationName = location.type === 'migrant' 
        ? `Centre de migrants - ${location.commune || 'N/A'}`
        : `QPV - ${location.lib_qp || location.code_qp || 'N/A'}`
      
      arrowLine.bindPopup(`
        <strong>${locationName}</strong><br>
        <strong>Distance:</strong> ${formattedDistance}
        ${location.type === 'migrant' 
          ? `<br><strong>Places:</strong> ${location.places || 'N/A'}
             <br><strong>Type:</strong> ${location.type || 'N/A'}
             <br><strong>Gestionnaire:</strong> ${location.gestionnaire || 'N/A'}`
          : `<br><strong>Commune:</strong> ${location.lib_com || 'N/A'}
             <br><strong>Département:</strong> ${location.lib_dep || 'N/A'}`
        }
      `)
    }

    // Handle overlay toggle changes
    const onOverlayToggle = () => {
      // Handle migrant centers layer
      if (showMigrantCenters.value) {
        showMigrantCentersOnMap()
      } else if (migrantCentersLayer) {
        map.removeLayer(migrantCentersLayer)
      }

      // Handle QPV layer
      if (showQpv.value) {
        if (qpvLayer && !map.hasLayer(qpvLayer)) {
          qpvLayer.addTo(map)
        }
      } else if (qpvLayer && map.hasLayer(qpvLayer)) {
        map.removeLayer(qpvLayer)
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
          allMigrantCenters = response.list.filter(center => 
            center.latitude && center.longitude && 
            !isNaN(parseFloat(center.latitude)) && 
            !isNaN(parseFloat(center.longitude))
          )
          console.log('Loaded migrant centers:', allMigrantCenters.length)
          if (showMigrantCenters.value) {
            showMigrantCentersOnMap()
          }
        }
      } catch (error) {
        console.error('Error loading migrant centers:', error)
      }
    }

    // Create migration symbol icon based on zoom level
    const createMigrationIcon = (zoom) => {
      let size = 8
      if (zoom >= 10) size = 16
      if (zoom >= 12) size = 20
      if (zoom >= 14) size = 24
      
      return L.divIcon({
        html: `<div style="
          background: #424242; 
          color: white; 
          border-radius: 50%; 
          width: ${size}px; 
          height: ${size}px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-weight: bold; 
          font-size: ${Math.max(8, size - 4)}px;
          border: 2px solid #212121;
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
          <strong>Type:</strong> ${center.type || 'N/A'}<br>
          <strong>Places:</strong> ${center.places || 'N/A'}<br>
          <strong>Gestionnaire:</strong> ${center.gestionnaire || 'N/A'}<br>
          <strong>Commune:</strong> ${center.commune || 'N/A'}<br>
          <strong>Département:</strong> ${center.departement || 'N/A'}<br>
          <strong>Adresse:</strong> ${center.adresse || 'N/A'}
        `)
        
        migrantCentersLayer.addLayer(marker)
      })
      
      migrantCentersLayer.addTo(map)
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

    // Load QPV GeoJSON layer
    const loadQpvLayer = async () => {
      try {
        const response = await api.getQpvs()
        if (response && response.geojson && response.geojson.features) {
          // Store QPV data with calculated centroids for arrow creation
          allQpvs = response.geojson.features.map(feature => {
            if (!feature || !feature.properties) return null;
            
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
              // Only include features with valid geometry and properties
              return feature && feature.geometry && feature.properties;
            }
          })
          
          if (showQpv.value) {
            qpvLayer.addTo(map)
          }
          console.log('QPV layer loaded successfully')
        }
      } catch (error) {
        console.error('Error loading QPV layer:', error)
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
      addressInput,
      selectedLocation,
      searchingAddress,
      gettingLocation,
      showMigrantCenters,
      showQpv,
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
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.map-section {
  margin-bottom: 30px;
}

.localisation-map {
  height: 500px;
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

.instructions {
  text-align: center;
  margin: 40px 0;
}

.no-results {
  margin: 20px 0;
}

.map-overlay-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
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