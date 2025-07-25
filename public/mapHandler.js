import { MetricsConfig } from './metricsConfig.js';
import { normalizeDept } from './utils.js';

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

    // Function to validate department codes using utils
    const isValidDeptCode = (code) => {
        const normalized = normalizeDept(code);
        return /^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(normalized);
    };

    // Get metrics from centralized config
    const metrics = MetricsConfig.getMetricOptions();

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
                const normalizedDept = normalizeDept(dept.departement);
                if (isValidDeptCode(normalizedDept)) {
                    deptData[normalizedDept] = {
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
            geoData.features = geoData.features.filter((feature) => {
                const normalizedCode = normalizeDept(feature.properties.code);
                return isValidDeptCode(normalizedCode);
            });

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
    }

    /**
     * Determines color based on the metric value.
     * @param {number} value - The metric value.
     * @param {string} metric - The metric type.
     * @returns {string} The color code.
     */
    function getColor(value, metric) {
        if (value == null || isNaN(value)) return "#ccc";

        // Get min/max for the current metric
        const values = Object.values(deptData)
            .map((data) => data[metric])
            .filter((v) => v != null && !isNaN(v));
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
     * @returns {Object} The style object.
     */
    function getStyle(feature) {
        const code = feature.properties.code;
        const value = deptData[code] ? deptData[code][currentMetric] : null;
        return {
            fillColor: getColor(value, currentMetric),
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
     */
    function onEachFeature(feature, layer) {
        const code = normalizeDept(feature.properties.code);
        const name = feature.properties.nom;

        layer.on({
            mouseover: (e) => {
                e.target.setStyle({
                    weight: 3,
                    color: "#666",
                    dashArray: "",
                    fillOpacity: 0.9,
                });
                const value = deptData[code]
                    ? deptData[code][currentMetric]
                    : "N/A";
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
                geoJsonLayer.resetStyle(e.target);
            },
            click: () => {
                departementSelect.value = code;
                departementSelect.dispatchEvent(new Event("change"));
                map.setView([46.603354, 1.888334], 5); // Reset to France center
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
            const values = Object.values(deptData)
                .map((data) => data[currentMetric])
                .filter((v) => v != null && !isNaN(v));
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
                    getColor(grades[i], currentMetric) +
                    '"></i> ' +
                    formattedGrade +
                    (grades[i + 1] ? "–" + formattedNextGrade + "<br>" : "+");
            }
            return div;
        };
        legendControl.addTo(map);
    }

    initMap();

    return { updateMap };
}

// Export for ES6 modules
export { MapHandler };