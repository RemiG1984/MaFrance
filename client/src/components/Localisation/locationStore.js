import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    // User input and location state
    selectedLocation: null,
    distanceInfo: {},
    closestLocations: [],

    // Expansion states for distance info sections
    expandedQpv: false,
    expandedMigrant: false,
    expandedMosque: false,

    // Map state
    zoom: null,
    center: null,

    // Cadastral data
    cadastralData: null,
    minMAM: 500,
    maxMAM: 20000,
    isManual: false,

    // Overlay visibility states
    overlayStates: {
      showQpv: true,
      showMigrantCenters: false,
      showMosques: false,
      cadastral: false
    }
  }),

  getters: {
    // Check if a location is currently selected
    hasSelectedLocation: (state) => state.selectedLocation !== null,

    // Get current overlay states
    getOverlayStates: (state) => state.overlayStates,

    // Check if any expansion panels are open
    hasExpandedPanels: (state) => state.expandedQpv || state.expandedMigrant || state.expandedMosque
  },

  actions: {
    // Set selected location
    setSelectedLocation(location) {
      this.selectedLocation = location ? { lat: location.lat, lng: location.lng, address: location.address } : null
    },

    // Clear selected location and related data
    clearLocation() {
      this.selectedLocation = null
      this.distanceInfo = {}
      this.closestLocations = []
      this.expandedQpv = false
      this.expandedMigrant = false
      this.expandedMosque = false
    },

    // Set overlay states
    setOverlayStates(states) {
      this.overlayStates = { ...this.overlayStates, ...states }
    },

    // Set distance information and closest locations
    setDistanceInfo(distanceInfo, closestLocations) {
      this.distanceInfo = distanceInfo
      this.closestLocations = closestLocations || []
      // Reset expansion states when new distance info is computed
      this.expandedQpv = false
      this.expandedMigrant = false
      this.expandedMosque = false
    },

    // Toggle expansion states
    toggleExpandedQpv() {
      this.expandedQpv = !this.expandedQpv
    },

    toggleExpandedMigrant() {
      this.expandedMigrant = !this.expandedMigrant
    },

    toggleExpandedMosque() {
      this.expandedMosque = !this.expandedMosque
    },

    // Set map zoom and center
    setZoom(zoom) {
      this.zoom = zoom
    },

    setCenter(center) {
      this.center = center
    },

    // Set cadastral data
    setCadastralData(data) {
      this.cadastralData = data
      // Auto-adjust bounds if not manually set
      if (!this.isManual && data?.sections?.length > 0) {
        const prices = data.sections.map(s => s.price).filter(p => p != null && p !== undefined)
        if (prices.length > 0) {
          const calcMin = Math.max(Math.min(...prices), 500)
          const calcMax = Math.min(Math.max(...prices), 20000)
          this.minMAM = calcMin
          this.maxMAM = calcMax
        }
      }
    },

    // Set cadastral bounds manually
    setCadastralBounds(bounds) {
      this.isManual = true
      this.minMAM = bounds[0]
      this.maxMAM = bounds[1]
    },

    // Reset manual bounds flag
    resetManualBounds() {
      this.isManual = false
    }
  }
})