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

    <!-- Results Section -->
    <div v-if="nearbyPlaces.length > 0" class="results-section">
      <h3>Centres de migrants les plus proches</h3>
      <div class="table-container">
        <v-table>
          <thead>
            <tr>
              <th>Distance</th>
              <th>Type</th>
              <th>Places</th>
              <th>Gestionnaire</th>
              <th>Département</th>
              <th>Commune</th>
              <th>Adresse</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(place, index) in nearbyPlaces" :key="index">
              <td class="distance-cell">
                <v-chip :color="getDistanceColor(place.distance)" size="small">
                  {{ place.distance.toFixed(1) }} km
                </v-chip>
              </td>
              <td>{{ place.type || 'N/A' }}</td>
              <td>{{ place.places || 'N/A' }}</td>
              <td>{{ place.gestionnaire || 'N/A' }}</td>
              <td>{{ place.departement || 'N/A' }}</td>
              <td>{{ place.commune || 'N/A' }}</td>
              <td>{{ place.adresse || 'N/A' }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </div>

    <!-- No Results -->
    <div v-else-if="searchPerformed && selectedLocation" class="no-results">
      <v-alert type="warning">
        Aucun centre de migrants trouvé dans la zone.
      </v-alert>
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
    const searchPerformed = ref(false)
    const nearbyPlaces = ref([])
    const showMigrantCenters = ref(true)
    const showQpv = ref(false)

    // Map instance
    let map = null
    let selectedMarker = null
    let nearbyMarkers = []
    let qpvLayer = null
    let migrantCentersLayer = null
    let allMigrantCenters = []

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

    // Set selected location and find nearby places
    const setSelectedLocation = async (lat, lng, address = null) => {
      selectedLocation.value = { lat, lng, address }

      // Clear existing marker
      if (selectedMarker) {
        map.removeLayer(selectedMarker)
      }

      // Add new marker
      selectedMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(address || `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup()

      // Center map on location
      map.setView([lat, lng], Math.max(map.getZoom(), 10))

      // Find nearby places
      await findNearbyPlaces(lat, lng)
      searchPerformed.value = true
    }

    // Find nearby places (for the results table)
    const findNearbyPlaces = async (lat, lng) => {
      try {
        // Only find migrant centers for the results table
        const response = await api.getMigrants({ limit: 1500 })
        const places = response.list || []
        console.log('Loaded migrant centers:', places.length)

        // Calculate distances and sort
        const placesWithDistances = places
          .filter(place => {
            const hasCoords = place.latitude && place.longitude && 
                            !isNaN(parseFloat(place.latitude)) && 
                            !isNaN(parseFloat(place.longitude))
            if (!hasCoords) {
              console.log('Filtering out place without valid coordinates:', place)
            }
            return hasCoords
          })
          .map(place => ({
            ...place,
            latitude: parseFloat(place.latitude),
            longitude: parseFloat(place.longitude),
            distance: calculateDistance(lat, lng, parseFloat(place.latitude), parseFloat(place.longitude))
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5) // Get 5 closest

        console.log('Places with distances:', placesWithDistances)
        nearbyPlaces.value = placesWithDistances
        showNearbyPlacesOnMap(placesWithDistances)

      } catch (error) {
        console.error('Error finding nearby places:', error)
      }
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

    // Show nearby places on map (for the closest results)
    const showNearbyPlacesOnMap = (places) => {
      // Clear existing markers
      nearbyMarkers.forEach(marker => map.removeLayer(marker))
      nearbyMarkers = []

      // Add markers for nearby places
      places.forEach((place, index) => {
        const marker = L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({
            html: `<div style="background: ${getDistanceColor(place.distance)}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
            className: 'custom-div-icon',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        })
        .addTo(map)
        .bindPopup(`
          <strong>${place.commune || 'N/A'}</strong><br>
          ${place.adresse || 'N/A'}<br>
          <strong>Distance:</strong> ${place.distance.toFixed(1)} km<br>
          <strong>Places:</strong> ${place.places || 'N/A'}<br>
          <strong>Type:</strong> ${place.type || 'N/A'}<br>
          <strong>Gestionnaire:</strong> ${place.gestionnaire || 'N/A'}
        `)

        nearbyMarkers.push(marker)
      })

      // Adjust map view to show all markers
      if (places.length > 0 && selectedLocation.value) {
        const group = new L.featureGroup([
          selectedMarker,
          ...nearbyMarkers
        ])
        map.fitBounds(group.getBounds().pad(0.1))
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

    // Create mosque/islamic symbol icon based on zoom level
    const createMosqueIcon = (zoom) => {
      let size = 8
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
          font-size: ${Math.max(8, size - 4)}px;
          border: 2px solid #1b5e20;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">☪</div>`,
        className: 'mosque-icon',
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
          icon: createMosqueIcon(currentZoom)
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
          layer.setIcon(createMosqueIcon(currentZoom))
        }
      })
    }

    // Load QPV GeoJSON layer
    const loadQpvLayer = async () => {
      try {
        const response = await api.getQpvs()
        if (response && response.geojson && response.geojson.features) {
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
      searchPerformed,
      nearbyPlaces,
      showMigrantCenters,
      showQpv,
      searchAddress,
      getCurrentLocation,
      onOverlayToggle,
      getDistanceColor
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