import { DepartmentNames } from './departmentNames.js';
import { formatNumber, formatPercentage, formatMetricValue } from './utils.js';

/**
 * RankingsHandler Module
 *
 * This module is responsible for fetching and rendering rankings data based on
 * various criteria such as scope (France, department), metric, and population.
 * It also handles user interactions with the UI for tweaking parameters.
 */
const RankingsHandler = (function () {
    // Use shared department names
    const departmentNames = DepartmentNames;

    return function (scopeSelect, departementSelect, metricSelect, resultsDiv) {
        // Populate existing tweaking box
        const tweakingBox = document.getElementById("tweakingBox");
        tweakingBox.innerHTML = `
            <button class="tweaking-toggle">Paramètres</button>
            <div class="tweaking-box">
                <div class="population-controls">
                    <div>
                        <label for="popLower">Pop min:</label>
                        <select id="popLower">
                            <option value="">Aucune limite</option>
                            <option value="1000">1k</option>
                            <option value="10000">10k</option>
                            <option value="100000">100k</option>
                        </select>
                    </div>
                    <div>
                        <label for="popUpper">Pop max:</label>
                        <select id="popUpper">
                            <option value="">Aucune limite</option>
                            <option value="1000">1k</option>
                            <option value="10000">10k</option>
                            <option value="100000">100k</option>
                        </select>
                    </div>
                </div>
                <label for="topLimit">Nombre de résultats (Top/Bottom) :</label>
                <input type="number" id="topLimit" value="10" min="1" max="100">
                <button id="applyFilters">Appliquer</button>
            </div>
        `;

        // Get tweaking input elements
        const popLowerInput = document.getElementById("popLower");
        const popUpperInput = document.getElementById("popUpper");
        const topLimitInput = document.getElementById("topLimit");
        const applyButton = document.getElementById("applyFilters");
        const tweakingToggle = document.querySelector(".tweaking-toggle");
        const tweakingBoxContent = document.querySelector(".tweaking-box");
        const departementWrapper =
            document.getElementById("departementWrapper");

        // Toggle tweaking box visibility
        tweakingToggle.addEventListener("click", () => {
            tweakingBoxContent.classList.toggle("active");
        });

        // Toggle department dropdown visibility based on scope
        function toggleDepartementVisibility() {
            if (scopeSelect.value === "communes_dept") {
                departementWrapper.style.display = "block";
            } else {
                departementWrapper.style.display = "none";
                departementSelect.value = ""; // Reset department selection
            }
        }

        // Add event listener for scope selection
        scopeSelect.addEventListener("change", () => {
            toggleDepartementVisibility();
            updateRankings();
        });

        async function loadDepartements() {
            try {
                const response = await fetch("/api/departements");
                if (!response.ok) {
                    throw new Error(
                        "Erreur lors du chargement des départements",
                    );
                }
                const departements = await response.json();
                departementSelect.innerHTML =
                    '<option value="">-- Tous les départements --</option>';
                departements.forEach((dept) => {
                    let deptCode = dept.departement.trim().toUpperCase();
                    if (/^\d+$/.test(deptCode))
                        deptCode = deptCode.padStart(2, "0");
                    if (
                        !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(
                            deptCode,
                        )
                    )
                        return;
                    const option = document.createElement("option");
                    option.value = deptCode;
                    option.textContent = `${deptCode} - ${departmentNames[deptCode] || deptCode}`;
                    departementSelect.appendChild(option);
                });
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur chargement départements:", error);
            }
        }

        async function fetchDepartmentRankings(metric, limit) {
            try {
                const topResponse = await fetch(
                    `/api/rankings/departements?limit=${limit}&sort=${metric}&direction=DESC`,
                );
                if (!topResponse.ok) {
                    const errorData = await topResponse.json();
                    throw new Error(
                        errorData.errors
                            ? errorData.errors.map((e) => e.msg).join("; ")
                            : "Erreur serveur",
                    );
                }
                const topResult = await topResponse.json();
                const topData = topResult.data;
                const totalDepartments = 101;

                const bottomResponse = await fetch(
                    `/api/rankings/departements?limit=${limit}&sort=${metric}&direction=ASC`,
                );
                if (!bottomResponse.ok) {
                    const errorData = await bottomResponse.json();
                    throw new Error(
                        errorData.errors
                            ? errorData.errors.map((e) => e.msg).join("; ")
                            : "Erreur serveur",
                    );
                }
                const bottomResult = await bottomResponse.json();
                const bottomData = bottomResult.data;

                const topRankings = topData.map((dept, index) => ({
                    deptCode: dept.departement,
                    name: departmentNames[dept.departement] || dept.departement,
                    population: dept.population || 0,
                    insecurite_score: dept.insecurite_score,
                    homicides_p100k: dept.homicides_p100k || 0,
                    violences_physiques_p1k: dept.violences_physiques_p1k || 0,
                    violences_sexuelles_p1k: dept.violences_sexuelles_p1k || 0,
                    vols_p1k: dept.vols_p1k || 0,
                    destructions_p1k: dept.destructions_p1k || 0,
                    stupefiants_p1k: dept.stupefiants_p1k || 0,
                    escroqueries_p1k: dept.escroqueries_p1k || 0,
                    immigration_score: dept.immigration_score,
                    extra_europeen_pct: dept.extra_europeen_pct || 0,
                    islamisation_score: dept.islamisation_score,
                    musulman_pct: dept.musulman_pct || 0,
                    number_of_mosques: dept.number_of_mosques,
                    mosque_p100k: dept.mosque_p100k,
                    defrancisation_score: dept.defrancisation_score,
                    prenom_francais_pct: dept.prenom_francais_pct || 0,
                    wokisme_score: dept.wokisme_score,
                    total_score: dept.total_score,
                    total_qpv: dept.total_qpv || 0,
                    pop_in_qpv_pct: dept.pop_in_qpv_pct || 0,
                    rank: index + 1,
                }));

                const topDeptCodes = new Set(
                    topRankings.map((d) => d.deptCode),
                );
                const filteredBottomData = bottomData.filter(
                    (dept) => !topDeptCodes.has(dept.departement),
                );

                const bottomRankings = filteredBottomData
                    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
                    .slice(0, limit)
                    .map((dept, index) => ({
                        deptCode: dept.departement,
                        name:
                            departmentNames[dept.departement] ||
                            dept.departement,
                        population: dept.population || 0,
                        insecurite_score: dept.insecurite_score,
                        homicides_p100k: dept.homicides_p100k || 0,
                        violences_physiques_p1k:
                            dept.violences_physiques_p1k || 0,
                        violences_sexuelles_p1k:
                            dept.violences_sexuelles_p1k || 0,
                        vols_p1k: dept.vols_p1k || 0,
                        destructions_p1k: dept.destructions_p1k || 0,
                        stupefiants_p1k: dept.stupefiants_p1k || 0,
                        escroqueries_p1k: dept.escroqueries_p1k || 0,
                        immigration_score: dept.immigration_score,
                        extra_europeen_pct: dept.extra_europeen_pct || 0,
                        islamisation_score: dept.islamisation_score,
                        musulman_pct: dept.musulman_pct || 0,
                        number_of_mosques: dept.number_of_mosques,
                        mosque_p100k: dept.mosque_p100k,
                        defrancisation_score: dept.defrancisation_score,
                        prenom_francais_pct: dept.prenom_francais_pct || 0,
                        wokisme_score: dept.wokisme_score,
                        total_score: dept.total_score,
                        total_qpv: dept.total_qpv || 0,
                        pop_in_qpv_pct: dept.pop_in_qpv_pct || 0,
                        rank:
                            totalDepartments -
                            filteredBottomData.length +
                            index +
                            1,
                    }));

                const rankings = [...topRankings, ...bottomRankings];
                return rankings;
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error(
                    "Erreur chargement classements départements:",
                    error,
                );
                return [];
            }
        }

        async function fetchCommuneRankings(
            deptCode,
            metric,
            limit,
            populationRange,
        ) {
            try {
                console.log(
                    "fetchCommuneRankings: deptCode =",
                    deptCode,
                    "metric =",
                    metric,
                    "limit =",
                    limit,
                    "populationRange =",
                    populationRange,
                );
                const popFilter = populationRange
                    ? `&population_range=${encodeURIComponent(populationRange)}`
                    : "";
                const queryParams = [];
                if (deptCode) queryParams.push(`dept=${deptCode}`);
                queryParams.push(`limit=${limit}`);
                queryParams.push(`sort=${metric}`);
                if (popFilter) queryParams.push(popFilter.slice(1)); // Remove leading &
                const queryString = queryParams.join("&");
                const baseUrl = `/api/rankings/communes?${queryString}`;

                console.log("Request URL (top):", `${baseUrl}&direction=DESC`);

                const topResponse = await fetch(`${baseUrl}&direction=DESC`);
                if (!topResponse.ok) {
                    const errorData = await topResponse.json();
                    throw new Error(
                        errorData.errors
                            ? errorData.errors.map((e) => e.msg).join("; ")
                            : "Erreur serveur",
                    );
                }
                const topResult = await topResponse.json();
                const topData = topResult.data;
                const totalCommunes = topResult.total_count;

                console.log(
                    "Request URL (bottom):",
                    `${baseUrl}&direction=ASC`,
                );
                const bottomResponse = await fetch(`${baseUrl}&direction=ASC`);
                if (!bottomResponse.ok) {
                    const errorData = await bottomResponse.json();
                    throw new Error(
                        errorData.errors
                            ? errorData.errors.map((e) => e.msg).join("; ")
                            : "Erreur serveur",
                    );
                }
                const bottomResult = await bottomResponse.json();
                const bottomData = bottomResult.data;

                console.log("totalCommunes:", totalCommunes);
                console.log(
                    "Raw bottomData:",
                    bottomData.map((item) => ({
                        commune: item.commune,
                        [metric]: item[metric] || 0,
                    })),
                );

                const topRankings = topData.map((commune, index) => ({
                    deptCode: commune.departement,
                    name: commune.commune,
                    population: commune.population || 0,
                    insecurite_score: commune.insecurite_score,
                    violences_physiques_p1k:
                        commune.violences_physiques_p1k || 0,
                    violences_sexuelles_p1k:
                        commune.violences_sexuelles_p1k || 0,
                    vols_p1k: commune.vols_p1k || 0,
                    destructions_p1k: commune.destructions_p1k || 0,
                    stupefiants_p1k: commune.stupefiants_p1k || 0,
                    escroqueries_p1k: commune.escroqueries_p1k || 0,
                    immigration_score: commune.immigration_score,
                    extra_europeen_pct: commune.extra_europeen_pct || 0,
                    islamisation_score: commune.islamisation_score,
                    musulman_pct: commune.musulman_pct || 0,
                    number_of_mosques: commune.number_of_mosques || 0,
                    mosque_p100k: commune.mosque_p100k || 0,
                    defrancisation_score: commune.defrancisation_score,
                    prenom_francais_pct: commune.prenom_francais_pct || 0,
                    wokisme_score: commune.wokisme_score,
                    total_score: commune.total_score,
                    total_qpv: commune.total_qpv || 0,
                    pop_in_qpv_pct: commune.pop_in_qpv_pct || 0,
                    rank: index + 1,
                }));

                const topNames = new Set(topRankings.map((c) => c.name));
                const filteredBottomData = bottomData.filter(
                    (commune) => !topNames.has(commune.commune),
                );

                const bottomRankings = filteredBottomData
                    .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
                    .slice(0, limit)
                    .map((commune, index) => ({
                        deptCode: commune.departement,
                        name: commune.commune,
                        population: commune.population || 0,
                        insecurite_score: commune.insecurite_score,
                        violences_physiques_p1k:
                            commune.violences_physiques_p1k || 0,
                        violences_sexuelles_p1k:
                            commune.violences_sexuelles_p1k || 0,
                        vols_p1k: commune.vols_p1k || 0,
                        destructions_p1k: commune.destructions_p1k || 0,
                        stupefiants_p1k: commune.stupefiants_p1k || 0,
                        escroqueries_p1k: commune.escroqueries_p1k || 0,
                        immigration_score: commune.immigration_score,
                        extra_europeen_pct: commune.extra_europeen_pct || 0,
                        islamisation_score: commune.islamisation_score,
                        musulman_pct: commune.musulman_pct || 0,
                        number_of_mosques: commune.number_of_mosques || 0,
                        mosque_p100k: commune.mosque_p100k || 0,
                        defrancisation_score: commune.defrancisation_score,
                        prenom_francais_pct: commune.prenom_francais_pct || 0,
                        wokisme_score: commune.wokisme_score,
                        total_score: commune.total_score,
                        total_qpv: commune.total_qpv || 0,
                        pop_in_qpv_pct: commune.pop_in_qpv_pct || 0,
                        rank:
                            totalCommunes -
                            filteredBottomData.length +
                            index +
                            1,
                    }));

                const rankings = [...topRankings, ...bottomRankings];
                return rankings;
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur chargement classements communes:", error);
                return [];
            }
        }

        function renderRankings(type, rankings, metric) {
            const metricName =
                metricSelect.options[metricSelect.selectedIndex]?.text ||
                metric;
            const limit = parseInt(topLimitInput.value) || 10;

            const topN = rankings.slice(0, limit);
            let bottomN = [];
            const remainingRankings = rankings.slice(limit);
            if (remainingRankings.length > 0) {
                bottomN = remainingRankings.sort((a, b) => a.rank - b.rank);
            }

            resultsDiv.innerHTML = `
                <div class="data-box">
                    <h2>Classement des ${type}s pour ${metricName}</h2>
                    <h3>Top ${topN.length}</h3>
                    <table class="score-table">
                        <thead>
                            <tr class="score-header">
                                <th style="width: 15%;">Rang</th>
                                <th style="width: 40%;">${type}</th>
                                <th style="width: 25%;">Population</th>
                                <th style="width: 20%;">Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topN
                                .map(
                                    (item) => `
                                <tr class="score-row">
                                    <td>${item.rank}</td>
                                    <td>${type === "Département" ? `${item.name} (${item.deptCode})` : `${item.name} (${item.deptCode})`}</td>
                                    <td>${item.population.toLocaleString("fr-FR")}</td>
                                    <td>${formatMetricValue(item[metric], metric)}</td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
                    <h3>Bottom ${bottomN.length}</h3>
                    <table class="score-table">
                        <thead>
                            <tr class="score-header">
                                <th style="width: 15%;">Rang</th>
                                <th style="width: 40%;">${type}</th>
                                <th style="width: 25%;">Population</th>
                                <th style="width: 20%;">Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bottomN
                                .map(
                                    (item) => `
                                <tr class="score-row">
                                    <td>${item.rank}</td>
                                    <td>${type === "Département" ? `${item.name} (${item.deptCode})` : `${item.name} (${item.deptCode})`}</td>
                                    <td>${item.population.toLocaleString("fr-FR")}</td>
                                    <td>${formatMetricValue(item[metric], metric)}</td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function formatMetricValue(value, metric) {
            if (value === undefined || value === null) return "N/A";
            if (metric === "pop_in_qpv_pct") return `${value.toFixed(1)}%`;
            if (metric === "total_qpv") return value.toString();
            if (metric.includes("_pct")) return `${value}%`;
            if (metric.includes("_p100k") || metric.includes("_p1k"))
                return value.toFixed(1);
            if (metric.includes("_score")) return value.toLocaleString("fr-FR");
            return value.toString();
        }

        async function updateRankings() {
            const scope = scopeSelect.value;
            const deptCode = departementSelect.value;
            const metric = metricSelect.value;
            const popLower = popLowerInput.value
                ? parseInt(popLowerInput.value)
                : null;
            const popUpper = popUpperInput.value
                ? parseInt(popUpperInput.value)
                : null;
            let limit = parseInt(topLimitInput.value) || 10;
            if (limit > 100) limit = 100; // Enforce max limit of 100

            // Validate population inputs
            const validPopValues = [1000, 10000, 100000];
            if (popLower !== null && !validPopValues.includes(popLower)) {
                resultsDiv.innerHTML =
                    "<p>Erreur : Valeur de population minimale invalide.</p>";
                return;
            }
            if (popUpper !== null && !validPopValues.includes(popUpper)) {
                resultsDiv.innerHTML =
                    "<p>Erreur : Valeur de population maximale invalide.</p>";
                return;
            }
            if (popLower !== null && popUpper !== null && popLower > popUpper) {
                resultsDiv.innerHTML =
                    "<p>Erreur : La population minimale ne peut pas être supérieure à la population maximale.</p>";
                return;
            }

            // Construct population_range to match backend
            let populationRange = "";
            if (popLower !== null && popUpper !== null) {
                if (popLower === 1000) {
                    if (popUpper === 10000) populationRange = "1-10k";
                    else if (popUpper === 100000) populationRange = "1-100k";
                } else if (popLower === 10000 && popUpper === 100000) {
                    populationRange = "10-100k";
                }
            } else if (popLower !== null) {
                if (popLower === 1000) populationRange = "1k+";
                else if (popLower === 10000) populationRange = "10k+";
                else if (popLower === 100000) populationRange = "100k+";
            } else if (popUpper !== null) {
                if (popUpper === 1000) populationRange = "0-1k";
                else if (popUpper === 10000) populationRange = "0-10k";
                else if (popUpper === 100000) populationRange = "0-100k";
            }

            console.log(
                "Constructed populationRange:",
                JSON.stringify(populationRange),
            );

            if (!metric) {
                resultsDiv.innerHTML =
                    "<p>Veuillez sélectionner une métrique.</p>";
                return;
            }

            if (scope === "departements") {
                const rankings = await fetchDepartmentRankings(metric, limit);
                renderRankings("Département", rankings, metric);
            } else if (scope === "communes_france") {
                const rankings = await fetchCommuneRankings(
                    null,
                    metric,
                    limit,
                    populationRange,
                );
                renderRankings("Commune", rankings, metric);
            } else if (scope === "communes_dept") {
                if (!deptCode) {
                    resultsDiv.innerHTML =
                        "<p>Veuillez sélectionner un département.</p>";
                    return;
                }
                const rankings = await fetchCommuneRankings(
                    deptCode,
                    metric,
                    limit,
                    populationRange,
                );
                renderRankings("Commune", rankings, metric);
            }
        }

        // Event listeners
        departementSelect.addEventListener("change", updateRankings);
        metricSelect.addEventListener("change", updateRankings);
        applyButton.addEventListener("click", updateRankings);

        // Initialize
        loadDepartements();
        toggleDepartementVisibility();
        updateRankings();

        return {
            loadDepartements,
            updateRankings,
        };
    };
})();

(function () {
    // DOM elements
    const scopeSelect = document.getElementById("scopeSelect");
    const departementSelect = document.getElementById("departementSelect");
    const metricSelect = document.getElementById("metricSelect");
    const resultsDiv = document.getElementById("results");

    // Validate DOM elements
    if (!scopeSelect || !departementSelect || !metricSelect || !resultsDiv) {
        console.error("One or more DOM elements are missing");
        return;
    }

    // Initialize handler
    const rankingsHandler = RankingsHandler(
        scopeSelect,
        departementSelect,
        metricSelect,
        resultsDiv,
    );
})();