import { DepartmentNames } from './departmentNames.js';
import { MetricsConfig } from './metricsConfig.js';
import { api } from './apiService.js';

/**
 * Crime Graph Handler module for displaying crime statistics charts.
 * Manages Chart.js visualization of crime data over time with comparison lines.
 * @returns {Object} Crime graph handler interface
 */
function CrimeGraphHandler() {
    // Use shared department names
    const departmentNames = DepartmentNames;

    /**
     * Parses URL parameters for chart configuration.
     * @returns {Object} URL parameters object
     */
    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            type: urlParams.get("type"), // country, department, or commune
            code: urlParams.get("code"), // France, dept code, or COG
            dept: urlParams.get("dept"), // Department code for communes
            communeName: urlParams.get("commune"), // Commune name from URL
            labelState: urlParams.get("labelState"), // Label state from main page
        };
    }

    /**
     * Initialize label toggle functionality
     */
    function initLabelToggle() {
        const labelToggleBtn = document.getElementById("labelToggleBtn");
        if (!labelToggleBtn) return;

        // Set initial state from URL parameter
        const { labelState } = getUrlParams();
        if (labelState) {
            MetricsConfig.labelState = parseInt(labelState);
        }

        // Set initial button text and style
        const initialStateName = MetricsConfig.getLabelStateName();
        labelToggleBtn.textContent = MetricsConfig.getCurrentToggleButtonLabel();

        // Set initial button style
        labelToggleBtn.classList.remove('active', 'alt1', 'alt2');
        if (initialStateName !== 'standard') {
            labelToggleBtn.classList.add('active');
            labelToggleBtn.classList.add(initialStateName);
        }

        // Add click event listener
        labelToggleBtn.addEventListener('click', () => {
            MetricsConfig.cycleLabelState();

            // Update button text and style based on state
            const stateName = MetricsConfig.getLabelStateName();

            labelToggleBtn.textContent = MetricsConfig.getCurrentToggleButtonLabel();

            // Update button style
            labelToggleBtn.classList.remove('active', 'alt1', 'alt2');
            if (stateName !== 'standard') {
                labelToggleBtn.classList.add('active');
                labelToggleBtn.classList.add(stateName);
            }

            // Update page title
            document.title = MetricsConfig.getCurrentPageTitle() + " - Graphique de Criminalité";

            // Update header h1 text
            const headerH1 = document.querySelector('h1');
            if (headerH1) {
                headerH1.textContent = "Graphique des Statistiques de Criminalité";
            }

            // Update navigation links with current label state
            updateNavigationLinks();

            // Refresh charts with new labels
            initCrimeCharts();
        });
    }

    /**
     * Initializes multiple Chart.js instances for crime data visualization.
     */
    async function initCrimeCharts() {
        const chartGrid = document.getElementById("crimeChartGrid");
        if (!chartGrid) {
            console.error('Chart grid element with ID "crimeChartGrid" not found');
            return;
        }

        const { type, code, dept, communeName } = getUrlParams();

        try {
            let endpoint,
                params = {};
            let deptData = null,
                countryData = null,
                mainData = null;
            let titleText;

            // Determine the endpoint and title
            if (type === "country") {
                endpoint = "/api/country/crime_history";
                params = { country: code || "France" };
                titleText = "France";
            } else if (type === "department") {
                endpoint = "/api/departements/crime_history";
                params = { dept: code };
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else if (type === "commune") {
                if (!dept || !communeName) {
                    throw new Error(
                        "Department code and commune name are required for commune",
                    );
                }
                endpoint = "/api/communes/crime_history";
                params = { cog: code };
                titleText = `${communeName} (${dept})`;
            } else {
                throw new Error("Invalid type parameter");
            }

            // Fetch main data using convenience methods
            if (type === "country") {
                mainData = await api.getCountryCrimeHistory(code || "France");
            } else if (type === "department") {
                mainData = await api.getDepartmentCrimeHistory(code);
            } else if (type === "commune") {
                mainData = await api.getCommuneCrimeHistory(code);
            }
            console.log("Main crime data:", mainData);
            console.log("Main crime data:", mainData);

            if (!mainData || mainData.length === 0) {
                chartGrid.innerHTML =
                    "<p>Aucune donnée disponible pour cet emplacement.</p>";
                return;
            }

            // Fetch higher-level data
            if (type === "department" || type === "commune") {
                countryData = await api.getCountryCrimeHistory("France");
                console.log("Country crime data:", countryData);
            }

            if (type === "commune") {
                deptData = await api.getDepartmentCrimeHistory(dept);
                console.log("Department crime data:", deptData);
            }

            // Extract years (use main data years as reference)
            const years = mainData.map((row) => row.annee);

            // Define all possible crime categories
            const allCategories = [
                {
                    key: "homicides_p100k",
                    label: MetricsConfig.getMetricLabel("homicides_p100k"),
                    color: "#dc3545",
                },
                {
                    key: "violences_physiques_p1k",
                    label: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                    color: "#007bff",
                },
                {
                    key: "violences_sexuelles_p1k",
                    label: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                    color: "#28a745",
                },
                { 
                    key: "vols_p1k", 
                    label: MetricsConfig.getMetricLabel("vols_p1k"), 
                    color: "#ffc107" 
                },
                {
                    key: "destructions_p1k",
                    label: MetricsConfig.getMetricLabel("destructions_p1k"),
                    color: "#e83e8c",
                },
                {
                    key: "stupefiants_p1k",
                    label: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                    color: "#17a2b8",
                },
                {
                    key: "escroqueries_p1k",
                    label: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                    color: "#fd7e14",
                },
            ];

            // Filter categories based on availability at current level
            const currentLevel = type === "commune" ? "commune" : 
                                type === "department" ? "departement" : "france";
            const categories = allCategories.filter(category => 
                MetricsConfig.isMetricAvailable(category.key, currentLevel)
            );

            // Clear existing charts before creating new ones
            chartGrid.innerHTML = '';

            // Create a chart for each category
            categories.forEach((category, index) => {
                createCrimeChart(category, index, {
                    mainData,
                    countryData,
                    deptData,
                    years,
                    titleText,
                    type,
                    dept,
                    chartGrid
                });
            });
        } catch (error) {
            chartGrid.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error(
                "Erreur lors de la création des graphiques de criminalité:",
                error,
            );
        }
    }

    /**
     * Creates an individual crime chart for a specific category.
     * @param {Object} category - Crime category configuration
     * @param {number} index - Chart index
     * @param {Object} data - Chart data and configuration
     */
    function createCrimeChart(category, index, { mainData, countryData, deptData, years, titleText, type, dept, chartGrid }) {
        // Create chart container and canvas
        const chartContainer = document.createElement("div");
        chartContainer.className = "chart-container";
        const canvas = document.createElement("canvas");
        canvas.id = `crimeChart_${index}`;
        chartContainer.appendChild(canvas);
        chartGrid.appendChild(chartContainer);

        // Calculate data for the main level
        const mainDataValues = mainData.map((row) => {
            return calculateCrimeValue(row, category.key);
        });

        // Calculate data for country level (if applicable)
        let countryDataValues = null;
        if (countryData && (type === "department" || type === "commune")) {
            countryDataValues = countryData.map((row) => {
                const value = calculateCrimeValue(row, category.key);
                return Math.min(
                    value,
                    category.key === "homicides_p100k" ? 1000 : 100,
                );
            });
        }

        // Calculate data for department level (if commune)
        let deptDataValues = null;
        if (deptData && type === "commune") {
            deptDataValues = deptData.map((row) => {
                const value = calculateCrimeValue(row, category.key);
                return Math.min(
                    value,
                    category.key === "homicides_p100k" ? 1000 : 100,
                );
            });
        }

        console.log(
            `${category.label} main data values:`,
            mainDataValues,
        );
        if (countryDataValues)
            console.log(
                `${category.label} country data values:`,
                countryDataValues,
            );
        if (deptDataValues)
            console.log(
                `${category.label} department data values:`,
                deptDataValues,
            );

        // Calculate suggestedMax for y-axis
        const allValues = [...mainDataValues];
        if (countryDataValues) allValues.push(...countryDataValues);
        if (deptDataValues) allValues.push(...deptDataValues);
        const maxDataValue = Math.max(...allValues);
        const suggestedMax = Math.ceil(maxDataValue * 1.1) || 1;
        const tickPrecision = 1;

        // Determine y-axis title
        const yAxisTitle =
            category.key === "homicides_p100k"
                ? "Taux (pour 100k habitants)"
                : "Taux (pour mille habitants)";

        // Prepare datasets
        const datasets = [
            {
                label: titleText,
                data: mainDataValues,
                borderColor: category.color,
                backgroundColor: category.color,
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
            },
        ];

        if (countryDataValues && (type === "department" || type === "commune")) {
            datasets.push({
                label: "France",
                data: countryDataValues,
                borderColor: "#808080",
                backgroundColor: "#808080",
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
            });
        }

        if (deptDataValues && type === "commune") {
            datasets.push({
                label: `${dept} - ${departmentNames[dept] || dept}`,
                data: deptDataValues,
                borderColor: "#A9A9A9",
                backgroundColor: "#A9A9A9",
                borderDash: [10, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
            });
        }

        // Create the chart
        new Chart(canvas, {
            type: "line",
            data: {
                labels: years,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 14,
                            },
                            color: "#343a40",
                        },
                    },
                    title: {
                        display: true,
                        text: category.label,
                        font: {
                            family: "'Roboto', Arial, sans-serif",
                            size: 18,
                            weight: "700",
                        },
                        color: "#343a40",
                        padding: {
                            top: 10,
                            bottom: 20,
                        },
                    },
                    tooltip: {
                        backgroundColor: "#fff",
                        titleColor: "#343a40",
                        bodyColor: "#343a40",
                        borderColor: "#dee2e6",
                        borderWidth: 1,
                        titleFont: {
                            family: "'Roboto', Arial, sans-serif",
                            size: 14,
                        },
                        bodyFont: {
                            family: "'Roboto', Arial, sans-serif",
                            size: 12,
                        },
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || "";
                                if (label) {
                                    label += ": ";
                                }
                                const unit =
                                    context.dataset.label.includes(
                                        "Homicides",
                                    )
                                        ? " (pour 100k hab.)"
                                        : " (pour mille hab.)";
                                return (
                                    label +
                                    context.parsed.y.toFixed(
                                        tickPrecision,
                                    ) +
                                    unit
                                );
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: false,
                        },
                        ticks: {
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 12,
                            },
                            color: "#343a40",
                        },
                        grid: {
                            color: "#ececec",
                        },
                    },
                    y: {
                        beginAtZero: true,
                        max: suggestedMax,
                        ticks: {
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 12,
                            },
                            color: "#343a40",
                            callback: function (value) {
                                return value.toFixed(tickPrecision);
                            },
                        },
                        grid: {
                            color: "#ececec",
                        },
                        title: {
                            display: true,
                            text: yAxisTitle,
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 14,
                                weight: "600",
                            },
                            color: "#343a40",
                        },
                    },
                },
            },
        });
    }

    /**
     * Calculates crime value based on category key using centralized MetricsConfig.
     * @param {Object} row - Data row
     * @param {string} key - Category key
     * @returns {number} Calculated crime value
     */
    function calculateCrimeValue(row, key) {
        // Map key names to MetricsConfig calculated metrics
        const metricMapping = {
            "homicides_p100k": "homicides_total_p100k",
            "violences_physiques_p1k": "violences_physiques_p1k",
            "vols_p1k": "vols_p1k",
            "stupefiants_p1k": "stupefiants_p1k"
        };

        const mappedKey = metricMapping[key] || key;

        // Use MetricsConfig for calculated metrics, fallback to direct property access
        if (MetricsConfig.calculatedMetrics[mappedKey]) {
            return MetricsConfig.calculateMetric(mappedKey, row);
        } else if (key === "destructions_p1k") {
            return row.destructions_et_degradations_volontaires_p1k;
        } else {
            return row[key];
        }
    }

    /**
     * Updates navigation links with current label state
     */
    function updateNavigationLinks() {
        const backLink = document.querySelector('.nav-link[href="index.html"]');
        if (backLink && MetricsConfig.labelState > 0) {
            const url = new URL(backLink.href, window.location.origin);
            url.searchParams.set('labelState', MetricsConfig.labelState);
            backLink.href = url.toString();
        }
    }

    return {
        initCrimeCharts,
        getUrlParams,
        initLabelToggle,
        createCrimeChart,
        calculateCrimeValue,
        updateNavigationLinks
    };
}

// Export for ES6 modules
export { CrimeGraphHandler };

// Initialize when the script loads (for backward compatibility)
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const crimeGraphHandler = CrimeGraphHandler();

        // Set initial state from URL parameter
        const { labelState } = crimeGraphHandler.getUrlParams();
        if (labelState) {
            MetricsConfig.labelState = parseInt(labelState);
        }

        // Initialize label toggle with correct state
        crimeGraphHandler.initLabelToggle();

        // Update navigation links
        crimeGraphHandler.updateNavigationLinks();

        // Only auto-initialize on the dedicated crime graph page with valid URL parameters
        const { type } = crimeGraphHandler.getUrlParams();
        if (document.getElementById('crimeChartGrid') && type) {
            // Initialize charts with correct labels
            crimeGraphHandler.initCrimeCharts();
        }
    });
}