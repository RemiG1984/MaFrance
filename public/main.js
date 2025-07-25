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
        if (!(departement && query.length >= 2)) {
            locationHandler.resetCommuneAndLieux();
            articleHandler.clearArticles();
            currentLieu = "";
            articleHandler.setFilter(null);
            console.log("Reset filter on commune input");
            if (departement && query.length === 0) {
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
            } else if (!departement) {
                scoreTableHandler.showCountryDetails();
                executiveHandler.showCountryExecutive();
                articleHandler.clearArticles();
            }
        }
    }, 300);

    communeInput.addEventListener("input", debouncedInputHandler);

    communeInput.addEventListener("change", async () => {
        const departement = departementSelect.value;
        const commune = communeInput.value;
        if (departement && commune) {
            try {
                const response = await fetch(
                    `/api/search?dept=${departement}&q=${encodeURIComponent(commune)}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Erreur lors de la récupération de la commune: ${response.statusText}`,
                    );
                }
                const data = await response.json();
                if (data.length === 0) {
                    resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    executiveDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    return;
                }
                const item = data[0];
                const cog = item.COG;
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
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            }
        }
    });

    lieuxSelect.addEventListener("change", async () => {
        const departement = departementSelect.value;
        const commune = communeInput.value;
        currentLieu = lieuxSelect.value;
        console.log("Current lieu set to:", currentLieu);
        if (departement && commune) {
            try {
                const response = await fetch(
                    `/api/search?dept=${departement}&q=${encodeURIComponent(commune)}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Erreur lors de la récupération de la commune: ${response.statusText}`,
                    );
                }
                const data = await response.json();
                if (data.length === 0) {
                    resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    executiveDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    return;
                }
                const item = data[0];
                const cog = item.COG;
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
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            }
        }
    });

    // Prevent duplicate initialization
    let appInitialized = false;

    // Initialize the application
    document.addEventListener('DOMContentLoaded', async () => {
        if (appInitialized) return;
        appInitialized = true;

        // Load country data using cached API service
        const countryData = await api.getCountryDetails('France');
        console.log('Country details:', countryData);

        // Load country executive data using cached API service
        const executiveData = await api.getCountryExecutive('France');
        console.log('Country executive data:', executiveData);

        // Load departments using cached API service
        const departments = await api.getDepartments();
        console.log('Departments fetched:', departments);

        scoreTableHandler.showCountryDetails();
        executiveHandler.showCountryExecutive();
        locationHandler.loadDepartements();
    });
})();