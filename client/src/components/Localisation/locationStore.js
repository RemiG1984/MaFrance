import { defineStore } from 'pinia'
import api from '../../services/api.js'

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
    minPrice: 500,
    maxPrice: 20000,
    isManual: false,

    // Overlay visibility states
    overlayStates: {
      showQpv: true,
      showMigrantCenters: false,
      showMosques: false,
      cadastral: false
    },

    // Data for map
    qpvData: null,
    migrantCentersData: [],
    mosquesData: []
  }),

  getters: {
    // Check if a location is currently selected
    hasSelectedLocation: (state) => state.selectedLocation !== null,

    // Get current overlay states
    getOverlayStates: (state) => state.overlayStates,

    // Check if any expansion panels are open
    hasExpandedPanels: (state) => state.expandedQpv || state.expandedMigrant || state.expandedMosque,

    // Utility functions
    isValidCoordinates: () => (latitude, longitude) => {
      if (latitude == null || longitude == null) return false
      if (isNaN(latitude) || isNaN(longitude)) return false
      // Check if coordinates are within reasonable bounds for France
      return latitude >= 41 && latitude <= 51 && longitude >= -5 && longitude <= 10
    },

    isMetropolitan: () => (departement) => {
      if (!departement) return false
      const dept = departement.toString().toUpperCase()
      // Exclude overseas territories
      const overseas = ['971', '972', '973', '974', '976']
      return !overseas.includes(dept)
    }
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
          const calcMin = Math.round(Math.max(Math.min(...prices), 500)*1.1)
          const calcMax = Math.round(Math.min(Math.max(...prices), 20000)*0.9)
          this.minPrice = calcMin
          this.maxPrice = calcMax
        }
      }
    },

    // Set cadastral bounds manually
    setCadastralBounds(bounds) {
      this.isManual = true
      this.minPrice = bounds[0]
      this.maxPrice = bounds[1]
    },

    // Reset manual bounds flag
    resetManualBounds() {
      this.isManual = false
    },

    // Load data for map
    async loadData() {
      try {
        const [qpvResponse, migrantsResponse, mosquesResponse] = await Promise.all([
          api.getQpvs(),
          api.getMigrants({ limit: 1500 }),
          api.getMosques({ limit: 3000 })
        ])

        this.qpvData = qpvResponse

        this.migrantCentersData = migrantsResponse.list.filter(center =>
          this.isValidCoordinates(center.latitude, center.longitude) &&
          this.isMetropolitan(center.departement)
        )

        this.mosquesData = mosquesResponse.list.filter(mosque =>
          this.isValidCoordinates(mosque.latitude, mosque.longitude) &&
          this.isMetropolitan(mosque.departement)
        )
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
  }
})