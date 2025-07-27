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
    window.isMapClickInProgress = false; // Flag to prevent circular reference

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
            
            // Only show department popup if this isn't from a map click
            if (mapHandler && mapHandler.showDepartmentPopup && !window.isMapClickInProgress) {
                mapHandler.showDepartmentPopup(departement);
            }
            
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
                    locationHandler.loadLieux(departement, cog);
                    articleHandler.loadArticles(departement, cog).then(() => {
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

        if (departement && commune) {
            try {
                const cog = await getCOGForCommune(commune, departement);
                if (cog) {
                    articleHandler.loadArticles(departement, cog, currentLieu).then(() => {
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

    // Initialize the application once
    function initializeApp() {
        console.log('Initializing application...');
        communeInput.disabled = false;
        communeInput.placeholder = "Rechercher une commune...";
        
        scoreTableHandler.showCountryDetails();
        executiveHandler.showCountryExecutive();
        locationHandler.loadDepartements();
        updateExternalLinksWithLabelState();
    }

    // Label toggle functionality
    if (labelToggleBtn) {
        labelToggleBtn.textContent = MetricsConfig.getCurrentToggleButtonLabel();
        labelToggleBtn.addEventListener('click', () => {
            MetricsConfig.cycleLabelState();
            const stateName = MetricsConfig.getLabelStateName();
            
            labelToggleBtn.textContent = MetricsConfig.getCurrentToggleButtonLabel();
            labelToggleBtn.classList.remove('active', 'alt1', 'alt2');
            if (stateName !== 'standard') {
                labelToggleBtn.classList.add('active', stateName);
            }
            
            document.title = MetricsConfig.getCurrentPageTitle();
            const headerH1 = document.querySelector('h1');
            if (headerH1) headerH1.textContent = MetricsConfig.getCurrentPageTitle();
            
            refreshMetricLabels();
        });
    }

    function refreshMetricLabels() {
        const currentDept = departementSelect.value;
        const currentCommune = communeInput.value;

        if (currentCommune && currentDept) {
            api.getCommunes(currentDept).then(data => {
                if (data.length > 0) scoreTableHandler.showCommuneDetails(data[0].COG);
            }).catch(console.error);
        } else if (currentDept) {
            scoreTableHandler.showDepartmentDetails(currentDept);
        } else {
            scoreTableHandler.showCountryDetails();
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
                
                // Load lieux and articles
                if (deptCode) {
                    locationHandler.loadLieux(deptCode, cog);
                    articleHandler.loadArticles(deptCode, cog).then(() => {
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