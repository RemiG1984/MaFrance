import { formatNumber, formatPercentage } from './utils.js';
import { DepartmentNames } from './departmentNames.js';
import { MetricsConfig } from './metricsConfig.js';

/**
 * Names Graph Handler module for displaying historical names data charts.
 * Manages Chart.js visualization of name evolution over time.
 * @returns {Object} Names graph handler interface
 */
function NamesGraphHandler() {
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
        };
    }

    /**
     * Initializes Chart.js for names data visualization.
     */
    async function initChart() {
        const canvas = document.getElementById("namesChart");
        if (!canvas) {
            console.error('Canvas element with ID "namesChart" not found');
            return;
        }

        const { type, code, dept } = getUrlParams();

        try {
            let endpoint;
            let params = {};

            // Determine the endpoint based on type
            if (type === "country") {
                endpoint = "/api/country/names_history";
                params = { country: code || "France" };
            } else if (type === "department") {
                endpoint = "/api/departements/names_history";
                params = { dept: code };
            } else if (type === "commune") {
                if (!dept) {
                    throw new Error("Department code is required for commune");
                }
                endpoint = "/api/communes/names_history";
                params = { dept: dept, cog: code };
            } else {
                throw new Error("Invalid type parameter");
            }

            // Construct query string
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${endpoint}?${queryString}`);
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la récupération des données: ${response.statusText}`,
                );
            }

            const data = await response.json();
            console.log("Historical names data:", data);

            if (!data || data.length === 0) {
                document.body.innerHTML =
                    "<p>Aucune donnée disponible pour cet emplacement.</p>";
                return;
            }

            // Extract years and datasets
            const years = data.map((row) => row.annais);
            const categories = [
                {
                    key: "traditionnel_pct",
                    label: "Prénoms français traditionnels",
                    color: "#455a64",
                    order: 2,
                },
                {
                    key: "moderne_pct",
                    label: "Prénoms français modernes",
                    color: "#dc3545",
                    order: 3,
                },
                {
                    key: "europeen_pct",
                    label: "Prénoms européens",
                    color: "#007bff",
                    order: 4,
                },
                {
                    key: "invente_pct",
                    label: "Prénoms inventés",
                    color: "#17a2b8",
                    order: 5,
                },
                {
                    key: "musulman_pct",
                    label: "Prénoms musulmans",
                    color: "#28a745",
                    order: 1,
                }, // Frontmost
                {
                    key: "africain_pct",
                    label: "Prénoms africains",
                    color: "#6c757d",
                    order: 6,
                },
                {
                    key: "asiatique_pct",
                    label: "Prénoms asiatiques",
                    color: "#ffc107",
                    order: 7,
                }, // Backmost
            ];

            const datasets = categories.map((category) => ({
                label: category.label,
                data: data.map((row) => row[category.key] || 0),
                borderColor: category.color,
                backgroundColor: category.color,
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                order: category.order,
            }));

            // Determine chart title
            let titleText;
            if (type === "country") {
                titleText = "France";
            } else if (type === "department") {
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else {
                titleText = `Commune ${code}`;
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
                            align: "start", // Align legend items to the left
                            labels: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 14,
                                },
                                color: "#343a40",
                                boxWidth: 12, // Ensure consistent box size for alignment
                                padding: 10,
                            },
                        },
                        title: {
                            display: true,
                            text: `Évolution des prénoms de naissance (${titleText})`,
                            font: {
                                family: "'Roboto', Arial, sans-serif",
                                size: 22,
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
                        },
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: "Année",
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 16,
                                    weight: "600",
                                },
                                color: "#343a40",
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
                            max: 100,
                            title: {
                                display: false, // Remove y-axis title
                            },
                            ticks: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 12,
                                },
                                color: "#343a40",
                                callback: function (value) {
                                    return value + "%";
                                },
                            },
                            grid: {
                                color: "#ececec",
                            },
                        },
                    },
                },
            });
        } catch (error) {
            document.body.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la création du graphique:", error);
        }
    }

    return {
        initChart,
        getUrlParams
    };
}

// Export for ES6 modules
export { NamesGraphHandler };

// Initialize when the script loads (for backward compatibility)
if (typeof window !== 'undefined') {
    const namesGraphHandler = NamesGraphHandler();
    namesGraphHandler.initChart();
}