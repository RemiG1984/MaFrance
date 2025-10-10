<template>
  <div class="data-selection-controls">
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
          <v-row>
            <v-col cols="6">
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
            </v-col>
            <v-col cols="6">
              <v-checkbox
                v-model="showCadastral"
                :label="isEnglish ? labels.cadastral.en : labels.cadastral.fr"
                density="compact"
                hide-details
                @change="onOverlayToggle"
              >
                <template v-slot:prepend>
                  <div class="overlay-indicator cadastral-indicator">📐</div>
                </template>
              </v-checkbox>
              <v-range-slider
                v-if="showCadastral"
                v-model="priceRange"
                :min="500"
                :max="locationStore.maxPrice"
                :step="100"
                density="compact"
                hide-details
                @update:model-value="onPriceRangeChange"
                class="mt-2"
              />
              <div v-if="showCadastral" class="text-caption text-center mt-1">
                {{ priceRange[0] }} - {{ priceRange[1] }} €/m²
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-expand-transition>
    </v-card>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '../../services/store.js'
import { useLocationStore } from './locationStore.js'
import pako from 'pako'

// Arrondissement mappings for DVF API
const arrondissementMappings = {
  '69123': Array.from({ length: 9 }, (_, i) => `6938${i + 1}`), // Lyon: 69381 to 69389
  '75056': Array.from({ length: 20 }, (_, i) => `751${String(i + 1).padStart(2, '0')}`), // Paris: 75101 to 75120
  '13055': Array.from({ length: 16 }, (_, i) => `132${String(i + 1).padStart(2, '0')}`), // Marseille: 13201 to 13216
}

// Translation labels
const labels = {
  displayPlaces: { fr: 'Affichage des lieux', en: 'Display of places' },
  qpv: { fr: 'Quartiers QPV', en: 'QPV Districts' },
  migrantCenters: { fr: 'Centres de migrants', en: 'Migrant Centers' },
  mosques: { fr: 'Mosquées', en: 'Mosques' },
  cadastral: { fr: 'Prix de l\'immobilier (€/m²)', en: 'Real Estate Price (€/m²)' },
}

