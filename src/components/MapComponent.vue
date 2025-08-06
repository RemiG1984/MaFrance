<template>
  <v-card>
    <v-card-text class="pa-0 position-relative">
      <div id="map" class="map-container"></div>
      <v-select
        style="max-width: 300px; z-index: 1000; position: absolute; top: 10px; right: 10px;"
        v-model="selectedMetric"
        @update:model-value="onMetricChange"
        :items="availableMetrics"
        :item-title="labelKey"
        item-value="value"
        variant="solo"
        density="compact"
        return-object
        hide-details
      ></v-select>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { DepartementNames } from '../utils/departementNames.js'
import { MetricsConfig } from '../utils/metricsConfig.js'
import chroma from "chroma-js";
import api from '../services/api.js'
import { markRaw } from 'vue'

export default {
  name: 'MapComponent',
  props: {
    location: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      labelKey: 'label',
      selectedMetric: MetricsConfig.metrics[0],
      mapLevel: 'country',
      deptData: {},
      communeData: {},
      geoJsonLoaded: false,
      scaleDomain: {
        min: Infinity,
        max: -Infinity,
        delta: 0,
      },
      scaleColors: [
        "#ffeda0",
        "#feb24c",
        "#fd8d3c",
        "#fc4e2a",
        "#e31a1c",
        "#b10026",
      ],
      dataRef: {},
      boundsPadding: 10,
      logStrength: 3,
    }
  },
  computed: {
    ...mapStores(useDataStore),
    currentLevel() {
      return this.dataStore.currentLevel;
    },
    currentdepartement() {
      return this.dataStore.levels.departement;
    },
    mapState() {
    // permet de détecter les changements d'états qui nécessitent un rechargement de map
      const level = this.currentLevel;
      const dept = this.currentdepartement;
      
      // Pour la map, on a soit 'country' soit 'departement'
      const mapLevel = level === 'country' ? 'country' : 'departement';
      
      return {
        level: mapLevel,
        departement: dept
      };
    },
    availableMetrics() {
      const level = this.mapState.level === 'country' ? 'france' : this.mapState.level;
      const availableMetricKeys = MetricsConfig.getAvailableMetrics(level);
      return MetricsConfig.metrics.filter(metric => 
        availableMetricKeys.includes(metric.value)
      );
    }

  },

  watch: {
    mapState(newState, oldState) {
      // Ecoute du changement d'état
      // Se déclenche uniquement si le niveau de la map change 
      // ou si le département change
      if (!oldState || 
          newState.level !== oldState.level || 
          newState.departement !== oldState.departement) {
        this.updateData();
      }
    },
  },
  mounted() {
    this.initMap()
    this.colorscale = chroma.scale(this.scaleColors).domain([0, 1]);
  },
  methods: {
    async initMap() {
      // Vérifier que Leaflet est disponible
      if (typeof L === 'undefined') {
        console.error('Leaflet not loaded')
        return
      }
      // const bounds = {
      //   _southWest: Object { lat: 41.362164776515, lng: -5.138001239929 }
      //   _northEast: Object { lat: 51.08854370897, lng: 9.5592262719626 }
      // }

      // const p = this.boundsPadding
      const p = 1
      const maxBounds = [
        [41.362164776515-p, -5.138001239929-p],
        [51.08854370897+p, 9.5592262719626+p],
      ]

      // Initialiser la carte
      this.map = markRaw(L.map('map', {
        // maxBounds: L.latLngBounds([41, -5], [51.5, 9]),
        maxBounds: L.latLngBounds(maxBounds[0], maxBounds[1]),
        maxBoundsViscosity: 1.0
      }).setView([46.603354, 1.888334], 5))

      this.layerGroup = markRaw(new L.LayerGroup())
      this.layerGroup.addTo(this.map)

      this.globalTooltip = markRaw(L.tooltip({
        permanent: false,
        sticky: false,
        interactive: false,
        direction: 'top',
        // offset: [0, -10],
        opacity: 0.9
      }))

      this.legendControl = markRaw(L.control({ position: "bottomleft" }))
      this.legendControl.onAdd = (map) => {
        const div = L.DomUtil.create("div", "map-legend");
        this.updateLegendContent(div)
        return div
      }

      // Ajouter la couche de base
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.map)

      // Ajouter le contrôle plein écran si disponible
      if (L.Control.Fullscreen) {
        this.map.addControl(new L.Control.Fullscreen({
          position: "topleft"
        }))
      }

      // Charger les données initiales
      await this.loadDepartementsGeoJson()
    },


    updateData(){
      this.updateGeoJson()
      this.updateRanking()
      this.updateLayerColors()
      this.updateLegend()
    },

    updateGeoJson(){
      if(this.mapState.level === 'country') {
        this.showDepartementLayer()
      }
      else {
        const deptCode = this.dataStore.getDepartementCode()
        this.loadCommunesGeoJson(deptCode)
      }
    },

    updateRanking(){
      let rankingData
      let codeKey
      const rankingsRef = {}
      const isCountryLevel = this.mapState.level === 'country'

      this.scaleDomain = {
        min: Infinity,
        max: -Infinity,
        delta: 0,
      }

      if(isCountryLevel) {
        rankingData = this.dataStore?.country?.departementsRankings
        codeKey = 'departement'
      }
      else {
        rankingData = this.dataStore?.departement?.communesRankings
        codeKey = 'COG'
      }

      if(!rankingData) return

      rankingData.data.forEach(item => {
        const code = item[codeKey]
        // skip departements not in list
        if(isCountryLevel && !DepartementNames[code]) return

        rankingsRef[code] = item
        const value = item[this.selectedMetric.value] || 0
        this.scaleDomain.min = Math.min(this.scaleDomain.min, value)
        this.scaleDomain.max = Math.max(this.scaleDomain.max, value)
      })
      this.scaleDomain.delta = this.scaleDomain.max-this.scaleDomain.min
      this.dataRef = rankingsRef
    },

    updateLayerColors(){
      const isCountryLevel = this.mapState.level === 'country'

      if(isCountryLevel && this.departementsLayer) {
        this.departementsLayer.eachLayer((layer) => {
          const newStyle = this.getStyle(layer.feature);
          layer.setStyle(newStyle);
        });
      }
      else if(this.communesLayer){
        this.communesLayer.eachLayer((layer) => {
          const newStyle = this.getStyle(layer.feature);
          layer.setStyle(newStyle);
        });
      }
    },

    async loadDepartementsGeoJson() {
      try {
        const response = await fetch('https://france-geojson.gregoiredavid.fr/repo/departements.geojson')
        const geoJson = await response.json()

        this.departementsLayer = markRaw(L.geoJSON(geoJson, {
          style: this.getStyle.bind(this),
          onEachFeature: this.onEachDepartementFeature.bind(this)
        }))

        this.layerGroup.addLayer(this.departementsLayer)
        
      } catch (error) {
        console.error('Erreur chargement GeoJSON:', error)
      }
    },

    async loadCommunesGeoJson(deptCode) {
      if(!deptCode) return null
      try {
        // clear previous layers
        if(this.departementsLayer && this.layerGroup.hasLayer(this.departementsLayer)) {
          this.layerGroup.removeLayer(this.departementsLayer)
        }

        let geoUrl = ''
        if (deptCode === "75") {
          // Paris: Fetch arrondissements from official Paris open data
          geoUrl = `https://geo.api.gouv.fr/communes?codeDepartement=75&type=arrondissement-municipal&format=geojson&geometry=contour`;
        } else {
          // Other departments: Fetch communes
          geoUrl = `https://geo.api.gouv.fr/departements/${deptCode}/communes?format=geojson&geometry=contour`;
        }

        const response = await fetch(geoUrl)
        const geoJson = await response.json()

        this.updateCommunesLayer(geoJson)
        
      } catch (error) {
        console.error('Erreur chargement GeoJSON:', error)
      }
    },

    showDepartementLayer(newGeoJson) {
      if (this.communesLayer) {
        // Vider le layer existant
        this.communesLayer.clearLayers()
      }

      if(this.departementsLayer && !this.layerGroup.hasLayer(this.departementsLayer)) {
        this.layerGroup.addLayer(this.departementsLayer)

        if (this.departementsLayer.getBounds && this.departementsLayer.getBounds().isValid()) {
          this.map.fitBounds(this.departementsLayer.getBounds(), {
            animate: true,
            duration: 1.5, // Durée en secondes
            easeLinearity: 0.25,
            padding: [1, 1] // Padding
          })
        }
      }
    },

    updateCommunesLayer(newGeoJson) {
      if (this.communesLayer) {
        // Vider le layer existant
        this.communesLayer.clearLayers()
        
        // Ajouter les nouvelles données
        this.communesLayer.addData(newGeoJson)
      } else {
        // Créer un nouveau layer si il n'existe pas
        this.communesLayer = markRaw(L.geoJSON(newGeoJson, {
          style: this.getStyle.bind(this),
          onEachFeature: this.onEachCommuneFeature.bind(this)
        }))
        this.layerGroup.addLayer(this.communesLayer)
      }

      if (this.communesLayer.getBounds && this.communesLayer.getBounds().isValid()) {
        this.map.fitBounds(this.communesLayer.getBounds(), {
          animate: true,
          duration: 1.5, // Durée en secondes
          easeLinearity: 0.25,
          padding: [5, 5] // Padding en pixels
        })
      }
    },

    getStyle(feature) {
      let code = feature.properties.code

      const value = this.getFeatureValue(feature)

      if(value === null)
        return {
          fillColor: '#ccc',
          weight: 1,
          opacity: 0,
          color: 'white',
          fillOpacity: 0
        }

      const color = this.getColor(value)
      
      return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      }
    },

    onEachDepartementFeature(feature, layer) {
      const deptCode = feature.properties.code
      const deptName = feature.properties.nom
      
      layer.on({
        click: () => {
          this.dataStore.setDepartement(deptCode)
        }
      })

      // Événements mouseover/mouseout avec accès aux propriétés
      layer.on('mouseover', (e) => {
        this.showTooltip(e, feature);
      })
      
      layer.on('mouseout', (e) => {
        this.hideTooltip(e);
      })
    },

    onEachCommuneFeature(feature, layer) {
      // console.log('onEachCommuneFeature', feature)
      const commCode = this.removeTrailingZero(feature.properties.code)
      const commName = feature.properties.nom
      const deptCode  = feature.properties.codeDepartement
      
      layer.on({
        click: () => {
          this.dataStore.setCommune(commCode, commName, deptCode)
        }
      })

      layer.on('mouseover', (e) => {
        this.showTooltip(e, feature);
      });
      
      layer.on('mouseout', (e) => {
        this.hideTooltip(e);
      });

    },

    getColor(value) {
      let normalized = (value-this.scaleDomain.min)/this.scaleDomain.delta
      
      // Invert color scale for French names percentage (higher percentage should be lighter/better)
      if (this.selectedMetric.value === 'prenom_francais_pct') {
        normalized = 1 - normalized
      }
      
      return this.colorscale(this.logTransform(normalized, this.logStrength))
    },

    logTransform(value, strength = 2) {
      return Math.log(1 + value * (strength - 1)) / Math.log(strength);
    },

    inverseLogTransform(transformedValue, strength = 2) {
      return (Math.pow(strength, transformedValue) - 1) / (strength - 1);
    },

    getFeatureValue(feature) {
      const { properties } = feature;
      if(!this.dataRef || !properties) return null

      let code = null

      if(properties.hasOwnProperty('code')){
        code = properties?.code
      }
      else {
        return null
      }

      if(properties.hasOwnProperty('codeDepartement')){
        // FIXME: this is dirty, il faut enlever le 0 de départ pour les codes de communes seulement
        code = this.removeTrailingZero(code)
      }

      const metric = this.selectedMetric.value

      if(this.dataRef.hasOwnProperty(code)
       && this.dataRef[code].hasOwnProperty(metric)) {
        return this.dataRef[code][metric]
      }

      return null
    },

    showTooltip(e, feature) {
      const { properties } = feature;
      const layer = e.target;
      const center = layer.getCenter()

      layer.bringToFront()
      layer.setStyle({
        color: '#424242',
        weight: 2,
        opacity: 0.8
      });

      let value = this.getFeatureValue(feature)

      const indiceName = this.getIndiceName()
      // const indiceName = this.selectedMetric[this.labelKey]
      const content = `<b>${properties.nom}</b><br>${indiceName}: ${value}`

      this.globalTooltip
      .setLatLng(center)
      .setContent(content)
      .addTo(this.map)
    },

    hideTooltip(e) {
      const layer = e.target;
      layer.setStyle({
        weight: 1,
        opacity: 1,
        color: 'white',
      });

      if(this.globalTooltip){
        this.map.removeLayer(this.globalTooltip)
      }
    },

    updateLegend(){
      if(!this.legendControl) return

      if(this.map.hasLayer(this.legendControl)) {
        this.map.removeLayer(this.legendControl)
      }

      this.legendControl.addTo(this.map)
    },

    updateLegendContent(div){
      const indiceName = this.getIndiceName()

      // console.log('legent location', this.location)

      const gradient = this.generateVerticalGradient()
      const legendSteps = this.generateLegendSteps()

      let unitsDiv = ''
      let unitsMarkerDiv = ''

      const minValue = legendSteps[0].value
      const maxValue = legendSteps[legendSteps.length-1].value
      const delta = legendSteps[legendSteps.length-1].value

      for(const step of legendSteps){
        const valueDisplay = delta > 20 ? Math.round(step.value) : step.value.toFixed(1) 

        unitsMarkerDiv += `<div class="map-legend-marker" style="top: ${step.position}%;"></div>`
        unitsDiv += `<div class="map-legend-step" style="top: ${step.position}%;">
          ${valueDisplay}
        </div>`
      }

      const content = `
        <div class="map-legend-title">${indiceName}</div>
        <div class="map-legend-scale">
          <div class="map-legend-gradient" style="${gradient};">${unitsMarkerDiv}</div>
          <div class="map-legend-values">
            ${unitsDiv}
          </div>
        </div>
      `
      div.innerHTML = content
    },

    generateVerticalGradient() {
      // Calcul des positions régulières pour chaque couleur
      const step = 100 / (this.scaleColors.length - 1);
      
      // Création des stops du dégradé avec leurs positions
      const colorStops = this.scaleColors.map((color, index) => {
        const position = index * step;
        return `${color} ${position}%`;
      });
      
      // Génération du CSS linear-gradient
      return `background: linear-gradient(to bottom, ${colorStops.join(', ')})`;
    },

    generateLegendSteps(numSteps = 5, strength = 2) {
      const steps = [];
      
      for (let i = 0; i < numSteps; i++) {
        const transformedPosition = i / (numSteps - 1);
        const normalizedValue = this.inverseLogTransform(transformedPosition, strength);
        const realValue = normalizedValue * this.scaleDomain.delta + this.scaleDomain.min;
        const cssPosition = (transformedPosition) * 100;
        
        steps.push({
          value: realValue,
          position: cssPosition,
          normalizedValue: normalizedValue,
          transformedValue: transformedPosition
        });
      }
      
      return steps;
    },

    removeTrailingZero(code) {
      return code.startsWith('0') ? code.substring(1) : code
    },

    onMetricChange(metric) {
      // Update everything without reloading geojson

      this.updateRanking()
      this.updateLayerColors()
      this.updateLegend()
    },

    getIndiceName() {
      return this.selectedMetric[this.labelKey]
    },

    getMetricLabel(metric) {
      const metricMap = {
        total_score: 'Score global',
        crime_score: 'Criminalité',
        names_score: 'Prénoms',
        qpv_score: 'QPV'
      }
      return metricMap[metric] || metric
    },

  },

  beforeUnmount() {
    if (this.map) {
      this.map.remove()
    }
  }
}
</script>
<style>
.map-container {
  width: 100%;
  height: 500px;
}

.map-legend {
  display: flex;
  flex-direction: column;
  line-height: 18px;
  color: #555;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 8px;
  border-radius: 4px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

.map-legend-title {

}

.map-legend-scale {
  display: flex;
  height: 100px;
  padding: 8px 0;
  position: relative;
}

.map-legend-gradient {
  width: 18px;
  height: 100%;
  position: relative;
}

.map-legend-marker {
  position: absolute;
  width: 50%;
  height: 0;
  right: 0;
  border-top: 1px solid #0008;
  transform: translate(50%, -1px);
}

.map-legend-marker:first-child {
  transform: translate(50%, 0);
}

.map-legend-values {
  position: relative;
  height: 100%;
  flex: 1;
}

.map-legend-step {
  position: absolute;
  padding-left: 8px;
  left: 0;
  transform: translateY(-50%);
}
</style> 