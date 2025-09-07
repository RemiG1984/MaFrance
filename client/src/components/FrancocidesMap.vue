
<template>
  <v-card>
    <v-card-text class="pa-0 position-relative">
      <div id="francocides-map" class="map-container"></div>
      <v-btn
        v-if="selectedDepartement"
        @click="clearDepartementFilter"
        color="primary"
        variant="elevated"
        size="small"
        class="france-button"
        prepend-icon="mdi-map"
      >
        France
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { DepartementNames } from '../utils/departementNames.js'
import { getDepartementFromCog, normalizeDepartementCode } from '../utils/gen.js'
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
      scaleColors: ['#ffffff', '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
      scaleDomain: {
        min: 0,
        max: 10,
        delta: 10,
      },
      dataRef: {},
      colorscale: null,
      legend: null,
      selectedDepartement: null,
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
    this.colorscale = chroma.scale(this.scaleColors).domain([0, 1]);
    await this.initMap();
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
      this.addLegend()
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
      if (this.map && this.legend) {
        this.updateLegend();
      }
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
          const deptCode = getDepartementFromCog(victim.cog);
          if (deptCode) {
            deptCounts[deptCode] = (deptCounts[deptCode] || 0) + 1;
          }
        });
      }

      // Update scale domain and create data reference
      Object.entries(deptCounts).forEach(([dept, count]) => {
        rankingsRef[dept] = { count };
        this.scaleDomain.min = Math.min(this.scaleDomain.min, count);
        this.scaleDomain.max = Math.max(this.scaleDomain.max, count);
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
          fillColor: '#f5f5f5',
          weight: 1,
          opacity: 0.8,
          color: '#cccccc',
          fillOpacity: 0.5
        };
      }
      const color = this.getColor(value);
      return {
        fillColor: color,
        weight: 1,
        opacity: 0.8,
        color: '#666666',
        fillOpacity: 0.8
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
      const deptCode = normalizeDepartementCode(feature.properties.code);
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
      // Set the selected département for filtering
      if (this.selectedDepartement === deptCode) {
        this.selectedDepartement = null;
      } else {
        this.selectedDepartement = deptCode;
      }
      
      // Update the store with the département filter
      this.dataStore.setDepartementFilter(this.selectedDepartement);
    },

    clearDepartementFilter() {
      this.selectedDepartement = null;
      this.dataStore.setDepartementFilter(null);
    },
    
    showTooltip(e, feature) {
      const { properties } = feature;
      const layer = e.target;
      const center = layer.getCenter();
      
      layer.bringToFront();
      layer.setStyle({
        color: '#424242',
        weight: 3,
        opacity: 1
      });
      
      const value = this.getFeatureValue(feature) || 0;
      const plural = value > 1 ? 's' : '';
      const content = `<div style="font-size: 14px; padding: 4px;">
                        <b>${properties.nom}</b><br>
                        <span style="color: #d32f2f; font-weight: bold;">${value} francocide${plural}</span>
                      </div>`;
      
      this.globalTooltip
        .setLatLng(center)
        .setContent(content)
        .addTo(this.map);
    },
    
    hideTooltip(e) {
      const layer = e.target;
      const originalStyle = this.getStyle(layer.feature);
      layer.setStyle(originalStyle);
      
      if (this.globalTooltip) {
        this.map.removeLayer(this.globalTooltip);
      }
    },
    
    addLegend() {
      const legend = markRaw(L.control({ position: 'bottomright' }));
      
      legend.onAdd = () => {
        const div = L.DomUtil.create('div', 'legend');
        div.style.backgroundColor = 'white';
        div.style.padding = '10px';
        div.style.border = '2px solid rgba(0,0,0,0.2)';
        div.style.borderRadius = '5px';
        div.style.fontSize = '12px';
        div.style.lineHeight = '18px';
        
        let html = '<strong>Francocides par département</strong><br>';
        
        // Create legend items based on current data
        if (this.scaleDomain.max > 0) {
          const steps = 5;
          for (let i = 0; i < steps; i++) {
            const value = Math.round((this.scaleDomain.max / steps) * (i + 1));
            const color = this.getColor(value);
            html += `<i style="background:${color}; width:18px; height:18px; float:left; margin-right:8px; opacity:0.8;"></i> ${value}<br>`;
          }
        } else {
          html += '<i style="background:#f5f5f5; width:18px; height:18px; float:left; margin-right:8px; opacity:0.5;"></i> Aucune donnée<br>';
        }
        
        div.innerHTML = html;
        return div;
      };
      
      legend.addTo(this.map);
      this.legend = legend;
    },
    
    updateLegend() {
      if (this.legend) {
        this.map.removeControl(this.legend);
      }
      this.addLegend();
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

.france-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
