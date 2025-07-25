import { formatNumber } from "./utils.js";
import { MetricsConfig } from "./metricsConfig.js";

/**
 * Score table handler module for displaying detailed score information.
 * Manages the display of scores for countries, departments, and communes.
 */
function ScoreTableHandler(resultsDiv, departmentNames) {

    /**
     * Creates a standardized row object for the score table
     */
    function createRow(metricKey, mainValue, compareValue = null, data = null, yearLabel = "", compareYearLabel = "", linkConfig = null) {
        const metric = MetricsConfig.getMetricByValue(metricKey);
        if (!metric) return null;

        // Calculate value if it's a calculated metric
        const calculatedValue = data ? MetricsConfig.calculateMetric(metricKey, data) : mainValue;

        const row = {
            title: MetricsConfig.getMetricLabel(metricKey),
            main: MetricsConfig.formatMetricValue(calculatedValue, metricKey) + yearLabel,
            subRow: metric.format !== "score" && metric.category !== "général"
        };

        if (compareValue !== null) {
            const calculatedCompareValue = data ? MetricsConfig.calculateMetric(metricKey, data) : compareValue;
            row.compare = MetricsConfig.formatMetricValue(calculatedCompareValue, metricKey) + compareYearLabel;
        }

        if (linkConfig) {
            row.link = linkConfig;
        }

        return row;
    }

    /**
     * Creates crime-related rows with links
     */
    function createCrimeRows(crimeData, countryCrimeData = null, linkBase = "", linkParams = "") {
        const crimeYearLabel = crimeData.annee ? ` (${crimeData.annee})` : "";
        const countryCrimeYearLabel = countryCrimeData?.annee ? ` (${countryCrimeData.annee})` : "";

        const crimeMetrics = [
            "homicides_p100k",
            "violences_physiques_p1k", 
            "violences_sexuelles_p1k",
            "vols_p1k",
            "destructions_p1k",
            "stupefiants_p1k",
            "escroqueries_p1k"
        ];

        return crimeMetrics.map(metricKey => {
            const row = createRow(
                metricKey,
                null,
                countryCrimeData ? null : null,
                crimeData,
                crimeYearLabel,
                countryCrimeYearLabel
            );

            if (row) {
                row.link = `${linkBase}${linkParams}`;
                if (countryCrimeData) {
                    // Calculate compare value for department/commune view
                    const compareValue = MetricsConfig.calculateMetric(metricKey, countryCrimeData);
                    row.compare = MetricsConfig.formatMetricValue(compareValue, metricKey) + countryCrimeYearLabel;
                }
            }
            return row;
        }).filter(Boolean);
    }

    /**
     * Creates name-related rows with links
     */
    function createNameRows(namesData, countryNamesData = null, linkBase = "", linkParams = "") {
        const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";
        const countryYearLabel = countryNamesData?.annais ? ` (${countryNamesData.annais})` : "";

        const rows = [];

        // Extra-European percentage
        if (!isNaN(MetricsConfig.calculateMetric("extra_europeen_pct", namesData))) {
            const row = createRow("extra_europeen_pct", null, null, namesData, yearLabel, countryYearLabel);
            if (row) {
                row.link = `${linkBase}${linkParams}`;
                if (countryNamesData) {
                    const compareValue = MetricsConfig.calculateMetric("extra_europeen_pct", countryNamesData);
                    row.compare = MetricsConfig.formatMetricValue(compareValue, "extra_europeen_pct") + countryYearLabel;
                }
                rows.push(row);
            }
        }

        // Muslim percentage
        if (!isNaN(namesData.musulman_pct)) {
            const row = createRow("musulman_pct", Math.round(namesData.musulman_pct), 
                countryNamesData ? Math.round(countryNamesData.musulman_pct) : null, 
                null, yearLabel, countryYearLabel);
            if (row) {
                row.link = `${linkBase}${linkParams}`;
                rows.push(row);
            }
        }

        // French names percentage
        if (!isNaN(namesData.traditionnel_pct)) {
            const row = createRow("prenom_francais_pct", null, null, namesData, yearLabel, countryYearLabel);
            if (row) {
                row.link = `${linkBase}${linkParams}`;
                if (countryNamesData) {
                    const compareValue = MetricsConfig.calculateMetric("prenom_francais_total", countryNamesData);
                    row.compare = MetricsConfig.formatMetricValue(compareValue, "prenom_francais_pct") + countryYearLabel;
                }
                rows.push(row);
            }
        }

        return rows;
    }

    /**
     * Displays country-level details with comprehensive statistics.
     */
    async function showCountryDetails() {
        try {
            const [response, namesResponse, crimeResponse] = await Promise.all([
                fetch("/api/country/details"),
                fetch("/api/country/names"),
                fetch("/api/country/crime"),
            ]);

            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des détails du pays: ${response.statusText}`);
            }

            const data = await response.json();
            const namesData = await namesResponse.json();
            const crimeData = await crimeResponse.json();

            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun pays trouvé.</p>";
                return;
            }

            const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";

            const rows = [
                { title: "Population", main: formatNumber(data.population) },
                createRow("insecurite_score", data.insecurite_score),
                ...createCrimeRows(crimeData, null, "/crime_graph.html?type=country&code=France"),
                createRow("immigration_score", data.immigration_score),
                createRow("extra_europeen_pct", null, null, namesData, yearLabel, "", { link: "/names_graph.html?type=country&code=France" }),
                createRow("islamisation_score", data.islamisation_score),
                {
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: MetricsConfig.formatMetricValue(Math.round(namesData.musulman_pct), "musulman_pct") + yearLabel,
                    subRow: true,
                    link: "/names_graph.html?type=country&code=France"
                },
                createRow("number_of_mosques", data.number_of_mosques),
                createRow("mosque_p100k", data.mosque_p100k),
                createRow("defrancisation_score", data.defrancisation_score),
                {
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("prenom_francais_total", namesData), "prenom_francais_pct") + yearLabel,
                    subRow: true,
                    link: "/names_graph.html?type=country&code=France"
                },
                createRow("wokisme_score", data.wokisme_score),
                createRow("total_qpv", data.total_qpv),
                createRow("pop_in_qpv_pct", data.pop_in_qpv_pct)
            ].filter(Boolean);

            renderScoreTable(data.country, rows);

        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche pays:", error);
        }
    }

    /**
     * Displays department-level details with comparison to country.
     */
    async function showDepartmentDetails(deptCode) {
        try {
            const [deptResponse, countryResponse, namesResponse, crimeResponse] = await Promise.all([
                fetch(`/api/departements/details?dept=${deptCode}`),
                fetch("/api/country/details"),
                fetch(`/api/departements/names?dept=${deptCode}`),
                fetch(`/api/departements/crime?dept=${deptCode}`),
            ]);

            if (!deptResponse.ok || !countryResponse.ok) {
                throw new Error(`Erreur lors de la récupération: département ${deptResponse.statusText}, pays ${countryResponse.statusText}`);
            }

            const data = await deptResponse.json();
            const countryData = await countryResponse.json();
            const namesData = await namesResponse.json();
            const crimeData = await crimeResponse.json();
            const countryNamesResponse = await fetch("/api/country/names");
            const countryNamesData = await countryNamesResponse.json();
            const countryCrimeResponse = await fetch("/api/country/crime");
            const countryCrimeData = await countryCrimeResponse.json();

            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun département trouvé.</p>";
                return;
            }

            const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";
            const countryYearLabel = countryNamesData?.annais ? ` (${countryNamesData.annais})` : "";

            const rows = [
                { 
                    title: "Population", 
                    main: formatNumber(data.population),
                    compare: formatNumber(countryData.population)
                },
                {
                    title: MetricsConfig.getMetricLabel("insecurite_score"),
                    main: formatNumber(data.insecurite_score),
                    compare: formatNumber(countryData.insecurite_score)
                },
                ...createCrimeRows(crimeData, countryCrimeData, "/crime_graph.html?type=department&code=", deptCode),
                {
                    title: MetricsConfig.getMetricLabel("immigration_score"),
                    main: formatNumber(data.immigration_score),
                    compare: formatNumber(countryData.immigration_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                    main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("extra_europeen_pct", namesData), "extra_europeen_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("extra_europeen_pct", countryNamesData), "extra_europeen_pct") + countryYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=department&code=${deptCode}`
                },
                {
                    title: MetricsConfig.getMetricLabel("islamisation_score"),
                    main: formatNumber(data.islamisation_score),
                    compare: formatNumber(countryData.islamisation_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: MetricsConfig.formatMetricValue(Math.round(namesData.musulman_pct), "musulman_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(Math.round(countryNamesData.musulman_pct), "musulman_pct") + countryYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=department&code=${deptCode}`
                },
                {
                    title: MetricsConfig.getMetricLabel("number_of_mosques"),
                    main: data.number_of_mosques,
                    compare: countryData.number_of_mosques,
                    subRow: true
                },
                {
                    title: MetricsConfig.getMetricLabel("mosque_p100k"),
                    main: MetricsConfig.formatMetricValue(data.mosque_p100k, "mosque_p100k"),
                    compare: MetricsConfig.formatMetricValue(countryData.mosque_p100k, "mosque_p100k"),
                    subRow: true
                },
                {
                    title: MetricsConfig.getMetricLabel("defrancisation_score"),
                    main: formatNumber(data.defrancisation_score),
                    compare: formatNumber(countryData.defrancisation_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("prenom_francais_total", namesData), "prenom_francais_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("prenom_francais_total", countryNamesData), "prenom_francais_pct") + countryYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=department&code=${deptCode}`
                },
                {
                    title: MetricsConfig.getMetricLabel("wokisme_score"),
                    main: formatNumber(data.wokisme_score),
                    compare: formatNumber(countryData.wokisme_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("total_qpv"),
                    main: data.total_qpv ?? 0,
                    compare: "",
                    subRow: true,
                    link: `/qpv.html?type=department&code=${deptCode}`
                },
                {
                    title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                    main: MetricsConfig.formatMetricValue(data.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                    compare: MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                    subRow: true
                }
            ];

            renderScoreTable(
                `${deptCode} - ${departmentNames[deptCode] || deptCode}`,
                rows,
                "France"
            );

        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche département:", error);
        }
    }

    /**
     * Displays commune-level details with comparison to department.
     */
    async function showCommuneDetails(cog) {
        try {
            const communeDetailsResponse = await fetch(`/api/communes/details?cog=${encodeURIComponent(cog)}`);
            if (!communeDetailsResponse.ok) {
                throw new Error(`Erreur lors de la récupération de la commune: ${communeDetailsResponse.statusText}`);
            }

            const item = await communeDetailsResponse.json();
            if (!item) {
                resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            const departement = item.departement;
            const commune = item.commune;

            const [deptResponse, deptNamesResponse, deptCrimeResponse, namesResponse, crimeResponse] = await Promise.all([
                fetch(`/api/departements/details?dept=${departement}`),
                fetch(`/api/departements/names?dept=${departement}`),
                fetch(`/api/departements/crime?dept=${departement}`),
                fetch(`/api/communes/names?dept=${departement}&cog=${encodeURIComponent(cog)}`),
                fetch(`/api/communes/crime?dept=${departement}&cog=${encodeURIComponent(cog)}`)
            ]);

            if (!deptResponse.ok) {
                throw new Error(`Erreur lors de la récupération du département: ${deptResponse.statusText}`);
            }

            const deptData = await deptResponse.json();
            const namesData = await namesResponse.json();
            const crimeData = await crimeResponse.json();
            const deptNamesData = await deptNamesResponse.json();
            const deptCrimeData = await deptCrimeResponse.json();

            const linkParams = `${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`;

            const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";
            const deptYearLabel = deptNamesData?.annais ? ` (${deptNamesData.annais})` : "";

            const rows = [
                {
                    title: "Population",
                    main: formatNumber(item.population),
                    compare: formatNumber(deptData.population)
                },
                {
                    title: MetricsConfig.getMetricLabel("insecurite_score"),
                    main: formatNumber(item.insecurite_score),
                    compare: formatNumber(deptData.insecurite_score)
                },
                ...createCrimeRows(crimeData, deptCrimeData, "/crime_graph.html?type=commune&code=", linkParams),
                {
                    title: MetricsConfig.getMetricLabel("immigration_score"),
                    main: formatNumber(item.immigration_score),
                    compare: formatNumber(deptData.immigration_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                    main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("extra_europeen_pct", namesData), "extra_europeen_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("extra_europeen_pct", deptNamesData), "extra_europeen_pct") + deptYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`
                },
                {
                    title: MetricsConfig.getMetricLabel("islamisation_score"),
                    main: formatNumber(item.islamisation_score),
                    compare: formatNumber(deptData.islamisation_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: MetricsConfig.formatMetricValue(Math.round(namesData.musulman_pct), "musulman_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(Math.round(deptNamesData.musulman_pct), "musulman_pct") + deptYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`
                },
                {
                    title: MetricsConfig.getMetricLabel("number_of_mosques"),
                    main: item.number_of_mosques,
                    compare: deptData.number_of_mosques,
                    subRow: true
                },
                {
                    title: MetricsConfig.getMetricLabel("mosque_p100k"),
                    main: MetricsConfig.formatMetricValue(item.mosque_p100k, "mosque_p100k"),
                    compare: MetricsConfig.formatMetricValue(deptData.mosque_p100k, "mosque_p100k"),
                    subRow: true
                },
                {
                    title: MetricsConfig.getMetricLabel("defrancisation_score"),
                    main: formatNumber(item.defrancisation_score),
                    compare: formatNumber(deptData.defrancisation_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("prenom_francais_total", namesData), "prenom_francais_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(MetricsConfig.calculateMetric("prenom_francais_total", deptNamesData), "prenom_francais_pct") + deptYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`
                },
                {
                    title: MetricsConfig.getMetricLabel("wokisme_score"),
                    main: formatNumber(item.wokisme_score),
                    compare: formatNumber(deptData.wokisme_score)
                },
                {
                    title: MetricsConfig.getMetricLabel("total_qpv"),
                    main: item.total_qpv ?? 0,
                    compare: deptData.total_qpv ?? 0,
                    subRow: true,
                    link: `/qpv.html?type=commune&code=${linkParams}`
                },
                {
                    title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                    main: MetricsConfig.formatMetricValue(item.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                    compare: MetricsConfig.formatMetricValue(deptData.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                    subRow: true
                }
            ];

            renderScoreTable(
                `${departement} - ${commune}`,
                rows,
                departmentNames[departement] || departement
            );

        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche:", error);
        }
    }

    /**
     * Renders a score table with expandable sub-rows.
     */
    function renderScoreTable(header, rows, compareHeader = "") {
        // Group rows by main row and assign a group ID
        let currentGroupId = null;
        const groupedRows = rows.map((row, index) => {
            if (!row.subRow) {
                currentGroupId = `group-${index}`;
            }
            return { ...row, groupId: currentGroupId };
        });

        resultsDiv.innerHTML = `
            <div class="data-box">
                <table class="score-table">
                    <thead>
                        <tr class="score-header">
                            <th class="row-title"></th>
                            <th class="score-main">${header}</th>
                            ${compareHeader ? `<th class="score-compare">${compareHeader}</th>` : ""}
                        </tr>
                    </thead>
                    <tbody>
                        ${groupedRows
                            .map(
                                (row) => `
                            <tr class="score-row${row.subRow ? ` sub-row group-${row.groupId}` : ""}" ${!row.subRow ? `data-group-id="${row.groupId}"` : ""}>
                                <td class="row-title${row.subRow ? " sub-row" : ""}">
                                    ${row.link ? `<a href="${row.link}" target="_blank">${row.title}</a>` : row.title}
                                </td>
                                <td class="score-main">${row.main}</td>
                                ${row.compare ? `<td class="score-compare">${row.compare}</td>` : compareHeader ? "<td></td>" : ""}
                            </tr>
                        `,
                            )
                            .join("")}
                    </tbody>
                </table>
            </div>
        `;

        // Add click event listeners to main rows
        const mainRows = resultsDiv.querySelectorAll(".score-row:not(.sub-row)");
        mainRows.forEach((row) => {
            row.addEventListener("click", () => {
                const groupId = row.getAttribute("data-group-id");
                const subRows = resultsDiv.querySelectorAll(`.sub-row.group-${groupId}`);
                subRows.forEach((subRow) => {
                    subRow.classList.toggle("sub-row-hidden");
                });
            });
        });
    }

    return {
        showCountryDetails,
        showDepartmentDetails,
        showCommuneDetails,
    };
}

export { ScoreTableHandler };