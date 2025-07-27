import { debounce } from './utils.js';
import { LocationHandler } from './locationHandler.js';
import { ScoreTableHandler } from './scoreTableHandler.js';
import { ExecutiveHandler } from './executiveHandler.js';
import { ArticleHandler } from './articleHandler.js';
import { MapHandler } from './mapHandler.js';
import { DepartmentNames } from './departmentNames.js';
import { MetricsConfig } from './metricsConfig.js';
import { api } from './apiService.js';

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
        !filterButtonsDiv
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

    // Shared state
    let currentLieu = "";
    let allArticles = [];

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
            locationHandler.loadCommunes(departement);
            articleHandler.loadArticles(departement).then(() => {
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
                articleHandler.loadArticles(departement).then(() => {
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
                articleHandler.clearArticles();
            }
        }
    }, 300);

    communeInput.addEventListener("input", debouncedInputHandler);

    communeInput.addEventListener("change", async () => {
        const selectedValue = communeInput.value.trim();
        // Extract commune name from format "CommuneName (DeptCode)" if needed
        const selectedCommune = selectedValue.includes(' (') 
            ? selectedValue.substring(0, selectedValue.lastIndexOf(' ('))
            : selectedValue;
        let departement = departementSelect.value;

        if (selectedCommune) {
            try {
                // First try to get COG and department from the datalist options
                let cog = locationHandler.getCOGForCommune(selectedCommune);
                let communeDept = locationHandler.getDepartmentForCommune(selectedCommune);

                // Auto-select department if not already selected, or update if different
                if (communeDept && (!departement || departement !== communeDept)) {
                    departement = communeDept;
                    departementSelect.value = departement;
                    console.log("Auto-selected/updated department:", departement);
                    
                    // Trigger department change event to update related components
                    departementSelect.dispatchEvent(new Event('change'));
                }

                if (!cog && departement) {
                    // Fallback: fetch commune details to get COG
                    const response = await fetch(
                        `/api/communes?dept=${encodeURIComponent(
                            departement,
                        )}&q=${encodeURIComponent(selectedCommune)}`,
                    );
                    if (!response.ok) throw new Error("Erreur lors de la recherche");
                    const communes = await response.json();
                    const commune = communes.find((c) => c.commune === selectedCommune);
                    if (commune) {
                        cog = commune.COG;
                    }
                }

                if (cog && departement) {
                    console.log("Using COG for commune:", selectedCommune, cog);
                    scoreTableHandler.showCommuneDetails(cog);
                    executiveHandler.showCommuneExecutive(cog);
                    locationHandler.loadLieux(departement, cog);
                    articleHandler.loadArticles(departement, cog).then(() => {
                        articleHandler
                            .loadArticleCounts(departement, cog)
                            .then((counts) => {
                                articleHandler.renderFilterButtons(
                                    counts,
                                    allArticles,
                                    currentLieu,
                                );
                            });
                    });
                } else {
                    resultsDiv.innerHTML = "<p>Commune non trouvée.</p>";
                    executiveDiv.innerHTML = "<p>Commune non trouvée.</p>";
                }
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            }
        }
    });

    lieuxSelect.addEventListener("change", async () => {
        const departement = departementSelect.value;
        const commune = communeInput.value.trim();
        currentLieu = lieuxSelect.value;
        console.log("Current lieu set to:", currentLieu);

        if (departement && commune) {
            try {
                // Get COG from the datalist options
                let cog = locationHandler.getCOGForCommune(commune);

                if (!cog) {
                    // Fallback: fetch commune details to get COG
                    const response = await fetch(
                        `/api/communes?dept=${encodeURIComponent(
                            departement,
                        )}&q=${encodeURIComponent(commune)}`,
                    );
                    if (!response.ok) throw new Error("Erreur lors de la recherche");
                    const communes = await response.json();
                    const communeData = communes.find((c) => c.commune === commune);
                    if (communeData) {
                        cog = communeData.COG;
                    }
                }

                if (cog) {
                    articleHandler
                        .loadArticles(departement, cog, currentLieu)
                        .then(() => {
                            articleHandler
                                .loadArticleCounts(departement, cog, currentLieu)
                                .then((counts) => {
                                    articleHandler.renderFilterButtons(
                                        counts,
                                        allArticles,
                                        currentLieu,
                                    );
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

    // Prevent duplicate initialization
    let appInitialized = false;

    // Label toggle functionality
    if (labelToggleBtn) {
        // Initialize button text with current state
        labelToggleBtn.textContent = MetricsConfig.getCurrentToggleButtonLabel();

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
            document.title = MetricsConfig.getCurrentPageTitle();

            // Update header h1 text
            const headerH1 = document.querySelector('h1');
            if (headerH1) {
                headerH1.textContent = MetricsConfig.getCurrentPageTitle();
            }

            // Refresh all components that display metric labels
            refreshMetricLabels();
        });
    }

    // Function to refresh all metric labels across components
    function refreshMetricLabels() {
        // Refresh score table if visible
        const currentDept = departementSelect.value;
        const currentCommune = communeInput.value;

        if (currentCommune && currentDept) {
            // Show commune details with updated labels
            api.getCommunes(currentDept).then(data => {
                if (data.length > 0) {
                    scoreTableHandler.showCommuneDetails(data[0].COG);
                }
            }).catch(console.error);
        } else if (currentDept) {
            // Show department details with updated labels
            scoreTableHandler.showDepartmentDetails(currentDept);
        } else {
            // Show country details with updated labels
            scoreTableHandler.showCountryDetails();
        }

        // Refresh map if it exists and has an updateMap method
        if (mapHandler && typeof mapHandler.updateMap === 'function') {
            // The map handler will get updated labels automatically from MetricsConfig
            mapHandler.updateMap(mapHandler.currentMetric || 'total_score');
        }

        // Update all external links with current label state
        updateExternalLinksWithLabelState();
    }

    // Function to add label state to external links
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

    // Initialize the application
    function initializeApp() {
        if (appInitialized) return;
        appInitialized = true;

        console.log('Initializing application...');

        // Ensure commune input is always enabled for global search
        communeInput.disabled = false;
        communeInput.placeholder = "Rechercher une commune...";

        scoreTableHandler.showCountryDetails();
        executiveHandler.showCountryExecutive();
        locationHandler.loadDepartements();

        // Initialize external links with current label state
        updateExternalLinksWithLabelState();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
})();