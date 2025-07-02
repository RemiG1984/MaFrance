(function () {
    // Department code to name mapping
    const departmentNames = {
        "01": "Ain",
        "02": "Aisne",
        "03": "Allier",
        "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes",
        "06": "Alpes-Maritimes",
        "07": "Ardèche",
        "08": "Ardennes",
        "09": "Ariège",
        10: "Aube",
        11: "Aude",
        12: "Aveyron",
        13: "Bouches-du-Rhône",
        14: "Calvados",
        15: "Cantal",
        16: "Charente",
        17: "Charente-Maritime",
        18: "Cher",
        19: "Corrèze",
        "2A": "Corse-du-Sud",
        "2B": "Haute-Corse",
        21: "Côte-d'Or",
        22: "Côtes-d'Armor",
        23: "Creuse",
        24: "Dordogne",
        25: "Doubs",
        26: "Drôme",
        27: "Eure",
        28: "Eure-et-Loir",
        29: "Finistère",
        30: "Gard",
        31: "Haute-Garonne",
        32: "Gers",
        33: "Gironde",
        34: "Hérault",
        35: "Ille-et-Vilaine",
        36: "Indre",
        37: "Indre-et-Loire",
        38: "Isère",
        39: "Jura",
        40: "Landes",
        41: "Loir-et-Cher",
        42: "Loire",
        43: "Haute-Loire",
        44: "Loire-Atlantique",
        45: "Loiret",
        46: "Lot",
        47: "Lot-et-Garonne",
        48: "Lozère",
        49: "Maine-et-Loire",
        50: "Manche",
        51: "Marne",
        52: "Haute-Marne",
        53: "Mayenne",
        54: "Meurthe-et-Moselle",
        55: "Meuse",
        56: "Morbihan",
        57: "Moselle",
        58: "Nièvre",
        59: "Nord",
        60: "Oise",
        61: "Orne",
        62: "Pas-de-Calais",
        63: "Puy-de-Dôme",
        64: "Pyrénées-Atlantiques",
        65: "Hautes-Pyrénées",
        66: "Pyrénées-Orientales",
        67: "Bas-Rhin",
        68: "Haut-Rhin",
        69: "Rhône",
        70: "Haute-Saône",
        71: "Saône-et-Loire",
        72: "Sarthe",
        73: "Savoie",
        74: "Haute-Savoie",
        75: "Paris",
        76: "Seine-Maritime",
        77: "Seine-et-Marne",
        78: "Yvelines",
        79: "Deux-Sèvres",
        80: "Somme",
        81: "Tarn",
        82: "Tarn-et-Garonne",
        83: "Var",
        84: "Vaucluse",
        85: "Vendée",
        86: "Vienne",
        87: "Haute-Vienne",
        88: "Vosges",
        89: "Yonne",
        90: "Territoire de Belfort",
        91: "Essonne",
        92: "Hauts-de-Seine",
        93: "Seine-Saint-Denis",
        94: "Val-de-Marne",
        95: "Val-d'Oise",
        971: "Guadeloupe",
        972: "Martinique",
        973: "Guyane",
        974: "La Réunion",
        976: "Mayotte",
    };

    // DOM elements
    const departementSelect = document.getElementById("departementSelect");
    const communeInput = document.getElementById("communeInput");
    const communeList = document.getElementById("communeList");
    const lieuxSelect = document.getElementById("lieuxSelect");
    const resultsDiv = document.getElementById("results");
    const executiveDiv = document.getElementById("executiveDetails");
    const articleListDiv = document.getElementById("articleList");
    const filterButtonsDiv = document.getElementById("filterButtons");

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

    // Initialize modules
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

    communeInput.addEventListener("input", () => {
        const departement = departementSelect.value;
        const query = communeInput.value;
        locationHandler.handleCommuneInput(departement, query);
        if (departement && query.length >= 2) {
            locationHandler.loadCommunes(departement, query);
        } else {
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
    });

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
                scoreTableHandler.showCommuneDetails(departement, commune);
                executiveHandler.showCommuneExecutive(departement, commune);
                locationHandler.loadLieux(departement, commune);
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

    // Initialize app
    scoreTableHandler.showCountryDetails();
    executiveHandler.showCountryExecutive();
    locationHandler.loadDepartements();
})();
