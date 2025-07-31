import { debounce } from './utils.js';
import { LocationHandler } from './locationHandler.js';
import { ScoreTableHandler } from './scoreTableHandler.js';
import { ExecutiveHandler } from './executiveHandler.js';
import { ArticleHandler } from './articleHandler.js';
import { MapHandler } from './mapHandler.js';
import { CrimeGraphHandler } from './crimeGraphHandler.js';
import { NamesGraphHandler } from './namesGraphHandler.js';
import { QpvHandler } from './qpvHandler.js';
import { DepartmentNames } from './departmentNames.js';
import { MetricsConfig } from './metricsConfig.js';
import { api } from './apiService.js';
import { spinner } from './spinner.js';

(function () {
    // Use shared department names
    const departmentNames = DepartmentNames;

    // DOM elements
    const departementSelect = document.getElementById("departementSelect");
    const communeInput = document.getElementById("communeInput");
    const communeList = document.getElementById("communeList");
    const lieuxSelect = document.getElementById("lieuxSelect");
    const resultsDiv = document.getElementById("results");
    const executiveDiv = document.getElementById("executiveDetails");
    const articleListDiv = document.getElementById("articleList");
    const filterButtonsDiv = document.getElementById("filterButtons");
    const mapDiv = document.getElementById('map');
    const crimeGraphsDiv = document.getElementById("crimeGraphs");
    const crimeChartGrid = document.getElementById("crimeChartGrid");
    const namesGraphDiv = document.getElementById("namesGraph");
    const namesChartContainer = document.getElementById("namesChartContainer");
    const qpvDataDiv = document.getElementById("qpvData");
    const qpvContainer = document.getElementById("qpvContainer");
    const labelToggleBtn = document.getElementById("labelToggleBtn");

    // Validate DOM elements
    if (
        !departementSelect ||
        !communeInput ||
        !communeList ||
        !lieuxSelect ||
        !resultsDiv ||
        !executiveDiv ||
        !articleListDiv ||
        !filterButtonsDiv ||
        !crimeGraphsDiv ||
        !crimeChartGrid ||
        !namesGraphDiv ||
        !namesChartContainer ||
        !qpvDataDiv ||
        !qpvContainer
    ) {
        console.error("One or more DOM elements are missing");
        return;
    }
    if (!mapDiv) {
        console.error('Map elements missing');
        return;
    }

    // Initialize all handlers immediately
    const locationHandler = LocationHandler(
        departementSelect,
        communeInput,
        communeList,
        lieuxSelect,
        resultsDiv,
        departmentNames,
    );

    const articleHandler = ArticleHandler(articleListDiv, filterButtonsDiv);
    const scoreTableHandler = ScoreTableHandler(resultsDiv, departmentNames);
    const executiveHandler = ExecutiveHandler(executiveDiv, departmentNames);
    const mapHandler = MapHandler(mapDiv, departementSelect, resultsDiv, departmentNames);
    const crimeGraphHandler = CrimeGraphHandler();
    const namesGraphHandler = NamesGraphHandler();
    const qpvHandler = QpvHandler();

    // Shared state
    let currentLieu = "";
    let allArticles = [];
    window.isMapClickInProgress = false; // Flag to prevent circular reference
    let isCommuneSelectionInProgress = false; // Flag to prevent department graphs during commune selection

    // Menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu toggle clicked');
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            console.log('Menu active class:', navMenu.classList.contains('active'));
        });

        // Close menu when a link is clicked
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // Highlight active page
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });

    // France button functionality
    const franceButton = document.getElementById('franceButton');
    if (franceButton) {
        franceButton.addEventListener('click', () => {
            // Reset all selections
            departementSelect.value = '';
            communeInput.value = '';
            currentLieu = "";
            
            // Clear other components
            locationHandler.resetCommuneAndLieux();
            articleHandler.clearArticles();
            articleHandler.setFilter(null);
            
            // Show country-level data
            scoreTableHandler.showCountryDetails();
            executiveHandler.showCountryExecutive();
            showCrimeGraphs("country", "France");
            showNamesGraph("country", "France");
            showQpvData("country", "France");
            
            // Restore map to initial France view (same as "Retour à la France" button)
            if (mapHandler && mapHandler.resetToFranceView) {
                mapHandler.resetToFranceView();
            }
            
            console.log("France level selected");
        });
    }

    // Event listeners
    departementSelect.addEventListener("change", () => {
        const departement = departementSelect.value;
        locationHandler.resetCommuneAndLieux();
        articleHandler.clearArticles();
        currentLieu = "";
        communeInput.value = "";
        articleHandler.setFilter(null);
        console.log("Reset filter on department change");
        if (departement) {
            scoreTableHandler.showDepartmentDetails(departement);
            executiveHandler.showDepartmentExecutive(departement);
            
            // Only show crime graphs if this isn't from a commune selection
            if (!isCommuneSelectionInProgress) {
                showCrimeGraphs("department", departement);
                showNamesGraph("department", departement);
                showQpvData("department", departement);
            }
            
            // Only show department popup if this isn't from a map click
            if (mapHandler && mapHandler.showDepartmentPopup && !window.isMapClickInProgress) {
                mapHandler.showDepartmentPopup(departement);
            }
            
            articleHandler.loadArticles(departement, "", "", locationHandler).then(() => {
                articleHandler.loadArticleCounts(departement).then((counts) => {
                    articleHandler.renderFilterButtons(
                        counts,
                        allArticles,
                        currentLieu,
                    );
                });
            });
        } else {
            scoreTableHandler.showCountryDetails();
            executiveHandler.showCountryExecutive();
            showCrimeGraphs("country", "France");
            showNamesGraph("country", "France");
            showQpvData("country", "France");
            articleHandler.clearArticles();
        }
    });

    const debouncedInputHandler = debounce(() => {
        const departement = departementSelect.value;
        const query = communeInput.value;
        locationHandler.handleCommuneInput(departement, query);

        if (query.length === 0) {
            locationHandler.resetCommuneAndLieux();
            articleHandler.clearArticles();
            currentLieu = "";
            articleHandler.setFilter(null);
            console.log("Reset filter on commune input");

            if (departement) {
                scoreTableHandler.showDepartmentDetails(departement);
                executiveHandler.showDepartmentExecutive(departement);
                showCrimeGraphs("department", departement);
                showNamesGraph("department", departement);
                showQpvData("department", departement);
                articleHandler.loadArticles(departement, "", "", locationHandler).then(() => {
                    articleHandler
                        .loadArticleCounts(departement)
                        .then((counts) => {
                            articleHandler.renderFilterButtons(
                                counts,
                                allArticles,
                                currentLieu,
                            );
                        });
                });
            } else {
                scoreTableHandler.showCountryDetails();
                executiveHandler.showCountryExecutive();
                showCrimeGraphs("country", "France");
                showNamesGraph("country", "France");
                showQpvData("country", "France");
                articleHandler.clearArticles();
            }
        }
    }, 300);

    communeInput.addEventListener("input", debouncedInputHandler);

    // Helper function to get COG for a commune
    async function getCOGForCommune(selectedCommune, departement) {
        let cog = locationHandler.getCOGForCommune(selectedCommune);
        
        if (!cog && departement) {
            const response = await fetch(
                `/api/communes?dept=${encodeURIComponent(departement)}&q=${encodeURIComponent(selectedCommune)}`
            );
            if (!response.ok) throw new Error("Erreur lors de la recherche");
            const communes = await response.json();
            const commune = communes.find((c) => c.commune === selectedCommune);
            if (commune) {
                cog = commune.COG;
            }
        }
        return cog;
    }

    communeInput.addEventListener("change", async () => {
        const selectedValue = communeInput.value.trim();
        const selectedCommune = selectedValue.includes(' (') 
            ? selectedValue.substring(0, selectedValue.lastIndexOf(' ('))
            : selectedValue;
        let departement = departementSelect.value;

        if (selectedCommune) {
            isCommuneSelectionInProgress = true; // Set flag to prevent department graphs
            try {
                const communeDept = locationHandler.getDepartmentForCommune(selectedCommune);

                // Auto-select department if not already selected, or update if different
                if (communeDept && (!departement || departement !== communeDept)) {
                    departement = communeDept;
                    departementSelect.value = departement;
                    departementSelect.dispatchEvent(new Event('change'));
                }

                const cog = await getCOGForCommune(selectedCommune, departement);

                if (cog && departement) {
                    communeInput.value = selectedCommune;
                    scoreTableHandler.showCommuneDetails(cog);
                    executiveHandler.showCommuneExecutive(cog);
                    showCrimeGraphs("commune", cog, departement, selectedCommune);
                    showNamesGraph("commune", cog, departement, selectedCommune);
                    showQpvData("commune", cog, departement, selectedCommune);
                    locationHandler.loadLieux(departement, cog);
                    articleHandler.loadArticles(departement, cog, "", locationHandler).then(() => {
                        articleHandler.loadArticleCounts(departement, cog).then((counts) => {
                            articleHandler.renderFilterButtons(counts, allArticles, currentLieu);
                        });
                    });

                    // Update map to center on department and select the commune
                    if (mapHandler && mapHandler.centerOnDepartmentAndSelectCommune) {
                        mapHandler.centerOnDepartmentAndSelectCommune(departement, cog);
                    }
                } else {
                    resultsDiv.innerHTML = "<p>Commune non trouvée.</p>";
                    executiveDiv.innerHTML = "<p>Commune non trouvée.</p>";
                    crimeChartGrid.innerHTML = "";
                }
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            } finally {
                isCommuneSelectionInProgress = false; // Clear flag after commune selection
            }
        }
    });

    lieuxSelect.addEventListener("change", async () => {
        const departement = departementSelect.value;
        const commune = communeInput.value.trim();
        currentLieu = lieuxSelect.value;

        if (departement && commune) {
            try {
                const cog = await getCOGForCommune(commune, departement);
                if (cog) {
                    articleHandler.loadArticles(departement, cog, currentLieu, locationHandler).then(() => {
                        articleHandler.loadArticleCounts(departement, cog, currentLieu).then((counts) => {
                            articleHandler.renderFilterButtons(counts, allArticles, currentLieu);
                        });
                    });
                } else {
                    console.error("COG not found for commune:", commune);
                }
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            }
        }
    });

    // Function to show crime graphs based on selection
    async function showCrimeGraphs(type, code, dept = null, communeName = null) {
        try {
            crimeChartGrid.innerHTML = "";
            
            let endpoint, params = {};
            let mainData = null, countryData = null, deptData = null;
            let titleText;

            // Determine the data to fetch and title
            if (type === "country") {
                mainData = await api.getCountryCrimeHistory(code || "France");
                titleText = "France";
            } else if (type === "department") {
                mainData = await api.getDepartmentCrimeHistory(code);
                countryData = await api.getCountryCrimeHistory("France");
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else if (type === "commune") {
                mainData = await api.getCommuneCrimeHistory(code);
                countryData = await api.getCountryCrimeHistory("France");
                if (dept) {
                    deptData = await api.getDepartmentCrimeHistory(dept);
                }
                titleText = `${communeName} (${dept})`;
            }

            if (!mainData || mainData.length === 0) {
                crimeChartGrid.innerHTML = "<p>Aucune donnée disponible au niveau commune.</p>";
                return;
            }

            // Create charts using the crime graph handler
            const years = mainData.map((row) => row.annee);
            
            // Define all available crime categories
            const categories = [
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
            const availableCategories = categories.filter(category => 
                MetricsConfig.isMetricAvailable(category.key, currentLevel)
            );

            // Create charts
            availableCategories.forEach((category, index) => {
                crimeGraphHandler.createCrimeChart(category, index, {
                    mainData,
                    countryData,
                    deptData,
                    years,
                    titleText,
                    type,
                    dept,
                    chartGrid: crimeChartGrid
                });
            });

        } catch (error) {
            crimeChartGrid.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la création des graphiques de criminalité:", error);
        }
    }

    // Function to show names graph based on selection
    async function showNamesGraph(type, code, dept = null, communeName = null) {
        try {
            // Ensure the names graph section has the proper structure
            const namesGraphSection = document.getElementById('namesGraph');
            if (!namesGraphSection) {
                console.error('Names graph section not found');
                return;
            }

            // Restore proper structure if it was replaced with error message
            let namesChartContainer = document.getElementById('namesChartContainer');
            if (!namesChartContainer) {
                namesGraphSection.innerHTML = `
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">
                        Évolution des Prénoms
                    </h2>
                    <div id="namesChartContainer" class="chart-container">
                        <canvas id="namesChart" style="max-height: 400px;"></canvas>
                    </div>
                `;
                namesChartContainer = document.getElementById('namesChartContainer');
            }

            if (!namesChartContainer) {
                console.error('Names chart container not found');
                return;
            }

            // Clear previous chart and create new canvas
            namesChartContainer.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.id = 'namesChart';
            canvas.style.maxHeight = '400px';
            namesChartContainer.appendChild(canvas);
            
            let data;
            let titleText;

            // Determine the data to fetch and title
            if (type === "country") {
                data = await api.getCountryNamesHistory(code || "France");
                titleText = "France";
            } else if (type === "department") {
                data = await api.getDepartmentNamesHistory(code);
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else if (type === "commune") {
                data = await api.getCommuneNamesHistory(code);
                titleText = `${communeName} (${dept})`;
            }

            if (!data || data.length === 0) {
                // Replace only the chart container content with the message
                namesChartContainer.innerHTML = "<p>Aucune donnée disponible au niveau commune.</p>";
                return;
            }

            // Verify canvas was created properly
            if (!canvas || !canvas.getContext) {
                console.error('Canvas element not properly created');
                namesChartContainer.innerHTML = "<p>Erreur lors de la création du graphique.</p>";
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
                },
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
                },
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
                            align: "start",
                            labels: {
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 14,
                                },
                                color: "#343a40",
                                boxWidth: 12,
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
                                display: false,
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
            namesChartContainer.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la création du graphique des prénoms:", error);
        }
    }

    // Function to show QPV data based on selection
    async function showQpvData(type, code, dept = null, communeName = null) {
        try {
            if (!qpvContainer) {
                console.error('QPV container not found');
                return;
            }

            // Determine the data to fetch and title
            if (type === "country") {
                qpvContainer.innerHTML = "<p>Sélectionnez un département ou une commune pour voir les QPV.</p>";
                return;
            }

            // Clear previous content and show loading
            qpvContainer.innerHTML = "<p>Chargement des données QPV...</p>";

            let data;
            let titleText;

            if (type === "department") {
                data = await api.getQpvDepartment(code);
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else if (type === "commune") {
                data = await api.getQpvCommune(code);
                titleText = `${communeName} (${dept})`;
            }

            if (!data || data.length === 0) {
                qpvContainer.innerHTML = "<p>Aucun QPV trouvé pour cette commune.</p>";
                return;
            }

            // Use QPV handler to render the table
            qpvHandler.renderQpvTable(data, qpvContainer);

        } catch (error) {
            qpvContainer.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la création du tableau QPV:", error);
        }
    }

    // Initialize the application
    function initializeApp() {
        console.log('Initializing application...');
        communeInput.disabled = false;
        communeInput.placeholder = "Rechercher une commune...";

        scoreTableHandler.showCountryDetails();
        executiveHandler.showCountryExecutive();
        showCrimeGraphs("country", "France");
        showNamesGraph("country", "France");
        showQpvData("country", "France");
        locationHandler.loadDepartements();
        updateExternalLinksWithLabelState();
    }

    // Initialize label toggle functionality (centralized to prevent multiple listeners)
    MetricsConfig.initializeToggleButton();
    
    // Listen for label state changes from the centralized toggle
    window.addEventListener('metricsLabelsToggled', () => {
        refreshMetricLabels();
    });

    function refreshMetricLabels() {
        const currentDept = departementSelect.value;
        const currentCommune = communeInput.value;

        if (currentCommune && currentDept) {
            api.getCommunes(currentDept).then(data => {
                if (data.length > 0) {
                    const cog = data[0].COG;
                    scoreTableHandler.showCommuneDetails(cog);
                    showCrimeGraphs("commune", cog, currentDept, currentCommune);
                    showNamesGraph("commune", cog, currentDept, currentCommune);
                    showQpvData("commune", cog, currentDept, currentCommune);
                }
            }).catch(console.error);
        } else if (currentDept) {
            scoreTableHandler.showDepartmentDetails(currentDept);
            showCrimeGraphs("department", currentDept);
            showNamesGraph("department", currentDept);
            showQpvData("department", currentDept);
        } else {
            scoreTableHandler.showCountryDetails();
            showCrimeGraphs("country", "France");
            showNamesGraph("country", "France");
            showQpvData("country", "France");
        }

        if (mapHandler?.updateMap) {
            mapHandler.updateMap(mapHandler.currentMetric || 'total_score');
        }
        updateExternalLinksWithLabelState();
    }

    function updateExternalLinksWithLabelState() {
        const labelState = MetricsConfig.labelState;
        const links = document.querySelectorAll('a[href*="crime_graph.html"], a[href*="rankings.html"], a[href*="names_graph.html"]');
        links.forEach(link => {
            const url = new URL(link.href, window.location.origin);
            if (labelState > 0) {
                url.searchParams.set('labelState', labelState);
            } else {
                url.searchParams.delete('labelState');
            }
            link.href = url.toString();
        });
    }

    // Global function for map commune selection
    window.updateSelectedCommune = async function(cog) {
        try {
            // Get commune details to find the commune name and department
            const communeDetails = await api.getCommuneDetails(cog);
            if (communeDetails && communeDetails.commune) {
                const communeName = communeDetails.commune;
                const deptCode = communeDetails.departement;
                
                // Update department selector if different
                if (deptCode && departementSelect.value !== deptCode) {
                    departementSelect.value = deptCode;
                    departementSelect.dispatchEvent(new Event('change'));
                }
                
                // Update commune input
                communeInput.value = communeName;
                
                // Show commune details
                scoreTableHandler.showCommuneDetails(cog);
                executiveHandler.showCommuneExecutive(cog);
                showCrimeGraphs("commune", cog, deptCode, communeName);
                showNamesGraph("commune", cog, deptCode, communeName);
                showQpvData("commune", cog, deptCode, communeName);
                
                // Load lieux and articles
                if (deptCode) {
                    locationHandler.loadLieux(deptCode, cog);
                    articleHandler.loadArticles(deptCode, cog, "", locationHandler).then(() => {
                        articleHandler.loadArticleCounts(deptCode, cog).then((counts) => {
                            articleHandler.renderFilterButtons(counts, allArticles, currentLieu);
                        });
                    });
                }
            }
        } catch (error) {
            console.error('Error updating selected commune:', error);
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
})();