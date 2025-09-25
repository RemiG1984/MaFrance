<template>
  <v-card>
    <v-card-text class="pa-0 position-relative">
      <div id="map" class="map-container"></div>
      <v-select
        style="max-width: 300px; z-index: 99999; position: absolute; top: 10px; right: 10px;"
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
      selectedMetric: MetricsConfig.metrics[0],
      mapLevel: 'country',
      deptData: {},
      communeData: {},
      geoJsonLoaded: false,
      scaleColors: MetricsConfig.colorScale.defaultColors,
      scaleDomain: {
        min: Infinity,
        max: -Infinity,
        delta: 0,
      },
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
    labelKey() {
      const labelStateName = this.dataStore.getLabelStateName();
      switch (labelStateName) {
        case 'alt1':
          return 'alt1Label';
        case 'alt2':
          return 'alt2Label';
        case 'english':
          return 'englishLabel';
        default:
          return 'label';
      }
    },
    availableMetrics() {
      // Use level-1 since map displays data for the level below current navigation level
      // If current level is 'country', show departement metrics (departement data on map)
      // If current level is 'departement', show commune metrics (commune data on map)
      let dataLevel;
      if (this.currentLevel === 'country') {
        dataLevel = 'departement';
      } else if (this.currentLevel === 'departement') {
        dataLevel = 'commune';
      } else {
        // Fallback to current level for other cases
        dataLevel = this.currentLevel;
      }

      const metrics = MetricsConfig.getAvailableMetricOptions(dataLevel);
      return metrics.map(metric => {
        const metricConfig = MetricsConfig.getMetricByValue(metric.value);
        if (!metricConfig) return metric;

        const labelStateName = this.dataStore.getLabelStateName();
        let label;
        switch (labelStateName) {
          case 'alt1':
            label = metricConfig.alt1Label || metricConfig.label;
            break;
          case 'alt2':
            label = metricConfig.alt2Label || metricConfig.label;
            break;
          case 'english':
            label = metricConfig.englishLabel || metricConfig.label;
            break;
          default:
            label = metricConfig.label;
        }

        return {
          ...metric,
          label: label,
          alt1Label: metricConfig.alt1Label,
          alt2Label: metricConfig.alt2Label,
          englishLabel: metricConfig.englishLabel
        };
      });
    },
    mapState() {
      const level = this.currentLevel;
      const dept = this.currentdepartement;
      const mapLevel = level === 'country' ? 'country' : 'departement';
      return {
        level: mapLevel,
        departement: dept
      };
    }
  },
  watch: {
    mapState(newState, oldState) {
      if (!oldState ||
          newState.level !== oldState.level ||
          newState.departement !== oldState.departement) {
        this.updateData();
      }
    },
    currentLevel(newLevel) {
      // Use level-1 logic for determining data level
      let dataLevel;
      if (newLevel === 'country') {
        dataLevel = 'departement';
      } else if (newLevel === 'departement') {
        dataLevel = 'commune';
      } else {
        dataLevel = newLevel;
      }

      const newMetrics = MetricsConfig.getAvailableMetricOptions(dataLevel);
      const isCurrentMetricAvailable = newMetrics.some(metric =>
        metric.value === this.selectedMetric.value
      );
      if (!isCurrentMetricAvailable && newMetrics.length > 0) {
        this.selectedMetric = newMetrics[0];
        this.onMetricChange(this.selectedMetric);
      }
    },
    'dataStore.levels.commune'(newCommune, oldCommune) {
      if (newCommune && newCommune !== oldCommune && this.currentLevel === 'commune') {
        this.showCommuneTooltipWhenReady();
      }
    },
    currentLevel(newLevel, oldLevel) {
      if (newLevel === 'commune' && oldLevel !== 'commune') {
        this.showCommuneTooltipWhenReady();
      }
    },
    'dataStore.selectedMetric': {
      handler(newMetric) {
        if (newMetric) {
          // Find the metric object that matches the value
          const metricObj = this.availableMetrics.find(m => m.value === newMetric);
          if (metricObj && metricObj.value !== this.selectedMetric.value) {
            this.selectedMetric = metricObj;
            // Trigger update immediately if data is available, or defer until data loads
            this.$nextTick(() => {
              if (this.dataRef && Object.keys(this.dataRef).length > 0) {
                this.updateRanking();
                this.updateLayerColors();
                this.updateLegend();
              }
            });
          }
        }
      },
      immediate: true
    },
    'dataStore.labelState': {
      handler() {
        // Update color scale when version changes
        this.updateColorScale();
        // Update layer colors and legend if data is available
        if (this.dataRef && Object.keys(this.dataRef).length > 0) {
          this.updateLayerColors();
          this.updateLegend();
        }
      },
      immediate: false
    },
  },
  mounted() {
    this.initMap()
    this.updateColorScale()

    // Listen for metric updates from LocationSelector
    window.addEventListener('updateMapMetric', this.handleMetricUpdate)

    // Listen for version changes
    window.addEventListener('versionChanged', this.handleVersionChange)
  },
  methods: {
    updateColorScale() {
      const labelStateName = this.dataStore.getLabelStateName();
      if (labelStateName === 'alt1') {
        this.scaleColors = MetricsConfig.colorScale.alt1Colors;
      } else {
        this.scaleColors = MetricsConfig.colorScale.defaultColors;
      }
      this.colorscale = chroma.scale(this.scaleColors).domain([0, 1]);
    },
    handleMetricUpdate(event) {
      const newMetricValue = event.detail.metric;
      const metricObj = this.availableMetrics.find(m => m.value === newMetricValue);
      if (metricObj && metricObj.value !== this.selectedMetric.value) {
        this.selectedMetric = metricObj;
        this.onMetricChange(this.selectedMetric);
      }
    },
    handleVersionChange() {
      this.updateData()
    },
    async initMap() {
      if (typeof L === 'undefined') {
        console.error('Leaflet not loaded')
        return
      }
      const p = 1
      const maxBounds = [
        [41.362164776515-p, -5.138001239929-p],
        [51.08854370897+p, 9.5592262719626+p],
      ]
      this.map = markRaw(L.map('map', {
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
        opacity: 0.9
      }))
      this.legendControl = markRaw(L.control({ position: "bottomleft" }))
      this.legendControl.onAdd = (map) => {
        const div = L.DomUtil.create("div", "map-legend");
        this.updateLegendContent(div)
        return div
      }
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> | <a href="https://mafrance.app">mafrance.app</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(this.map)
      if (L.control.fullscreen) {
        this.map.addControl(new L.control.fullscreen({
          position: "topleft"
        }))
      }
      await this.loadDepartementsGeoJson()
    },
    updateData(){
      // Sync selected metric with store
      if (this.dataStore.selectedMetric) {
        const metricObj = this.availableMetrics.find(m => m.value === this.dataStore.selectedMetric);
        if (metricObj && metricObj.value !== this.selectedMetric.value) {
          this.selectedMetric = metricObj;
        }
      }

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
      const level = isCountryLevel ? 'departement' : 'commune'

      // Debug: Check if MetricsConfig and getMetricColorScale are defined
      if (!MetricsConfig || typeof MetricsConfig.getMetricColorScale !== 'function') {
        console.error('MetricsConfig is undefined or getMetricColorScale is not a function:', MetricsConfig);
        return;
      }

      const colorScaleConfig = MetricsConfig.getMetricColorScale(this.selectedMetric.value, level);

      // Reset scaleDomain for dynamic scaling
      if (!colorScaleConfig.useFixedRange) {
        this.scaleDomain = {
          min: Infinity,
          max: -Infinity,
          delta: 0,
        }
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
        if(isCountryLevel && !DepartementNames[code]) return
        rankingsRef[code] = item

        // Update scaleDomain only for dynamic scaling
        if (!colorScaleConfig.useFixedRange) {
          const value = item[this.selectedMetric.value] || 0
          this.scaleDomain.min = Math.min(this.scaleDomain.min, value)
          this.scaleDomain.max = Math.max(this.scaleDomain.max, value)
        }
      })

      if (!colorScaleConfig.useFixedRange) {
        this.scaleDomain.delta = this.scaleDomain.max - this.scaleDomain.min
      }

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
        if(this.departementsLayer && this.layerGroup.hasLayer(this.departementsLayer)) {
          this.layerGroup.removeLayer(this.departementsLayer)
        }
        let geoUrl = ''
        if (deptCode === "75") {
          geoUrl = `https://geo.api.gouv.fr/communes?codeDepartement=75&type=arrondissement-municipal&format=geojson&geometry=contour`;
        } else {
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
        this.communesLayer.clearLayers()
      }
      if(this.departementsLayer && !this.layerGroup.hasLayer(this.departementsLayer)) {
        this.layerGroup.addLayer(this.departementsLayer)
        if (this.departementsLayer.getBounds && this.departementsLayer.getBounds().isValid()) {
          this.map.fitBounds(this.departementsLayer.getBounds(), {
            animate: true,
            duration: 1.5,
            easeLinearity: 0.25,
            padding: [1, 1]
          })
        }
      }
    },
    updateCommunesLayer(newGeoJson) {
      if (this.communesLayer) {
        this.communesLayer.clearLayers()
        this.communesLayer.addData(newGeoJson)
      } else {
        this.communesLayer = markRaw(L.geoJSON(newGeoJson, {
          style: this.getStyle.bind(this),
          onEachFeature: this.onEachCommuneFeature.bind(this)
        }))
        this.layerGroup.addLayer(this.communesLayer)
      }
      if (this.communesLayer.getBounds && this.communesLayer.getBounds().isValid()) {
        this.map.fitBounds(this.communesLayer.getBounds(), {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25,
          padding: [5, 5]
        })
      }
    },
    getStyle(feature) {
      const value = this.getFeatureValue(feature)
      if (value === null) {
        return {
          fillColor: '#ffffff',
          weight: 1,
          opacity: 0,
          color: 'white',
          fillOpacity: 0
        }
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
      layer.on('mouseover', (e) => {
        this.showTooltip(e, feature);
      })
      layer.on('mouseout', (e) => {
        this.hideTooltip(e);
      })
    },
    onEachCommuneFeature(feature, layer) {
      const commCode = this.removeTrailingZero(feature.properties.code)
      const commName = feature.properties.nom
      const deptCode = feature.properties.codeDepartement
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
      const level = this.mapState.level === 'country' ? 'departement' : 'commune'
      const colorScaleConfig = MetricsConfig.getMetricColorScale(this.selectedMetric.value, level);
      let normalized;

      if (colorScaleConfig.useFixedRange) {
        // Fixed range logic
        const { min, max, invert } = colorScaleConfig;
        if (value < min) {
          return invert ? this.scaleColors[this.scaleColors.length - 1] : '#ffffff';
        }
        if (value > max) {
          return invert ? '#ffffff' : this.scaleColors[this.scaleColors.length - 1];
        }
        normalized = (value - min) / (max - min);
        if (invert) {
          normalized = 1 - normalized;
        }
      } else {
        // Dynamic scaling logic (original behavior)
        normalized = (value - this.scaleDomain.min) / this.scaleDomain.delta;
        // Invert for specific metric (original behavior)
        if (this.selectedMetric.value === 'prenom_francais_pct') {
          normalized = 1 - normalized;
        }
      }

      return this.colorscale(this.logTransform(normalized, this.logStrength));
    },
    logTransform(value, strength = 2) {
      return Math.log(1 + value * (strength - 1)) / Math.log(strength);
    },
    inverseLogTransform(transformedValue, strength = 2) {
      return (Math.pow(strength, transformedValue) - 1) / (strength - 1);
    },
    getFeatureValue(feature) {
      const { properties } = feature;
      if (!this.dataRef || !properties) return null
      let code = null
      if (properties.hasOwnProperty('code')) {
        code = properties?.code
      } else {
        return null
      }
      if (properties.hasOwnProperty('codeDepartement')) {
        code = this.removeTrailingZero(code)
      }
      const metric = this.selectedMetric.value
      if (this.dataRef.hasOwnProperty(code) && this.dataRef[code].hasOwnProperty(metric)) {
        return this.dataRef[code][metric]
      }
      return null
    },
    showTooltip(e, feature) {
      const { properties } = feature;
      const layer = e.target
      const center = layer.getCenter()
      layer.bringToFront()
      layer.setStyle({
        color: '#424242',
        weight: 2,
        opacity: 0.8
      });
      let value = this.getFeatureValue(feature)
      const formattedValue = value !== null ? MetricsConfig.formatMetricValue(value, this.selectedMetric.value) : 'N/A'
      const indiceName = this.getIndiceName()
      const content = `<b>${properties.nom}</b><br>${indiceName}: ${formattedValue}`
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
      if (this.globalTooltip) {
        this.map.removeLayer(this.globalTooltip)
      }
    },
    updateLegend() {
      if (!this.legendControl) return
      if (this.map.hasLayer(this.legendControl)) {
        this.map.removeLayer(this.legendControl)
      }
      this.legendControl.addTo(this.map)
    },
    updateLegendContent(div) {
      const indiceName = this.getIndiceName()
      const gradient = this.generateVerticalGradient()
      const legendSteps = this.generateLegendSteps()
      let unitsDiv = ''
      let unitsMarkerDiv = ''
      const delta = legendSteps[legendSteps.length - 1].value - legendSteps[0].value
      for (const step of legendSteps) {
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
      const level = this.mapState.level === 'country' ? 'departement' : 'commune'
      const colorScaleConfig = MetricsConfig.getMetricColorScale(this.selectedMetric.value, level);
      
      const step = 100 / (this.scaleColors.length - 1);
      let colors = [...this.scaleColors];
      
      // For inverted metrics (or prenom_francais_pct in dynamic mode), reverse the color order in legend
      const shouldInvertLegend = (colorScaleConfig.useFixedRange && colorScaleConfig.invert) || 
                                 (!colorScaleConfig.useFixedRange && this.selectedMetric.value === 'prenom_francais_pct');
      
      if (shouldInvertLegend) {
        colors = colors.reverse();
      }
      
      const colorStops = colors.map((color, index) => {
        const position = index * step;
        return `${color} ${position}%`;
      });
      return `background: linear-gradient(to bottom, ${colorStops.join(', ')})`;
    },
    generateLegendSteps(numSteps = 5, strength = 2) {
      const steps = [];
      const level = this.mapState.level === 'country' ? 'departement' : 'commune'
      const colorScaleConfig = MetricsConfig.getMetricColorScale(this.selectedMetric.value, level);

      if (colorScaleConfig.useFixedRange) {
        const { min, max, invert } = colorScaleConfig;
        for (let i = 0; i < numSteps; i++) {
          const transformedPosition = i / (numSteps - 1);
          const normalizedValue = this.inverseLogTransform(transformedPosition, strength);
          let realValue = normalizedValue * (max - min) + min;
          if (invert) {
            realValue = max - (normalizedValue * (max - min));
          }
          const cssPosition = (invert ? (1 - transformedPosition) : transformedPosition) * 100;
          steps.push({
            value: realValue,
            position: cssPosition,
            normalizedValue: normalizedValue,
            transformedValue: transformedPosition
          });
        }
      } else {
        // Dynamic scaling for legend
        for (let i = 0; i < numSteps; i++) {
          const transformedPosition = i / (numSteps - 1);
          const normalizedValue = this.inverseLogTransform(transformedPosition, strength);
          const realValue = normalizedValue * this.scaleDomain.delta + this.scaleDomain.min;
          const cssPosition = (this.selectedMetric.value === 'prenom_francais_pct' ? (1 - transformedPosition) : transformedPosition) * 100;
          steps.push({
            value: realValue,
            position: cssPosition,
            normalizedValue: normalizedValue,
            transformedValue: transformedPosition
          });
        }
      }

      return steps;
    },
    removeTrailingZero(code) {
      return code.startsWith('0') ? code.substring(1) : code
    },
    onMetricChange(metric) {
      // Update store with selected metric
      this.dataStore.selectedMetric = metric.value;
      this.updateColorScale(); // Ensure scale colors are updated based on labelState
      this.updateRanking();
      this.updateLayerColors();
      this.updateLegend();

      // Update commune tooltip if at commune level and tooltip is active
      if (this.currentLevel === 'commune' && this.globalTooltip && this.map.hasLayer(this.globalTooltip)) {
        this.showCommuneTooltip();
      }
    },

    getIndiceName() {
      const metricConfig = MetricsConfig.getMetricByValue(this.selectedMetric.value);
      if (!metricConfig) return this.selectedMetric.value;
      const labelStateName = this.dataStore.getLabelStateName();
      switch (labelStateName) {
        case 'alt1':
          return metricConfig.alt1Label || metricConfig.label;
        case 'alt2':
          return metricConfig.alt2Label || metricConfig.label;
        case 'english':
          return metricConfig.englishLabel || metricConfig.label;
        default:
          return metricConfig.label;
      }
    },
    showCommuneTooltipWhenReady() {
      if (this.mapState.level === 'departement' || !this.communesLayer) {
        this.waitForMapOperationsComplete().then(() => {
          this.showCommuneTooltip();
        });
      } else {
        this.$nextTick(() => {
          this.showCommuneTooltip();
        });
      }
    },
    waitForMapOperationsComplete() {
      return new Promise((resolve) => {
        const onMoveEnd = () => {
          this.map.off('moveend', onMoveEnd);
          this.waitForCommuneLayerReady().then(resolve);
        };
        if (this.map._animatingZoom || this.map._panAnim) {
          this.map.on('moveend', onMoveEnd);
        } else {
          this.waitForCommuneLayerReady().then(resolve);
        }
      });
    },
    waitForCommuneLayerReady() {
      return new Promise((resolve) => {
        const checkLayer = () => {
          if (this.communesLayer && this.communesLayer.getLayers().length > 0) {
            resolve();
          } else {
            setTimeout(checkLayer, 100);
          }
        };
        checkLayer();
      });
    },
    showCommuneTooltip() {
      if (!this.communesLayer || this.currentLevel !== 'commune') return;
      const selectedCommune = this.dataStore.levels.commune;
      const selectedCommuneCode = this.dataStore.getCommuneCode();
      if (!selectedCommune || !selectedCommuneCode) return;
      let layerFound = false;
      this.communesLayer.eachLayer((layer) => {
        const feature = layer.feature;
        if (!feature || !feature.properties) return;
        const layerCode = this.removeTrailingZero(feature.properties.code);
        if (layerCode === selectedCommuneCode) {
          layerFound = true;
          const center = layer.getCenter();
          const value = this.getFeatureValue(feature);
          const formattedValue = value !== null ? MetricsConfig.formatMetricValue(value, this.selectedMetric.value) : 'N/A';
          const indiceName = this.getIndiceName();
          const content = `<b>${selectedCommune}</b><br>${indiceName}: ${formattedValue}`;
          if (this.globalTooltip && this.map.hasLayer(this.globalTooltip)) {
            this.map.removeLayer(this.globalTooltip);
          }
          this.globalTooltip
            .setLatLng(center)
            .setContent(content)
            .addTo(this.map);
          layer.setStyle({
            color: '#424242',
            weight: 3,
            opacity: 0.8
          });
          return false;
        }
      });
      if (!layerFound && this.communesLayer && this.communesLayer.getLayers().length > 0) {
        setTimeout(() => {
          this.showCommuneTooltip();
        }, 500);
      } else if (!layerFound) {
        console.log('Commune layer not ready, waiting...');
        this.waitForCommuneLayerReady().then(() => {
          this.showCommuneTooltip();
        });
      }
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
    window.removeEventListener('updateMapMetric', this.handleMetricUpdate)
    window.removeEventListener('versionChanged', this.handleVersionChange)
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