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
      showQpv: false,
      showMigrantCenters: true,
      showMigrantAccompanimentCenters: false,
      showMosques: false,
      cadastral: false,
      showDepartements: false,
      showRegions: false,
      showCirconscriptions: false
    },

    // Selected overlay for single selection system
    selectedOverlay: null,

    // Migrant center type filter
    selectedTypes: [],

    // Data for map
    qpvData: null,
    migrantCentersData: [],
    mosquesData: [],

    // Loading states
    loadingMigrants: false,
    loadingMosques: false
  }),

  getters: {
    // Check if a location is currently selected
    hasSelectedLocation: (state) => state.selectedLocation !== null,

    // Get current overlay states
    getOverlayStates: (state) => state.overlayStates,

    // Get selected overlay
    getSelectedOverlay: (state) => state.selectedOverlay,

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

    // Set selected overlay
    setSelectedOverlay(overlay) {
      this.selectedOverlay = overlay
      // Update overlayStates for backward compatibility
      this.overlayStates.showDepartements = overlay === 'departements'
    },

    // Set selected types for migrant center filtering
    setSelectedTypes(types) {
      this.selectedTypes = types || []
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
        // Load QPV data synchronously
        const qpvResponse = await api.getQpvs()
        this.qpvData = qpvResponse

        // Load migrant centers asynchronously with loading state
        this.loadingMigrants = true
        const migrantsPromise = api.getMigrants({ limit: 3000 }).then(migrantsResponse => {
          this.migrantCentersData = migrantsResponse.list.filter(center =>
            this.isValidCoordinates(center.latitude, center.longitude) &&
            this.isMetropolitan(center.departement)
          )
          console.log(`Loaded ${this.migrantCentersData.length} migrant centers`)
          this.loadingMigrants = false
        }).catch(error => {
          console.error('Error loading migrant centers:', error)
          this.loadingMigrants = false
        })

        // Load mosques asynchronously with loading state
        this.loadingMosques = true
        const mosquesPromise = api.getMosques({ limit: 3000 }).then(mosquesResponse => {
          this.mosquesData = mosquesResponse.list.filter(mosque =>
            this.isValidCoordinates(mosque.latitude, mosque.longitude) &&
            this.isMetropolitan(mosque.departement)
          )
          this.loadingMosques = false
        }).catch(error => {
          console.error('Error loading mosques:', error)
          this.loadingMosques = false
        })

        // Start both async loads
        migrantsPromise
        mosquesPromise
      } catch (error) {
        console.error('Error loading QPV data:', error)
      }
    }
  }
})