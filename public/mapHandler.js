import { MetricsConfig } from "./metricsConfig.js";
import { normalizeDept } from "./utils.js";

/**
 * Map handler module for displaying interactive maps with statistical data.
 * Manages map visualization, metric selection, and data overlays.
 * @param {HTMLElement} mapDiv - Container for the map
 * @param {HTMLSelectElement} departementSelect - Department selection dropdown
 * @param {HTMLElement} resultsDiv - Results display container
 * @param {Object} departmentNames - Department names mapping (no longer used for GeoJSON fetching)
 * @returns {Object} Map handler interface
 */
function MapHandler(mapDiv, departementSelect, resultsDiv, departmentNames) {
    let map;
    let geoJsonLayer;
    let deptData = {};
    let currentMetric = "total_score";
    let legendControl = null;

    // Listen for metric label changes
    window.addEventListener("metricsLabelsToggled", () => {
        updateLegend();
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

    // Cache for quantile calculations
    let quantileCache = {
        metric: null,
        isCommune: null,
        thresholds: null,
        grades: null,
        isDiscrete: null,
        uniqueValues: null,
        colorIndices: null
    };

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
                '©<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://ouvamafrance.replit.app">https://ouvamafrance.replit.app</a>',
        }).addTo(map);

        // Add fullscreen control (assuming Leaflet.fullscreen plugin is loaded)
        map.addControl(
            new L.Control.Fullscreen({
                position: "topleft",
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

        // Fetch Department GeoJSON
        try {
            const geoResponse = await fetch(
                "https://france-geojson.gregoiredavid.fr/repo/departements.geojson",
            );
            if (!geoResponse.ok)
                throw new Error("Failed to fetch Department GeoJSON");
            const geoData = await geoResponse.json();

            if (!geoData.features) {
                throw new Error("Invalid GeoJSON: 'features' property missing");
            }

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
            console.error("Error loading Department GeoJSON:", error);
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
        map.on("zoomend", () => {
            const zoom = map.getZoom();
            if (zoom < 8 && communeGeoJsonLayer) {
                map.removeLayer(communeGeoJsonLayer);
                communeGeoJsonLayer = null;
                geoJsonLayer.setStyle({ fillOpacity: 0.7 });
                currentDept = null;
                map.setView([46.603354, 1.888334], 5);
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
            console.log(`Loading commune data for department ${deptCode}...`);
            const response = await fetch(
                `/api/rankings/communes?dept=${deptCode}&limit=1000&sort=total_score&direction=DESC`,
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error (${response.status}):`, errorText);
                throw new Error(
                    `Failed to fetch commune rankings: ${response.status}`,
                );
            }

            const responseData = await response.json();
            const allData = responseData.data || responseData;

            console.log(
                `Loaded ${allData.length} communes for department ${deptCode}`,
            );

            let processedCount = 0;
            allData.forEach((comm) => {
                const keys = [
                    comm.cog,
                    comm.COG,
                    comm.code,
                    comm.insee,
                    comm.COM,
                ].filter(Boolean);

                if (keys.length === 0) {
                    console.warn("Commune with no valid COG keys:", comm);
                    return;
                }

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

                keys.forEach((key) => {
                    commData[key] = communeData;
                });
                processedCount++;
            });

            console.log(
                `Processed ${processedCount} communes with valid keys for department ${deptCode}`,
            );
            clearQuantileCache(); // Clear cache when new commune data is loaded
        } catch (error) {
            console.error(
                `Error fetching commune data for ${deptCode}:`,
                error,
            );
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

        const geoUrl = `https://geo.api.gouv.fr/departements/${deptCode}/communes?format=geojson&geometry=contour`;

        try {
            const response = await fetch(geoUrl);
            if (!response.ok)
                throw new Error(
                    `Failed to fetch commune GeoJSON: ${response.status}`,
                );
            const geoData = await response.json();

            if (!geoData.features) {
                throw new Error("Invalid GeoJSON: 'features' property missing");
            }

            // Verify geometry types (Polygon or MultiPolygon)
            geoData.features = geoData.features.filter((feature) => {
                const geomType = feature.geometry?.type;
                if (geomType !== "Polygon" && geomType !== "MultiPolygon") {
                    console.warn(
                        `Skipping feature with invalid geometry type: ${geomType}`,
                        feature,
                    );
                    return false;
                }
                return true;
            });

            communeGeoJsonLayer = L.geoJSON(geoData, {
                style: (feature) => getStyle(feature, true),
                onEachFeature: (feature, layer) =>
                    onEachFeature(feature, layer, true),
            }).addTo(map);

            geoJsonLayer.setStyle({ fillOpacity: 0.1 });
            updateLegend();
        } catch (error) {
            console.error(
                `Error loading commune GeoJSON for ${deptCode}:`,
                error,
            );
            resultsDiv.innerHTML += `<p>Erreur carte: ${error.message}</p>`;
        }
    }

    /**
     * Calculates quantiles for the current metric and data type, with caching.
     * @param {string} metric - The metric type.
     * @param {boolean} isCommune - Whether this is for commune data.
     * @returns {Object} Object containing thresholds and grades.
     */
    function calculateQuantiles(metric, isCommune = false) {
        // Check if we have cached results for this metric and data type
        if (quantileCache.metric === metric && 
            quantileCache.isCommune === isCommune && 
            quantileCache.thresholds !== null) {
            return {
                thresholds: quantileCache.thresholds,
                grades: quantileCache.grades,
                isDiscrete: quantileCache.isDiscrete,
                uniqueValues: quantileCache.uniqueValues,
                colorIndices: quantileCache.colorIndices
            };
        }

        const dataSource = isCommune ? commData : deptData;
        const values = Object.values(dataSource)
            .map((data) => data[metric])
            .filter((v) => v != null && !isNaN(v))
            .sort((a, b) => a - b);

        if (values.length === 0) {
            return { thresholds: [], grades: [], isDiscrete: false, uniqueValues: [], colorIndices: [] };
        }

        const uniqueValuesArr = [...new Set(values)].sort((a, b) => a - b);
        const numUnique = uniqueValuesArr.length;
        const numColors = 6;

        let thresholds, grades, isDiscrete = false, uniqueValues = [], colorIndices = [];

        if (numUnique <= numColors) {
            isDiscrete = true;
            uniqueValues = uniqueValuesArr;
            grades = uniqueValuesArr;
            thresholds = []; // Not used in discrete mode

            if (numUnique === 1) {
                colorIndices.push(0);
            } else {
                const colorStep = (numColors - 1) / (numUnique - 1);
                for (let i = 0; i < numUnique; i++) {
                    colorIndices.push(Math.floor(i * colorStep));
                }
            }

            // Set thresholds to midpoints for consistency, though not used
            for (let i = 0; i < numUnique - 1; i++) {
                thresholds.push((uniqueValues[i] + uniqueValues[i + 1]) / 2);
            }
        } else {
            isDiscrete = false;
            uniqueValues = [];
            colorIndices = [];

            thresholds = [];
            for (let i = 0; i < numColors - 1; i++) {
                const percentile = (i + 1) / numColors;
                const index = Math.floor(percentile * (values.length - 1));
                thresholds.push(values[Math.min(index, values.length - 1)]);
            }

            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            grades = [minVal, ...thresholds];

            const uniqueGrades = [...new Set(grades)].sort((a, b) => a - b);
            if (uniqueGrades.length < 4 && numUnique > 3) {
                const step = (maxVal - minVal) / numColors;
                thresholds = [];
                for (let i = 1; i < numColors; i++) {
                    thresholds.push(minVal + step * i);
                }
                grades = [minVal, ...thresholds];
            } else {
                grades = [minVal, ...thresholds];
            }
        }

        // Cache the results
        quantileCache.metric = metric;
        quantileCache.isCommune = isCommune;
        quantileCache.thresholds = thresholds;
        quantileCache.grades = grades;
        quantileCache.isDiscrete = isDiscrete;
        quantileCache.uniqueValues = uniqueValues;
        quantileCache.colorIndices = colorIndices;

        return { thresholds, grades, isDiscrete, uniqueValues, colorIndices };
    }

    /**
     * Clears the quantile cache when data changes.
     */
    function clearQuantileCache() {
        quantileCache.metric = null;
        quantileCache.isCommune = null;
        quantileCache.thresholds = null;
        quantileCache.grades = null;
        quantileCache.isDiscrete = null;
        quantileCache.uniqueValues = null;
        quantileCache.colorIndices = null;
    }

    /**
     * Determines color based on the metric value using quantile-based distribution.
     * @param {number} value - The metric value.
     * @param {string} metric - The metric type.
     * @param {boolean} isCommune - Whether this is for commune data.
     * @returns {string} The color code.
     */
    function getColor(value, metric, isCommune = false) {
        if (value == null || isNaN(value)) return "#ccc";

        const { thresholds, isDiscrete, uniqueValues, colorIndices } = calculateQuantiles(metric, isCommune);

        const colors = [
            "#ffeda0",
            "#feb24c", 
            "#fd8d3c",
            "#fc4e2a",
            "#e31a1c",
            "#b10026",
        ];

        let colorIndex;

        if (isDiscrete) {
            const idx = uniqueValues.indexOf(value);
            if (idx === -1) return "#ccc";
            colorIndex = colorIndices[idx];
            if (metric === "prenom_francais_pct") {
                colorIndex = colors.length - 1 - colorIndex;
            }
        } else {
            let adjustedValue = value;
            let adjustedThresholds = thresholds;
            colorIndex = 0;
            for (let i = 0; i < adjustedThresholds.length; i++) {
                if (adjustedValue >= adjustedThresholds[i]) {
                    colorIndex = i + 1;
                }
            }
            if (metric === "prenom_francais_pct") {
                colorIndex = colors.length - 1 - colorIndex;
            }
        }

        return colors[colorIndex];
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
            const possibleCodes = [
                feature.properties.code,
                feature.properties.insee,
                feature.properties.COG,
                feature.properties.cog,
                feature.properties.COM,
                feature.properties.Code_INSEE,
                feature.properties.INSEE_COM,
                feature.properties.codgeo,
            ];

            // First try to find exact match
            code = possibleCodes.find((c) => c && commData[c]);

            // If no exact match, try normalized versions (5-digit to 4-digit for single-digit departments)
            if (!code) {
                const normalizedCodes = possibleCodes.map(c => {
                    if (typeof c === 'string' && /^0[1-9]\d{3}$/.test(c)) {
                        return c.substring(1); // Convert "01002" to "1002"
                    }
                    return c;
                }).filter(Boolean);

                code = normalizedCodes.find((c) => c && commData[c]) || possibleCodes.find((c) => c);
            }
        } else {
            code = feature.properties.code;
        }

        const data = isCommune ? commData[code] : deptData[code];
        const value = data ? data[currentMetric] : null;

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
            const possibleCodes = [
                feature.properties.code,
                feature.properties.insee,
                feature.properties.COG,
                feature.properties.cog,
                feature.properties.COM,
                feature.properties.Code_INSEE,
                feature.properties.INSEE_COM,
                feature.properties.codgeo,
            ];

            // First try to find exact match
            code = possibleCodes.find((c) => c && commData[c]);

            // If no exact match, try normalized versions (5-digit to 4-digit for single-digit departments)
            if (!code) {
                const normalizedCodes = possibleCodes.map(c => {
                    if (typeof c === 'string' && /^0[1-9]\d{3}$/.test(c)) {
                        return c.substring(1); // Convert "01002" to "1002"
                    }
                    return c;
                }).filter(Boolean);

                code = normalizedCodes.find((c) => c && commData[c]) || possibleCodes.find((c) => c);
            }
        } else {
            code = feature.properties.code;
        }

        const name =
            feature.properties.nom ||
            feature.properties.NOM ||
            feature.properties.name;
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
                const formattedValue = MetricsConfig.formatMetricValue(
                    value,
                    currentMetric,
                );
                layer
                    .bindPopup(
                        `<b>${name} (${code})</b><br>${metricLabel}: ${formattedValue}`,
                        { className: "custom-popup", closeButton: false, autoPan: false },
                    )
                    .openPopup();
            },
            mouseout: (e) => {
                (isCommune ? communeGeoJsonLayer : geoJsonLayer).resetStyle(
                    e.target,
                );
            },
            click: async () => {
                if (!isCommune) {
                    const normalizedCode = normalizeDept(code);
                    currentDept = normalizedCode;
                    const bounds = layer.getBounds();
                    map.fitBounds(bounds);
                    await loadCommuneData(normalizedCode);
                    await loadCommuneGeoJson(normalizedCode);
                    departementSelect.value = normalizedCode;
                    departementSelect.dispatchEvent(new Event("change"));
                } else if (window.updateSelectedCommune) {
                    window.updateSelectedCommune(code);
                } else {
                    console.warn(
                        "updateSelectedCommune function not found in main.js",
                    );
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
        clearQuantileCache(); // Clear cache when metric changes
        if (geoJsonLayer) {
            geoJsonLayer.eachLayer((layer) => geoJsonLayer.resetStyle(layer));
        }
        if (communeGeoJsonLayer) {
            communeGeoJsonLayer.eachLayer((layer) =>
                communeGeoJsonLayer.resetStyle(layer),
            );
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
            const isInCommuneView = communeGeoJsonLayer !== null;
            const dataSource = isInCommuneView ? commData : deptData;

            const values = Object.values(dataSource)
                .map((data) => data[currentMetric])
                .filter((v) => v != null && !isNaN(v))
                .sort((a, b) => a - b); // Sort for quantile calculation

            if (values.length === 0) {
                div.innerHTML = "<h4>No data available</h4>";
                return div;
            }

            // Use cached quantile calculation
            const { grades, isDiscrete, uniqueValues, colorIndices } = calculateQuantiles(currentMetric, isInCommuneView);

            const metricLabel = MetricsConfig.getMetricLabel(currentMetric);
            const viewLabel = isInCommuneView ? ` (${currentDept})` : "";
            div.innerHTML = "<h4>" + metricLabel + viewLabel + "</h4>";
            const colors = [
                "#ffeda0",
                "#feb24c", 
                "#fd8d3c",
                "#fc4e2a",
                "#e31a1c",
                "#b10026",
            ];
            if (isDiscrete) {
                for (let i = 0; i < uniqueValues.length; i++) {
                    let ci = colorIndices[i];
                    if (currentMetric === "prenom_francais_pct") {
                        ci = colors.length - 1 - ci;
                    }
                    // Round value to avoid precision issues before formatting
                    const roundedValue = Math.round(uniqueValues[i] * 10) / 10;
                    const formattedValue = MetricsConfig.formatMetricValue(roundedValue, currentMetric);
                    div.innerHTML += '<i style="background:' + colors[ci] + '"></i> ' + formattedValue + "<br>";
                }
            } else {
                let legendColors = [...colors];
                if (currentMetric === "prenom_francais_pct") {
                    legendColors.reverse();
                }
                for (let i = 0; i < grades.length; i++) {
                    // Round values to avoid precision issues before formatting
                    const roundedGrade = Math.round(grades[i] * 10) / 10;
                    const formattedGrade = MetricsConfig.formatMetricValue(
                        roundedGrade,
                        currentMetric,
                    );
                    const formattedNextGrade = grades[i + 1]
                        ? MetricsConfig.formatMetricValue(
                              Math.round(grades[i + 1] * 10) / 10,
                              currentMetric,
                          )
                        : "+";
                    div.innerHTML +=
                        '<i style="background:' +
                        legendColors[i] +
                        '"></i> ' +
                        formattedGrade +
                        (grades[i + 1] ? "–" + formattedNextGrade + "<br>" : "+");
                }
            }
            return div;
        };
        legendControl.addTo(map);
    }

    /**
     * Updates the metric selector dropdown with current labels
     */
    function updateMetricSelector() {
        const metricSelect = document.querySelector(
            ".leaflet-control-metric select",
        );
        if (metricSelect) {
            const currentValue = metricSelect.value;
            metricSelect.innerHTML = "";

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
        get currentMetric() {
            return currentMetric;
        },
    };
}

// Export for ES6 modules
export { MapHandler };