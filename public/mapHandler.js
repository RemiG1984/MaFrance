import { MetricsConfig } from './metricsConfig.js';

/**
 * Map handler module for displaying interactive maps with statistical data.
 * Manages map visualization, metric selection, and data overlays.
 * @param {HTMLElement} mapDiv - Container for the map
 * @param {HTMLSelectElement} departementSelect - Department selection dropdown
 * @param {HTMLElement} resultsDiv - Results display container
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Map handler interface
 */
function MapHandler(mapDiv, departementSelect, resultsDiv, departmentNames) {
    let map;
    let geoJsonLayer;
    let deptData = {};
    let currentMetric = "total_score";
    let legendControl = null;

    // Listen for metric label changes
    window.addEventListener('metricsLabelsToggled', () => {
        updateLegend();
        // Update metric selector options if it exists
        updateMetricSelector();
    });

    // Valid department codes (mainland France + Corsica but not the DOM)
    const validDeptCodes = [
        ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, "0")), // 01–95
        "2A",
        "2B", // Corsica
    ];

    // Get metrics from centralized config
    const metrics = MetricsConfig.getMetricOptions();

    let communeGeoJsonLayer = null;
    let commData = {}; // Commune data cache (keyed by COG/INSEE code)
    let currentDept = null; // Currently selected department for commune view

    // Helper function: Slugify Department Name
    function slugify(name) {
        return name.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ /g, '-')
            .replace(/[^a-z0-9-]/g, ''); // Extra cleanup for safety
    }

    /**
     * Initializes the map, fetches data, and applies styling.
     */
    async function initMap() {
        // Main map centered on France (mainland + Corsica)
        map = L.map(mapDiv, {
            maxBounds: L.latLngBounds([41, -5], [51, 9]), // Constrain to France
            maxBoundsViscosity: 1.0, // Prevent panning outside
        }).setView([46.603354, 1.888334], 5); // Zoom 5 for full France view

        // Add basemap with custom attribution
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://ouvamafrance.replit.app">https://ouvamafrance.replit.app</a>', // Modified attribution
        }).addTo(map);

        // Add fullscreen control (assuming Leaflet.fullscreen plugin is loaded via script and CSS in HTML)
        map.addControl(
            new L.Control.Fullscreen({
                position: "topleft", // Standard location
            }),
        );

        // Fetch department data
        try {
            const response = await fetch(
                "/api/rankings/departements?limit=101&sort=total_score&direction=DESC",
            );
            if (!response.ok) {
                const errorData = await response.text();
                console.error("API error details:", errorData);
                throw new Error(
                    `Failed to fetch department rankings: ${response.status} - ${errorData}`,
                );
            }
            const { data } = await response.json();
            data.forEach((dept) => {
                if (validDeptCodes.includes(dept.departement)) {
                    deptData[dept.departement] = {
                        total_score: dept.total_score,
                        insecurite_score: dept.insecurite_score,
                        homicides_p100k: dept.homicides_p100k,
                        violences_physiques_p1k: dept.violences_physiques_p1k,
                        violences_sexuelles_p1k: dept.violences_sexuelles_p1k,
                        vols_p1k: dept.vols_p1k,
                        destructions_p1k: dept.destructions_p1k,
                        stupefiants_p1k: dept.stupefiants_p1k,
                        escroqueries_p1k: dept.escroqueries_p1k,
                        immigration_score: dept.immigration_score,
                        extra_europeen_pct: dept.extra_europeen_pct,
                        islamisation_score: dept.islamisation_score,
                        musulman_pct: dept.musulman_pct,
                        number_of_mosques: dept.number_of_mosques,
                        mosque_p100k: dept.mosque_p100k,
                        defrancisation_score: dept.defrancisation_score,
                        prenom_francais_pct: dept.prenom_francais_pct,
                        wokisme_score: dept.wokisme_score,
                        total_qpv: dept.total_qpv,
                        pop_in_qpv_pct: dept.pop_in_qpv_pct,
                        logements_sociaux_pct: dept.logements_sociaux_pct,
                    };
                }
            });
        } catch (error) {
            console.error("Error fetching dept data:", error);
            resultsDiv.innerHTML += `<p>Erreur carte: ${error.message}</p>`;
            return;
        }

        // Fetch GeoJSON
        try {
            const geoResponse = await fetch(
                "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson",
            );
            if (!geoResponse.ok) throw new Error("Failed to fetch GeoJSON");
            const geoData = await geoResponse.json();

            // Filter GeoJSON for mainland France and Corsica
            geoData.features = geoData.features.filter((feature) =>
                validDeptCodes.includes(feature.properties.code),
            );

            // Add GeoJSON to main map
            geoJsonLayer = L.geoJSON(geoData, {
                style: (feature) => getStyle(feature),
                onEachFeature: onEachFeature,
            }).addTo(map);

            updateLegend();
        } catch (error) {
            console.error("Error loading GeoJSON:", error);
            resultsDiv.innerHTML += `<p>Erreur carte: ${error.message}</p>`;
        }

        // Add metric selection control
        const MetricControl = L.Control.extend({
            options: { position: "topright" },

            onAdd: function (map) {
                this._container = L.DomUtil.create(
                    "div",
                    "leaflet-control-metric",
                );
                this._select = L.DomUtil.create("select", "", this._container);

                metrics.forEach((m) => {
                    const option = L.DomUtil.create("option", "", this._select);
                    option.value = m.value;
                    option.innerHTML = m.label;
                    if (m.value === currentMetric) option.selected = true;
                });

                L.DomEvent.on(this._select, "change", this._onChange, this);

                return this._container;
            },

            _onChange: function (e) {
                updateMap(e.target.value);
            },
        });

        map.addControl(new MetricControl());

        // Add zoomend listener for auto-hide commune layer
        map.on('zoomend', () => {
            const zoom = map.getZoom();
            if (zoom < 8 && communeGeoJsonLayer) { // Adjust threshold as needed
                map.removeLayer(communeGeoJsonLayer);
                communeGeoJsonLayer = null;
                geoJsonLayer.setStyle({ fillOpacity: 0.7 }); // Restore department visibility
                currentDept = null;
                map.setView([46.603354, 1.888334], 5); // Reset to France view
            }
        });

        // Add back button control
        const BackControl = L.Control.extend({
            options: { position: "topright" },
            onAdd: function (map) {
                const btn = L.DomUtil.create("button", "leaflet-control-back");
                btn.innerHTML = "Retour à la France";
                L.DomEvent.on(btn, "click", () => {
                    if (communeGeoJsonLayer) {
                        map.removeLayer(communeGeoJsonLayer);
                        communeGeoJsonLayer = null;
                    }
                    geoJsonLayer.setStyle({ fillOpacity: 0.7 });
                    currentDept = null;
                    map.setView([46.603354, 1.888334], 5);
                });
                return btn;
            },
        });
        map.addControl(new BackControl());
    }

    /**
     * Loads commune data for a department.
     * @param {string} deptCode - Department code
     */
    async function loadCommuneData(deptCode) {
        try {
            console.log(`Fetching commune data for department: ${deptCode}`);
            console.log(`API URL: /api/rankings/communes?dept=${deptCode}&limit=1000&sort=total_score&direction=DESC`);
            
            const response = await fetch(
                `/api/rankings/communes?dept=${deptCode}&limit=1000&sort=total_score&direction=DESC`
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error (${response.status}):`, errorText);
                throw new Error(`Failed to fetch commune rankings: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log('Full API response:', responseData);
            
            const data = responseData.data || responseData;
            console.log(`Loaded ${data.length} communes for department ${deptCode}`);
            console.log('First 3 commune records:', data.slice(0, 3));
            
            if (data.length > 0) {
                console.log('Sample commune data structure (all keys):', Object.keys(data[0]));
                console.log('Sample commune metrics:', {
                    total_score: data[0].total_score,
                    cog: data[0].cog,
                    COG: data[0].COG,
                    code: data[0].code,
                    commune: data[0].commune,
                    insecurite_score: data[0].insecurite_score
                });
            }
            data.forEach((comm) => {
                // Map commune data using multiple possible keys for better matching
                const keys = [
                    comm.cog,
                    comm.COG,
                    comm.code,
                    comm.insee,
                    comm.COM
                ].filter(Boolean);
                
                const communeData = {
                    total_score: comm.total_score,
                    insecurite_score: comm.insecurite_score,
                    homicides_p100k: comm.homicides_p100k,
                    violences_physiques_p1k: comm.violences_physiques_p1k,
                    violences_sexuelles_p1k: comm.violences_sexuelles_p1k,
                    vols_p1k: comm.vols_p1k,
                    destructions_p1k: comm.destructions_p1k,
                    stupefiants_p1k: comm.stupefiants_p1k,
                    escroqueries_p1k: comm.escroqueries_p1k,
                    immigration_score: comm.immigration_score,
                    extra_europeen_pct: comm.extra_europeen_pct,
                    islamisation_score: comm.islamisation_score,
                    musulman_pct: comm.musulman_pct,
                    number_of_mosques: comm.number_of_mosques,
                    mosque_p100k: comm.mosque_p100k,
                    defrancisation_score: comm.defrancisation_score,
                    prenom_francais_pct: comm.prenom_francais_pct,
                    wokisme_score: comm.wokisme_score,
                    total_qpv: comm.total_qpv,
                    pop_in_qpv_pct: comm.pop_in_qpv_pct,
                    logements_sociaux_pct: comm.logements_sociaux_pct,
                };
                
                // Store the data under all possible keys
                keys.forEach(key => {
                    commData[key] = communeData;
                });
                
                if (keys.length > 0) {
                    console.log(`Mapped commune: ${comm.commune} with keys: ${keys.join(', ')}`);
                } else {
                    console.log(`Warning: No valid key found for commune: ${comm.commune}`, comm);
                }
            });
        } catch (error) {
            console.error(`Error fetching commune data for ${deptCode}:`, error);
        }
    }

    /**
     * Loads commune GeoJSON for a department.
     * @param {string} deptCode - Department code
     */
    async function loadCommuneGeoJson(deptCode) {
        if (communeGeoJsonLayer) {
            map.removeLayer(communeGeoJsonLayer);
            communeGeoJsonLayer = null;
        }

        const deptName = departmentNames[deptCode];
        if (!deptName) return;

        const slug = slugify(deptName);
        const geoUrl = `https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/${deptCode}-${slug}/communes-${deptCode}-${slug}.geojson`;

        try {
            const response = await fetch(geoUrl);
            if (!response.ok) throw new Error('Failed to fetch commune GeoJSON');
            const geoData = await response.json();

            // Debug: Log commune GeoJSON feature properties
            if (geoData.features && geoData.features.length > 0) {
                console.log(`Department ${deptCode} - Total features: ${geoData.features.length}`);
                console.log('First 3 commune GeoJSON properties:', geoData.features.slice(0, 3).map(f => f.properties));
                console.log(`Available commune data codes (${Object.keys(commData).length}):`, Object.keys(commData).slice(0, 10));
                
                // Test property matching
                const sampleFeature = geoData.features[0];
                const possibleCodes = [
                    sampleFeature.properties.code,
                    sampleFeature.properties.insee,
                    sampleFeature.properties.COG,
                    sampleFeature.properties.cog,
                    sampleFeature.properties.COM
                ].filter(Boolean);
                console.log('Possible codes from first feature:', possibleCodes);
                
                // Check if any match our data
                possibleCodes.forEach(code => {
                    if (commData[code]) {
                        console.log(`✓ Found matching data for code: ${code}`);
                    } else {
                        console.log(`✗ No data found for code: ${code}`);
                    }
                });
            }

            communeGeoJsonLayer = L.geoJSON(geoData, {
                style: (feature) => getStyle(feature, true),
                onEachFeature: (feature, layer) => onEachFeature(feature, layer, true),
            }).addTo(map);

            // Make department layer semi-transparent
            geoJsonLayer.setStyle({ fillOpacity: 0.1 });

            updateLegend();
        } catch (error) {
            console.error(`Error loading commune GeoJSON for ${deptCode}:`, error);
        }
    }

    /**
     * Determines color based on the metric value.
     * @param {number} value - The metric value.
     * @param {string} metric - The metric type.
     * @param {boolean} isCommune - Whether this is for commune data.
     * @returns {string} The color code.
     */
    function getColor(value, metric, isCommune = false) {
        if (value == null || isNaN(value)) return "#ccc";

        // Get min/max for the current metric from the appropriate dataset
        const dataSource = isCommune ? commData : deptData;
        const values = Object.values(dataSource)
            .map((data) => data[metric])
            .filter((v) => v != null && !isNaN(v));

        if (values.length === 0) return "#ccc";

        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) return "#ffeda0"; // Single color if all values are the same

        // Normalize value to 0–1 range
        let normalized = (value - min) / (max - min);

        // Reverse for prenom_francais_pct (low bad = red, high good = yellow)
        if (metric === "prenom_francais_pct") {
            normalized = 1 - normalized;
        }

        // Color gradient (yellow/low to red/high; reversed for prenom_francais_pct)
        const colors = [
            "#ffeda0", // 0% (low/bad)
            "#feb24c",
            "#fd8d3c",
            "#fc4e2a",
            "#e31a1c",
            "#b10026", // 100% (high/good)
        ];
        const index = Math.min(
            Math.floor(normalized * (colors.length - 1)),
            colors.length - 1,
        );
        return colors[index];
    }

    /**
     * Gets the style for a GeoJSON feature.
     * @param {Object} feature - The GeoJSON feature.
     * @param {boolean} isCommune - Flag for commune mode.
     * @returns {Object} The style object.
     */
    function getStyle(feature, isCommune = false) {
        let code;
        if (isCommune) {
            // Try various property names that might contain the COG code
            const possibleCodes = [
                feature.properties.code,
                feature.properties.insee,
                feature.properties.COG,
                feature.properties.cog,
                feature.properties.COM,
                feature.properties.Code_INSEE,
                feature.properties.INSEE_COM,
                feature.properties.codgeo
            ];
            
            // Find the first code that has data
            code = possibleCodes.find(c => c && commData[c]);
            
            if (!code) {
                // If no match found, try the first non-null code anyway
                code = possibleCodes.find(c => c);
                console.log(`No matching data found for commune. Properties:`, Object.keys(feature.properties), 'Trying code:', code);
            }
        } else {
            code = feature.properties.code;
        }

        const data = isCommune ? commData[code] : deptData[code];
        const value = data ? data[currentMetric] : null;

        // Minimal logging for communes
        if (isCommune && !data && code) {
            console.log(`No data for commune code: ${code}`);
        }
        return {
            fillColor: getColor(value, currentMetric, isCommune),
            weight: 1,
            opacity: 1,
            color: "white",
            dashArray: "3",
            fillOpacity: 0.7,
        };
    }

    /**
     * Handles each GeoJSON feature.
     * @param {Object} feature - The GeoJSON feature.
     * @param {Object} layer - The Leaflet layer.
     * @param {boolean} isCommune - Flag for commune mode.
     */
    function onEachFeature(feature, layer, isCommune = false) {
        let code;
        if (isCommune) {
            // Try various property names that might contain the COG code
            const possibleCodes = [
                feature.properties.code,
                feature.properties.insee,
                feature.properties.COG,
                feature.properties.cog,
                feature.properties.COM,
                feature.properties.Code_INSEE,
                feature.properties.INSEE_COM,
                feature.properties.codgeo
            ];
            
            // Find the first code that has data
            code = possibleCodes.find(c => c && commData[c]);
            
            if (!code) {
                code = possibleCodes.find(c => c);
            }
        } else {
            code = feature.properties.code;
        }

        const name = feature.properties.nom || feature.properties.NOM || feature.properties.name;
        const data = isCommune ? commData[code] : deptData[code];

        layer.on({
            mouseover: (e) => {
                e.target.setStyle({
                    weight: 3,
                    color: "#666",
                    dashArray: "",
                    fillOpacity: 0.9,
                });
                const value = data ? data[currentMetric] : "N/A";
                const metricLabel = MetricsConfig.getMetricLabel(currentMetric);
                const formattedValue = MetricsConfig.formatMetricValue(value, currentMetric);
                layer
                    .bindPopup(
                        `<b>${name} (${code})</b><br>${metricLabel}: ${formattedValue}`,
                        {
                            className: "custom-popup",
                            closeButton: false,
                        },
                    )
                    .openPopup();
            },
            mouseout: (e) => {
                (isCommune ? communeGeoJsonLayer : geoJsonLayer).resetStyle(e.target);
            },
            click: async () => {
                if (!isCommune) {
                    // Department click: Zoom, load communes
                    currentDept = code;
                    const bounds = layer.getBounds();
                    map.fitBounds(bounds);
                    await loadCommuneData(code);
                    await loadCommuneGeoJson(code);
                    departementSelect.value = code;
                    departementSelect.dispatchEvent(new Event("change"));
                } else {
                    // Commune click: Handle if needed
                }
            },
        });
    }

    /**
     * Updates the map based on the selected metric.
     * @param {string} metric - The selected metric.
     */
    function updateMap(metric) {
        currentMetric = metric;
        if (geoJsonLayer) {
            geoJsonLayer.eachLayer((layer) => geoJsonLayer.resetStyle(layer));
        }
        if (communeGeoJsonLayer) {
            communeGeoJsonLayer.eachLayer((layer) => communeGeoJsonLayer.resetStyle(layer));
        }
        updateLegend();
    }

    /**
     * Updates the legend based on the current metric.
     */
    function updateLegend() {
        if (legendControl) {
            legendControl.remove();
        }

        legendControl = L.control({ position: "bottomleft" });
        legendControl.onAdd = () => {
            const div = L.DomUtil.create("div", "info legend");

            // Use commune data if we're in commune view, otherwise department data
            const isInCommuneView = communeGeoJsonLayer !== null;
            const dataSource = isInCommuneView ? commData : deptData;

            const values = Object.values(dataSource)
                .map((data) => data[currentMetric])
                .filter((v) => v != null && !isNaN(v));

            if (values.length === 0) {
                div.innerHTML = "<h4>No data available</h4>";
                return div;
            }

            const min = Math.min(...values);
            const max = Math.max(...values);
            const grades =
                min === max
                    ? [min]
                    : [
                          min,
                          min + (max - min) * 0.2,
                          min + (max - min) * 0.4,
                          min + (max - min) * 0.6,
                          min + (max - min) * 0.8,
                          max,
                      ];

            const metricLabel = MetricsConfig.getMetricLabel(currentMetric);
            div.innerHTML = "<h4>" + metricLabel + "</h4>";
            for (let i = 0; i < grades.length; i++) {
                const formattedGrade = MetricsConfig.formatMetricValue(
                    grades[i],
                    currentMetric,
                );
                const formattedNextGrade = grades[i + 1]
                    ? MetricsConfig.formatMetricValue(grades[i + 1], currentMetric)
                    : "+";
                div.innerHTML +=
                    '<i style="background:' +
                    getColor(grades[i], currentMetric, isInCommuneView) +
                    '"></i> ' +
                    formattedGrade +
                    (grades[i + 1] ? "–" + formattedNextGrade + "<br>" : "+");
            }
            return div;
        };
        legendControl.addTo(map);
    }

    /**
     * Updates the metric selector dropdown with current labels
     */
    function updateMetricSelector() {
        const metricSelect = document.querySelector('.leaflet-control-metric select');
        if (metricSelect) {
            const currentValue = metricSelect.value;
            metricSelect.innerHTML = '';

            const updatedMetrics = MetricsConfig.getMetricOptions();
            updatedMetrics.forEach((m) => {
                const option = L.DomUtil.create("option", "", metricSelect);
                option.value = m.value;
                option.innerHTML = m.label;
                if (m.value === currentValue) option.selected = true;
            });
        }
    }

    initMap();

    return { 
        updateMap,
        get currentMetric() { return currentMetric; }
    };
}

// Export for ES6 modules
export { MapHandler };