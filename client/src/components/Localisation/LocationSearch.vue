<template>
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
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'LocationSearch',
  emits: ['location-found'],
  setup(props, { emit }) {
    const addressInput = ref('')
    const searchingAddress = ref(false)
    const gettingLocation = ref(false)

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
          emit('location-found', {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name
          })
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

    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par ce navigateur.')
        return
      }

      gettingLocation.value = true
      navigator.geolocation.getCurrentPosition(
        (position) => {
          emit('location-found', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Ma position actuelle'
          })
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

    return {
      addressInput,
      searchingAddress,
      gettingLocation,
      searchAddress,
      getCurrentLocation
    }
  }
}
</script>

<style scoped>
/* Scoped styles for LocationSearch component */
</style>