export default {
  name: 'LocationDataBox',
  emits: ['cadastral-data-loaded'],
  setup(props, { emit }) {
    const dataStore = useDataStore()
    const locationStore = useLocationStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    const isInclusive = computed(() => dataStore.labelState === 1)

    // Layer visibility toggles
    const showMigrantCenters = computed({
      get: () => locationStore.overlayStates.showMigrantCenters,
      set: (value) => locationStore.setOverlayStates({ showMigrantCenters: value })
    })
    const showQpv = computed({
      get: () => locationStore.overlayStates.showQpv,
      set: (value) => locationStore.setOverlayStates({ showQpv: value })
    })
    const showMosques = computed({
      get: () => locationStore.overlayStates.showMosques,
      set: (value) => locationStore.setOverlayStates({ showMosques: value })
    })
    const showCadastral = computed({
      get: () => locationStore.overlayStates.cadastral,
      set: (value) => locationStore.setOverlayStates({ cadastral: value })
    })
    const overlayExpanded = ref(true)
    const isLoadingCadastral = ref(false)
    const lastFetchLat = ref(null)
    const lastFetchLng = ref(null)
    const priceRange = ref([locationStore.minPrice, locationStore.maxPrice])
    const timeout = ref(null)
    const mapMovementTimeout = ref(null)

    // Reactive caches for departements and cadastral data
    const departementsCache = ref(new Map())
    const cadastralCache = ref(new Map())
    const sectionDVF = ref(new Map())
    const fetchedCommunes = ref(new Set())
    const maxSections = 2000

    // Haversine distance calculation
    const haversineDistance = (lat1, lng1, lat2, lng2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Handle overlay toggle changes
    const onOverlayToggle = () => {
      locationStore.setOverlayStates({
        showQpv: showQpv.value,
        showMigrantCenters: showMigrantCenters.value,
        showMosques: showMosques.value,
        cadastral: showCadastral.value
      })
    }

    // Handle price range changes
    const onPriceRangeChange = () => {
      if (timeout.value) clearTimeout(timeout.value)
      timeout.value = setTimeout(() => {
        locationStore.setCadastralBounds(priceRange.value)
      }, 300)
    }

    // Watch for store changes to update slider if not manually adjusted
    watch([() => locationStore.minPrice, () => locationStore.maxPrice], ([newMin, newMax]) => {
      if (!locationStore.isManual) {
        priceRange.value = [newMin, newMax]
      }
    })

    // Function to fetch cadastral data
    const fetchCadastralData = async (newCenter, newZoom) => {
      isLoadingCadastral.value = true
      const shouldFetch = lastFetchLat.value === null || lastFetchLng.value === null || haversineDistance(newCenter.lat, newCenter.lng, lastFetchLat.value, lastFetchLng.value) > 1;
      if (!shouldFetch) {
        // Skipping cadastral fetch: distance from last fetch < 1km
        // Emit current accumulated data
        const sectionsArray = Array.from(sectionDVF.value.values())
        const combinedGeoJSON = { type: 'SectionCollection', sections: sectionsArray }
        emit('cadastral-data-loaded', combinedGeoJSON)
        locationStore.setCadastralData(combinedGeoJSON)
        isLoadingCadastral.value = false;
        return;
      }
      try {
        // 1. Get departement from map center
        const depUrl = `https://geo.api.gouv.fr/communes?lat=${newCenter.lat}&lon=${newCenter.lng}&fields=codeDepartement`
        const depResponse = await fetch(depUrl)
        if (!depResponse.ok) throw new Error('Failed to fetch departement')
        const deps = await depResponse.json()
        if (deps.length === 0) throw new Error('No departement found')
        const departementCode = deps[0].codeDepartement

        // 2. Fetch all communes in that departement (cached)
        let communes = departementsCache.value.get(departementCode)
        if (!communes) {
          const communesResponse = await fetch(`https://geo.api.gouv.fr/departements/${departementCode}/communes?fields=code,centre`)
          if (!communesResponse.ok) throw new Error('Failed to fetch communes')
          communes = await communesResponse.json()
          departementsCache.value.set(departementCode, communes)
        }

        // 3. Sort communes by distance to center and take 10 closest
        const sortedCommunes = communes.sort((a, b) => {
          const distA = haversineDistance(locationStore.center.lat, locationStore.center.lng, a.centre.coordinates[1], a.centre.coordinates[0]);
          const distB = haversineDistance(locationStore.center.lat, locationStore.center.lng, b.centre.coordinates[1], b.centre.coordinates[0]);
          return distA - distB;
        });
        const limitedCommunes = sortedCommunes.slice(0, 10);

        // 4. Fetch cadastre and DVF data in parallel for each commune not already fetched
        const communesToFetch = limitedCommunes.filter(commune => !fetchedCommunes.value.has(commune.code))
        const communePromises = communesToFetch.map(async (commune) => {
          const cog = commune.code

          // Fetch cadastre (handle arrondissements for special communes)
          const cadastrePromise = (async () => {
            const cadastreCodes = arrondissementMappings[cog] || [cog]
            const cadastrePromises = cadastreCodes.map(async (code) => {
              let sections = cadastralCache.value.get(code)
              if (!sections) {
                const departement = code.substring(0, 2)
                const url = `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${departement}/${code}/cadastre-${code}-sections.json.gz`
                try {
                  const response = await fetch(url)
                  if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const decompressed = pako.ungzip(new Uint8Array(arrayBuffer), { to: 'string' });
                    const geojson = JSON.parse(decompressed);
                    sections = geojson.features ? geojson.features.map(feature => ({
                      sectionID: feature.id,
                      cog: feature.properties?.commune,
                      geometry: feature.geometry.coordinates[0][0]
                    })) : []
                    cadastralCache.value.set(code, sections)
                  } else {
                    sections = []
                  }
                } catch (e) {
                  sections = []
                }
              }
              return sections
            })
            const cadastreResults = await Promise.all(cadastrePromises)
            return cadastreResults.flat()
          })()

          // Fetch DVF (handle arrondissements for special communes)
          const dvfPromise = (async () => {
            const dvfCodes = arrondissementMappings[cog] || [cog]
            const dvfPromises = dvfCodes.map(async (code) => {
              try {
                const dvfUrl = `https://dvf-api.data.gouv.fr/commune/${code}/sections`
                const dvfResponse = await fetch(dvfUrl)
                if (dvfResponse.ok) {
                  const dvfData = await dvfResponse.json()
                  return dvfData.data || []
                } else {
                  return []
                }
              } catch (e) {
                return []
              }
            })
            const dvfResults = await Promise.all(dvfPromises)
            return { data: dvfResults.flat() }
          })()

          // Await both in parallel
          const [sections, dvfData] = await Promise.all([cadastrePromise, dvfPromise])

          // Create DVF map
          const dvfMap = new Map()
          if (dvfData.data && Array.isArray(dvfData.data)) {
            dvfData.data.forEach(section => {
              if (section.c && section.m_am !== null && section.m_am !== undefined) {
                dvfMap.set(section.c, section.m_am)
              }
            })
          }

          // Join sections with prices
          const joinedSections = sections.map(section => ({
            sectionID: section.sectionID,
            geometry: section.geometry,
            cog: section.cog,
            communeName: commune.nom,
            price: dvfMap.get(section.sectionID) ?? null
          }))

          // Add to sectionDVF map, deduplicating by sectionID
          joinedSections.forEach(section => {
            if (!sectionDVF.value.has(section.sectionID)) {
              sectionDVF.value.set(section.sectionID, section)
            }
          })

          // Mark commune as fetched
          fetchedCommunes.value.add(commune.code)
        })
        await Promise.all(communePromises)

        // Enforce max sections limit by removing oldest (first inserted)
        while (sectionDVF.value.size > maxSections) {
          const firstKey = sectionDVF.value.keys().next().value
          sectionDVF.value.delete(firstKey)
        }

        const sectionsArray = Array.from(sectionDVF.value.values())

        // Emit the sectionDVF array
        const combinedGeoJSON = {
          type: 'SectionCollection',
          sections: sectionsArray
        }
        emit('cadastral-data-loaded', combinedGeoJSON)
        locationStore.setCadastralData(combinedGeoJSON)
        lastFetchLat.value = newCenter.lat;
        lastFetchLng.value = newCenter.lng;
      } catch (e) {
        console.error('Failed to load cadastral data:', e)
        const emptyData = { type: 'SectionCollection', sections: [] }
        emit('cadastral-data-loaded', emptyData)
        locationStore.setCadastralData(emptyData)
      } finally {
        isLoadingCadastral.value = false
      }
    }

    // Watch for center, showCadastral, and zoom changes and fetch cadastral data if enabled and zoom >= 10
    watch([() => locationStore.center, showCadastral, () => locationStore.zoom], ([newCenter, newShow, newZoom]) => {
      // Clear existing timeout
      if (mapMovementTimeout.value) {
        clearTimeout(mapMovementTimeout.value)
      }

      if (newShow && newCenter && newZoom >= 10) {
        // Debounce the fetch by 500ms
        mapMovementTimeout.value = setTimeout(() => {
          fetchCadastralData(newCenter, newZoom)
        }, 500)
      } else {
        const emptyData = { type: 'SectionCollection', sections: [] }
        emit('cadastral-data-loaded', emptyData)
        locationStore.setCadastralData(emptyData)
      }
    })

    return {
      showMigrantCenters,
      showQpv,
      showMosques,
      showCadastral,
      overlayExpanded,
      onOverlayToggle,
      onPriceRangeChange,
      priceRange,
      isEnglish,
      isInclusive,
      labels,
      isLoadingCadastral,
      locationStore
    }
  }
}
</script>

<style scoped>
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

.cadastral-indicator {
  background: #2196f3;
  color: white;
  border-radius: 50%;
  border: 1px solid #0d47a1;
}
</style>