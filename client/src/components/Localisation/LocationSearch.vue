<template>
  <v-card class="pa-4">
    <v-card-title class="pa-0 mb-3 text-h5">
      {{ isEnglish ? 'Search' : 'Recherche' }}
    </v-card-title>
    <v-text-field
      v-model="addressInput"
      :label="isEnglish ? 'Search for an address' : 'Rechercher une adresse'"
      :placeholder="isEnglish ? 'Ex: 123 Peace Street, Paris' : 'Ex: 123 Rue de la Paix, Paris'"
      variant="outlined"
      density="compact"
      append-inner-icon="mdi-magnify"
      :loading="searchingAddress"
      class="mb-3"
      @click:append-inner="searchAddress"
      @keyup.enter="searchAddress"
    />
    <v-btn
      color="primary"
      variant="outlined"
      prepend-icon="mdi-crosshairs-gps"
      :loading="gettingLocation"
      block
      @click="getCurrentLocation"
    >
      {{ isEnglish ? 'My position' : 'Ma position' }}
    </v-btn>
  </v-card>
</template>

<script>
import { defineComponent, ref, computed } from 'vue';
import { useDataStore } from '../../services/store.js';

export default defineComponent({
  name: 'LocationSearch',
  emits: ['location-found'],
  setup(_props, { emit }) {
    const dataStore = useDataStore();
    const isEnglish = computed(() => dataStore.labelState === 3);

    const addressInput = ref('');
    const searchingAddress = ref(false);
    const gettingLocation = ref(false);

    const searchAddress = async() => {
      if (!addressInput.value.trim()) {
        return;
      }

      searchingAddress.value = true;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput.value)}&limit=1&countrycodes=fr`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const result = data[0];
          emit('location-found', {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name
          });
        } else {
          alert(isEnglish.value ? 'Address not found. Please try another address.' : 'Adresse non trouvée. Veuillez essayer une autre adresse.');
        }
      } catch {
        alert(isEnglish.value ? 'Error during address search.' : 'Erreur lors de la recherche d\'adresse.');
      } finally {
        searchingAddress.value = false;
      }
    };

    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        alert(isEnglish.value ? 'Geolocation is not supported by this browser.' : 'La géolocalisation n\'est pas supportée par ce navigateur.');
        return;
      }

      gettingLocation.value = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          emit('location-found', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: isEnglish.value ? 'My current position' : 'Ma position actuelle'
          });
          gettingLocation.value = false;
        },
        () => {
          alert(isEnglish.value ? 'Error during geolocation. Please check your location settings.' : 'Erreur lors de la géolocalisation. Veuillez vérifier vos paramètres de localisation.');
          gettingLocation.value = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    return {
      addressInput,
      searchingAddress,
      gettingLocation,
      searchAddress,
      getCurrentLocation,
      dataStore,
      isEnglish
    };
  }
});
</script>

<style scoped>
/* Scoped styles for LocationSearch component */
</style>
