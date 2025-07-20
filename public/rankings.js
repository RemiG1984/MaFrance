const RankingsHandler = (function () {
    // Use shared department names
    const departmentNames = DepartmentNames;

    return function (departementSelect, metricSelect, resultsDiv) {
        // Populate existing tweaking box
        const tweakingBox = document.getElementById("tweakingBox");
        tweakingBox.innerHTML = `
            <div class="tweaking-box">
                <h3>Ajuster le classement</h3>
                <label for="popLower">Pop. min :</label>
                <select id="popLower">
                    <option value="">Aucune limite</option>
                    <option value="1000">1k</option>
                    <option value="10000">10k</option>
                    <option value="100000">100k</option>
                </select>
                <label for="popUpper">Pop. max :</label>
                <select id="popUpper">
                    <option value="">Aucune limite</option>
                    <option value="1000">1k</option>
                    <option value="10000">10k</option>
                    <option value="100000">100k</option>
                </select>
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

        async function loadDepartements() {
            try {
                const response = await fetch("/api/departements");
                if (!response.ok)
                    throw new Error(
                        "Erreur lors du chargement des départements",
                    );
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
                // Fetch top rankings (DESC)
                const topResponse = await fetch(
                    `/api/rankings/departements?limit=${limit}&sort=${metric}&direction=DESC`,
                );
                if (!topResponse.ok) {
                    const errorText = await topResponse.text();
                    throw new Error(
                        `Erreur lors de la récupération des données départementales (top): ${errorText}`,
                    );
                }
                const topResult = await topResponse.json();
                const topData = topResult.data;
                const totalDepartments = topResult.total_count;

                // Fetch bottom rankings (ASC)
                const bottomResponse = await fetch(
                    `/api/rankings/departements?limit=${limit}&sort=${metric}&direction=ASC`,
                );
                if (!bottomResponse.ok) {
                    const errorText = await topResponse.text();
                    throw new Error(
                        `Erreur lors de la récupération des données départementales (bottom): ${errorText}`,
                    );
                }
                const bottomResult = await bottomResponse.json();
                const bottomData = bottomResult.data;

                // Process top data
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

                // Process bottom data and filter out duplicates that appear in top rankings
                const topDeptCodes = new Set(
                    topRankings.map((d) => d.deptCode),
                );
                const filteredBottomData = bottomData.filter((dept) => !topDeptCodes.has(dept.departement));

                // Sort filtered bottom data by metric value ascending (lowest values first) and assign ranks
                const bottomRankings = filteredBottomData
                    .sort((a, b) => (a[metric] || 0) - (b[metric] || 0))
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
                        rank: totalDepartments - limit + index + 1,
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
                // Debug: Log the populationRange value
                console.log(
                    "fetchCommuneRankings: populationRange =",
                    JSON.stringify(populationRange),
                );

                // Build URL
                const popFilter = populationRange
                    ? `&population_range=${encodeURIComponent(populationRange)}`
                    : "";
                const baseUrl = deptCode
                    ? `/api/rankings/communes?dept=${deptCode}&limit=${limit}&sort=${metric}${popFilter}`
                    : `/api/rankings/communes?limit=${limit}&sort=${metric}${popFilter}`;

                // Debug: Log the full URL
                console.log("Request URL:", `${baseUrl}&direction=DESC`);

                // Fetch top rankings (DESC)
                const topResponse = await fetch(`${baseUrl}&direction=DESC`);
                if (!topResponse.ok) {
                    const errorText = await topResponse.text();
                    throw new Error(
                        `Erreur lors de la récupération des données des communes (top): ${errorText}`,
                    );
                }
                const topResult = await topResponse.json();
                const topData = topResult.data;
                const totalCommunes = topResult.total_count;

                // Fetch bottom rankings (ASC)
                const bottomResponse = await fetch(`${baseUrl}&direction=ASC`);
                if (!bottomResponse.ok) {
                    const errorText = await bottomResponse.text();
                    throw new Error(
                        `Erreur lors de la récupération des données des communes (bottom): ${errorText}`,
                    );
                }
                const bottomResult = await bottomResponse.json();
                const bottomData = bottomResult.data;

                // Debug logs
                console.log("totalCommunes:", totalCommunes);
                console.log(
                    "Raw bottomData:",
                    bottomData.map((item) => ({
                        commune: item.commune,
                        [metric]: item[metric] || 0,
                    })),
                );

                // Process top data
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

                // Process bottom data and filter out duplicates that appear in top rankings
                const topNames = new Set(topRankings.map((c) => c.name));
                const filteredBottomData = bottomData.filter((commune) => !topNames.has(commune.commune));
                
                // Sort filtered bottom data by metric value ascending (lowest values first) and assign ranks
                const bottomRankings = filteredBottomData
                    .sort((a, b) => (a[metric] || 0) - (b[metric] || 0))
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
                        rank: totalCommunes - filteredBottomData.length + index + 1,
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

            // The rankings array contains [topResults, bottomResults] concatenated
            // Split by taking first 'limit' items as top, and remaining as bottom
            const topN = rankings.slice(0, limit);

            // For bottom rankings, skip the top results and take the next 'limit' items
            // Only if we have more than 'limit' total results
            let bottomN = [];
            const remainingRankings = rankings.slice(limit);
            if (remainingRankings.length > 0) {
                bottomN = remainingRankings
                    .slice(0, limit)
                    .sort((a, b) => a.rank - b.rank); // Sort by rank ascending (worst performers show in correct rank order)
            }
            resultsDiv.innerHTML = `
                <div class="data-box">
                    <h2>Classement des ${type}s pour ${metricName}</h2>
                    <h3>Top ${topN.length}</h3>
                    <table class="score-table">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>${type}</th>
                                <th>Population</th>
                                <th>Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topN
                                .map(
                                    (item) => `
                                <tr>
                                    <td>${item.rank}</td>
                                    <td>${type === "Département" ? `${item.name} (${item.deptCode})` : item.name}</td>
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
                            <tr>
                                <th>Rang</th>
                                <th>${type}</th>
                                <th>Population</th>
                                <th>Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bottomN
                                .map(
                                    (item) => `
                                <tr>
                                    <td>${item.rank}</td>
                                    <td>${type === "Département" ? `${item.name} (${item.deptCode})` : item.name}</td>
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
            const deptCode = departementSelect.value;
            const metric = metricSelect.value;
            const popLower = popLowerInput.value
                ? parseInt(popLowerInput.value)
                : null;
            const popUpper = popUpperInput.value
                ? parseInt(popUpperInput.value)
                : null;
            const limit = parseInt(topLimitInput.value) || 10;

            // Debug: Log raw input values
            console.log(
                "Raw popLowerInput.value:",
                JSON.stringify(popLowerInput.value),
            );
            console.log(
                "Raw popUpperInput.value:",
                JSON.stringify(popUpperInput.value),
            );
            console.log("Parsed popLower:", popLower);
            console.log("Parsed popUpper:", popUpper);

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

            // Construct population_range
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

            // Debug: Log constructed populationRange
            console.log(
                "Constructed populationRange:",
                JSON.stringify(populationRange),
            );

            if (!metric) {
                resultsDiv.innerHTML =
                    "<p>Veuillez sélectionner une métrique.</p>";
                return;
            }

            if (!deptCode) {
                const rankings = await fetchDepartmentRankings(metric, limit);
                renderRankings("Département", rankings, metric);
            } else {
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
        updateRankings();

        return {
            loadDepartements,
            updateRankings,
        };
    };
})();

(function () {
    // DOM elements
    const departementSelect = document.getElementById("departementSelect");
    const metricSelect = document.getElementById("metricSelect");
    const resultsDiv = document.getElementById("results");

    // Validate DOM elements
    if (!departementSelect || !metricSelect || !resultsDiv) {
        console.error("One or more DOM elements are missing");
        return;
    }

    // Initialize handler
    const rankingsHandler = RankingsHandler(
        departementSelect,
        metricSelect,
        resultsDiv,
    );
})();