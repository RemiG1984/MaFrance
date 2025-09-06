
<template>
  <v-card>
    <v-card-text class="pa-0 position-relative">
      <div id="francocides-map" class="map-container"></div>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { DepartementNames } from '../utils/departementNames.js'
import chroma from "chroma-js";
import { markRaw } from 'vue'

export default {
  name: 'FrancocidesMap',
  data() {
    return {
      map: null,
      layerGroup: null,
      departementsLayer: null,
      globalTooltip: null,
      scaleColors: ['#ffffe0', '#ffd59b', '#ffa474', '#f47461', '#db4551', '#b81b34', '#8b0000'],
      scaleDomain: {
        min: 0,
        max: 10,
        delta: 10,
      },
      dataRef: {},
      colorscale: null,
    }
  },
  computed: {
    ...mapStores(useDataStore),
    francocidesData() {
      return this.dataStore.memorials.victims;
    },
  },
  watch: {
    francocidesData: {
      handler() {
        this.updateData();
      },
      deep: true
    }
  },
  async mounted() {
    await this.initMap();
    this.colorscale = chroma.scale(this.scaleColors).domain([0, 1]);
    this.updateData();
  },
  methods: {
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
      
      this.map = markRaw(L.map('francocides-map', {
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
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://ouvamafrance.replit.app">https://ouvamafrance.replit.app</a>'
      }).addTo(this.map)
      
      if (L.Control.Fullscreen) {
        this.map.addControl(new L.Control.Fullscreen({
          position: "topleft"
        }))
      }
      
      await this.loadDepartementsGeoJson()
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
    
    updateData() {
      this.updateRanking();
      this.updateLayerColors();
    },
    
    updateRanking() {
      const rankingsRef = {};
      this.scaleDomain = {
        min: Infinity,
        max: -Infinity,
        delta: 0,
      };

      // Count francocides per département
      const deptCounts = {};
      if (this.francocidesData && Array.isArray(this.francocidesData)) {
        this.francocidesData.forEach(victim => {
          if (victim.lieu_departement) {
            const dept = victim.lieu_departement.toString().padStart(2, '0');
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          }
        });
      }

      // Update scale domain and create data reference
      Object.entries(deptCounts).forEach(([dept, count]) => {
        if (DepartementNames[dept]) {
          rankingsRef[dept] = { count };
          this.scaleDomain.min = Math.min(this.scaleDomain.min, count);
          this.scaleDomain.max = Math.max(this.scaleDomain.max, count);
        }
      });

      // Ensure minimum range
      if (this.scaleDomain.min === Infinity) {
        this.scaleDomain.min = 0;
        this.scaleDomain.max = 1;
      }
      
      this.scaleDomain.delta = this.scaleDomain.max - this.scaleDomain.min || 1;
      this.dataRef = rankingsRef;
    },
    
    updateLayerColors() {
      if (this.departementsLayer) {
        this.departementsLayer.eachLayer((layer) => {
          const newStyle = this.getStyle(layer.feature);
          layer.setStyle(newStyle);
        });
      }
    },
    
    getStyle(feature) {
      const value = this.getFeatureValue(feature);
      if (value === null || value === 0) {
        return {
          fillColor: '#ffffff',
          weight: 1,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.3
        };
      }
      const color = this.getColor(value);
      return {
        fillColor: color,
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      };
    },
    
    getColor(value) {
      const normalized = (value - this.scaleDomain.min) / this.scaleDomain.delta;
      return this.colorscale(normalized);
    },
    
    getFeatureValue(feature) {
      const { properties } = feature;
      if (!this.dataRef || !properties) return null;
      
      const code = properties.code;
      if (this.dataRef.hasOwnProperty(code) && this.dataRef[code].hasOwnProperty('count')) {
        return this.dataRef[code].count;
      }
      return null;
    },
    
    onEachDepartementFeature(feature, layer) {
      const deptCode = feature.properties.code;
      const deptName = feature.properties.nom;
      
      layer.on({
        click: () => {
          this.filterByDepartement(deptCode, deptName);
        }
      });
      
      layer.on('mouseover', (e) => {
        this.showTooltip(e, feature);
      });
      
      layer.on('mouseout', (e) => {
        this.hideTooltip(e);
      });
    },
    
    filterByDepartement(deptCode, deptName) {
      // Toggle the département tag in the store
      const tagName = `Département ${deptName}`;
      this.dataStore.toggleSelectedTag(tagName);
    },
    
    showTooltip(e, feature) {
      const { properties } = feature;
      const layer = e.target;
      const center = layer.getCenter();
      
      layer.bringToFront();
      layer.setStyle({
        color: '#424242',
        weight: 2,
        opacity: 0.8
      });
      
      const value = this.getFeatureValue(feature) || 0;
      const content = `<b>${properties.nom}</b><br>Francocides: ${value}`;
      
      this.globalTooltip
        .setLatLng(center)
        .setContent(content)
        .addTo(this.map);
    },
    
    hideTooltip(e) {
      const layer = e.target;
      layer.setStyle({
        weight: 1,
        opacity: 1,
        color: 'white',
      });
      
      if (this.globalTooltip) {
        this.map.removeLayer(this.globalTooltip);
      }
    },
  },
  
  beforeUnmount() {
    if (this.map) {
      this.map.remove();
    }
  }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 400px;
}
</style>
