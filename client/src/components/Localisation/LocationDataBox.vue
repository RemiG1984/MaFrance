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
        </v-card-text>
      </v-expand-transition>
    </v-card>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '../../services/store.js'
import pako from 'pako'

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
  props: {
    zoom: {
      type: Number,
      default: null
    },
    center: {
      type: Object,
      default: null
    }
  },
  emits: ['overlay-toggled', 'cadastral-data-loaded'],
  setup(props, { emit }) {
    const dataStore = useDataStore()
    const isEnglish = computed(() => dataStore.labelState === 3)
    const isInclusive = computed(() => dataStore.labelState === 1)

    // Layer visibility toggles
    const showMigrantCenters = ref(false)
    const showQpv = ref(true)
    const showMosques = ref(false)
    const showCadastral = ref(false)
    const overlayExpanded = ref(true)
    const isLoadingCadastral = ref(false)
    const lastFetchLat = ref(null)
    const lastFetchLng = ref(null)

    // Reactive caches for departements and cadastral data
    const departementsCache = ref(new Map())
    const cadastralCache = ref(new Map())
    const sectionDVF = ref(new Map())
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
      emit('overlay-toggled', {
        showQpv: showQpv.value,
        showMigrantCenters: showMigrantCenters.value,
        showMosques: showMosques.value,
        cadastral: showCadastral.value
      })
    }

    // Watch for center, showCadastral, and zoom changes and fetch cadastral data if enabled and zoom >= 10
    watch([() => props.center, showCadastral, () => props.zoom], async ([newCenter, newShow, newZoom]) => {
      if (newShow && newCenter && newZoom >= 10) {
        isLoadingCadastral.value = true
        const shouldFetch = lastFetchLat.value === null || lastFetchLng.value === null || haversineDistance(newCenter.lat, newCenter.lng, lastFetchLat.value, lastFetchLng.value) > 1;
        if (!shouldFetch) {
          console.log('Skipping cadastral fetch: distance from last fetch < 10km');
          isLoadingCadastral.value = false;
          return;
        }
        try {
          console.log('Fetching cadastral data for center coordinates:', newCenter)
          // 1. Get departement from map center
          const depUrl = `https://geo.api.gouv.fr/communes?lat=${newCenter.lat}&lon=${newCenter.lng}&fields=codeDepartement`
          console.log('Departement query URL:', depUrl)
          const depResponse = await fetch(depUrl)
          if (!depResponse.ok) throw new Error('Failed to fetch departement')
          const deps = await depResponse.json()
          if (deps.length === 0) throw new Error('No departement found')
          const departementCode = deps[0].codeDepartement

          console.log('Departement found:', departementCode)

          // 2. Fetch all communes in that departement (cached)
          let communes = departementsCache.value.get(departementCode)
          if (!communes) {
            const communesResponse = await fetch(`https://geo.api.gouv.fr/departements/${departementCode}/communes?fields=code,centre`)
            if (!communesResponse.ok) throw new Error('Failed to fetch communes')
            communes = await communesResponse.json()
            departementsCache.value.set(departementCode, communes)
            console.log('First 5 commune centers:', communes.slice(0,5).map(c => c.centre.coordinates))
          }

          console.log('Communes fetched/cached for departement', departementCode, ':', communes.length)

          // 3. Sort communes by distance to center and take 10 closest
          console.log('Sorting all communes by distance to center')
          const sortedCommunes = communes.sort((a, b) => {
            const distA = haversineDistance(props.center.lat, props.center.lng, a.centre.coordinates[1], a.centre.coordinates[0]);
            const distB = haversineDistance(props.center.lat, props.center.lng, b.centre.coordinates[1], b.centre.coordinates[0]);
            return distA - distB;
          });
          const limitedCommunes = sortedCommunes.slice(0, 10);
          console.log('Taking 10 closest communes:', limitedCommunes.length)

          // 4. Fetch cadastre and DVF data in parallel for each commune
          const communePromises = limitedCommunes.map(async (commune) => {
            const cog = commune.code
            console.log('Fetching cadastre and DVF for commune:', cog)

            // Fetch cadastre
            const cadastrePromise = (async () => {
              let sections = cadastralCache.value.get(cog)
              if (!sections) {
                const departement = cog.substring(0, 2)
                const url = `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${departement}/${cog}/cadastre-${cog}-sections.json.gz`
                console.log('Fetching cadastre from URL for', cog, ':', url)
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
                    cadastralCache.value.set(cog, sections)
                    console.log('Cadastre fetched for', cog, ':', sections.length, 'sections')
                  } else {
                    sections = []
                    console.log('Failed to fetch cadastre for', cog, ' - response not ok')
                  }
                } catch (e) {
                  sections = []
                  console.log('Error fetching cadastre for', cog, ':', e)
                }
              }
              return sections
            })()

            // Fetch DVF
            const dvfPromise = (async () => {
              try {
                const dvfUrl = `https://dvf-api.data.gouv.fr/commune/${cog}/sections`
                const dvfResponse = await fetch(dvfUrl)
                if (dvfResponse.ok) {
                  const dvfData = await dvfResponse.json()
                  return dvfData
                } else {
                  console.log('Failed to fetch DVF for', cog, ' - response not ok')
                  return []
                }
              } catch (e) {
                console.log('Error fetching DVF for', cog, ':', e)
                return []
              }
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
          })
          await Promise.all(communePromises)

          // Enforce max sections limit by removing oldest (first inserted)
          while (sectionDVF.value.size > maxSections) {
            const firstKey = sectionDVF.value.keys().next().value
            sectionDVF.value.delete(firstKey)
          }

          const sectionsArray = Array.from(sectionDVF.value.values())
          console.log('Total sectionDVF collected:', sectionsArray.length)

          // Emit the sectionDVF array
          const combinedGeoJSON = {
            type: 'SectionCollection',
            sections: sectionsArray
          }
          console.log('Emitting cadastral data with', combinedGeoJSON.sections.length, 'sections')
          if (combinedGeoJSON.sections.length > 0) {
            console.log('Sample section from combined cadastral data:', combinedGeoJSON.sections[0])
          }
          emit('cadastral-data-loaded', combinedGeoJSON)
          lastFetchLat.value = newCenter.lat;
          lastFetchLng.value = newCenter.lng;
        } catch (e) {
          console.error('Failed to load cadastral data:', e)
          console.log('Error details:', e.message)
          emit('cadastral-data-loaded', { type: 'SectionCollection', sections: [] })
        } finally {
          isLoadingCadastral.value = false
        }
      } else {
        emit('cadastral-data-loaded', { type: 'SectionCollection', sections: [] })
      }
    })

    return {
      showMigrantCenters,
      showQpv,
      showMosques,
      showCadastral,
      overlayExpanded,
      onOverlayToggle,
      isEnglish,
      isInclusive,
      labels,
      isLoadingCadastral
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