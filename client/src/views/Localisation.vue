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
        <v-col cols="12" md="3">
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
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedLocationType"
            :items="locationTypes"
            label="Type de lieux"
            variant="outlined"
            density="compact"
            @update:model-value="onLocationTypeChanged"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Map Section -->
    <div class="map-section">
      <v-card class="mb-4">
        <v-card-text class="pa-0">
          <div id="localisationMap" class="localisation-map"></div>
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
      <h3>{{ selectedLocationType.title }} les plus proches</h3>
      <div class="table-container">
        <v-table>
          <thead>
            <tr>
              <th>Distance</th>
              <th v-if="selectedLocationType.value === 'migrants'">Type</th>
              <th v-if="selectedLocationType.value === 'migrants'">Places</th>
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
              <td v-if="selectedLocationType.value === 'migrants'">{{ place.type || 'N/A' }}</td>
              <td v-if="selectedLocationType.value === 'migrants'">{{ place.places || 'N/A' }}</td>
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
        Aucun {{ selectedLocationType.title.toLowerCase() }} trouvé dans la zone.
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
import VersionSelector from '../components/VersionSelector.vue'

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
  components: {
    VersionSelector
  },
  setup() {
    // Reactive data
    const addressInput = ref('')
    const selectedLocation = ref(null)
    const searchingAddress = ref(false)
    const gettingLocation = ref(false)
    const searchPerformed = ref(false)
    const selectedLocationType = ref({ value: 'migrants', title: 'Centres de migrants' })
    const nearbyPlaces = ref([])
    
    // Map instance
    let map = null
    let selectedMarker = null
    let nearbyMarkers = []

    // Location types (extensible for future additions)
    const locationTypes = [
      { value: 'migrants', title: 'Centres de migrants' }
      // Future additions: QPV, mosquées, etc.
    ]

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
      if (distance <= 5) return 'green'
      if (distance <= 15) return 'orange'
      if (distance <= 30) return 'red'
      return 'grey'
    }

    // Initialize map
    const initMap = async () => {
      await nextTick()
      
      // Initialize map centered on France
      map = L.map('localisationMap').setView([46.603354, 1.888334], 6)
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      // Add click handler
      map.on('click', onMapClick)
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

    // Find nearby places based on selected type
    const findNearbyPlaces = async (lat, lng) => {
      try {
        let places = []
        
        if (selectedLocationType.value.value === 'migrants') {
          const response = await api.getMigrants({ limit: 1500 })
          places = response.list || []
          console.log('Loaded migrant centers:', places.length)
        }
        // Future: Add other types here (QPV, mosquées, etc.)

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

    // Show nearby places on map
    const showNearbyPlacesOnMap = (places) => {
      // Clear existing markers
      nearbyMarkers.forEach(marker => map.removeLayer(marker))
      nearbyMarkers = []

      // Add markers for nearby places
      places.forEach((place, index) => {
        const marker = L.marker([place.latitude, place.longitude], {
          icon: L.divIcon({
            html: `<div style="background: ${getDistanceColor(place.distance)}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${index + 1}</div>`,
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
          ${selectedLocationType.value.value === 'migrants' ? 
            `<strong>Places:</strong> ${place.places || 'N/A'}<br><strong>Type:</strong> ${place.type || 'N/A'}<br><strong>Gestionnaire:</strong> ${place.gestionnaire || 'N/A'}` : 
            ''
          }
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

    // Handle location type change
    const onLocationTypeChanged = () => {
      if (selectedLocation.value) {
        findNearbyPlaces(selectedLocation.value.lat, selectedLocation.value.lng)
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
      selectedLocationType,
      locationTypes,
      nearbyPlaces,
      searchAddress,
      getCurrentLocation,
      onLocationTypeChanged,
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