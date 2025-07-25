import { formatNumber } from "./utils.js";
import { MetricsConfig } from "./metricsConfig.js";
import { api } from "./apiService.js";
import { apiService } from "./apiService.js";

/**
 * Score table handler module for displaying detailed score information.
 * Manages the display of scores for countries, departments, and communes.
 * @param {HTMLElement} resultsDiv - Container for displaying results
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Score table handler interface
 */
function ScoreTableHandler(resultsDiv, departmentNames) {
    
    /**
     * Helper function to calculate and format common metrics
     * @param {Object} namesData - Names data
     * @param {Object} crimeData - Crime data
     * @returns {Object} Calculated metrics with labels
     */
    function calculateCommonMetrics(namesData, crimeData) {
        const extraEuropeenPct = MetricsConfig.calculateMetric("extra_europeen_pct", namesData);
        const musulmanPct = Math.round(namesData.musulman_pct);
        const prenomFrancaisPct = MetricsConfig.calculateMetric("prenom_francais_total", namesData);
        const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";
        const crimeYearLabel = crimeData.annee ? ` (${crimeData.annee})` : "";
        
        return {
            extraEuropeenPct,
            musulmanPct,
            prenomFrancaisPct,
            yearLabel,
            crimeYearLabel,
            // Pre-calculated crime metrics
            homicidesTotal: MetricsConfig.calculateMetric("homicides_total_p100k", crimeData),
            violencesPhysiques: MetricsConfig.calculateMetric("violences_physiques_p1k", crimeData),
            volsTotal: MetricsConfig.calculateMetric("vols_p1k", crimeData),
            stupefiants: MetricsConfig.calculateMetric("stupefiants_p1k", crimeData)
        };
    }

    /**
     * Helper function to create crime-related rows
     * @param {Object} metrics - Calculated metrics
     * @param {Object} crimeData - Crime data
     * @param {string} linkBase - Base URL for crime graph links
     * @param {Object} compareMetrics - Optional comparison metrics
     * @param {Object} compareCrimeData - Optional comparison crime data
     * @returns {Array} Array of crime-related table rows
     */
    function createCrimeRows(metrics, crimeData, linkBase, compareMetrics = null, compareCrimeData = null) {
        const rows = [];
        
        // Only add homicide row if metrics exist
        if (metrics) {
            rows.push({
                title: MetricsConfig.getMetricLabel("homicides_p100k"),
                main: MetricsConfig.formatMetricValue(metrics.homicidesTotal, "homicides_p100k") + metrics.crimeYearLabel,
                compare: compareMetrics ? 
                    MetricsConfig.formatMetricValue(compareMetrics.homicidesTotal, "homicides_p100k") + compareMetrics.crimeYearLabel : 
                    null,
                subRow: true,
                link: linkBase,
            });
        }

        // Add other crime rows that don't depend on metrics
        rows.push(
            {
                title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                main: metrics ? 
                    MetricsConfig.formatMetricValue(metrics.violencesPhysiques, "violences_physiques_p1k") + metrics.crimeYearLabel :
                    MetricsConfig.formatMetricValue(crimeData.violences_physiques_p1k, "violences_physiques_p1k") + (crimeData.annee ? ` (${crimeData.annee})` : ""),
                compare: compareMetrics ? 
                    MetricsConfig.formatMetricValue(compareMetrics.violencesPhysiques, "violences_physiques_p1k") + compareMetrics.crimeYearLabel : 
                    null,
                subRow: true,
                link: linkBase,
            },
            {
                title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                main: MetricsConfig.formatMetricValue(crimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
                compare: compareCrimeData ? 
                    MetricsConfig.formatMetricValue(compareCrimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
                    null,
                subRow: true,
                link: linkBase,
            },
            {
                title: MetricsConfig.getMetricLabel("vols_p1k"),
                main: metrics ? 
                    MetricsConfig.formatMetricValue(metrics.volsTotal, "vols_p1k") + metrics.crimeYearLabel :
                    MetricsConfig.formatMetricValue(crimeData.vols_p1k, "vols_p1k") + (crimeData.annee ? ` (${crimeData.annee})` : ""),
                compare: compareMetrics ? 
                    MetricsConfig.formatMetricValue(compareMetrics.volsTotal, "vols_p1k") + compareMetrics.crimeYearLabel : 
                    null,
                subRow: true,
                link: linkBase,
            },
            {
                title: MetricsConfig.getMetricLabel("destructions_p1k"),
                main: MetricsConfig.formatMetricValue(crimeData.destructions_et_degradations_volontaires_p1k, "destructions_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
                compare: compareCrimeData ? 
                    MetricsConfig.formatMetricValue(compareCrimeData.destructions_et_degradations_volontaires_p1k, "destructions_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
                    null,
                subRow: true,
                link: linkBase,
            },
            {
                title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                main: metrics ? 
                    MetricsConfig.formatMetricValue(metrics.stupefiants, "stupefiants_p1k") + metrics.crimeYearLabel :
                    MetricsConfig.formatMetricValue(crimeData.stupefiants_p1k, "stupefiants_p1k") + (crimeData.annee ? ` (${crimeData.annee})` : ""),
                compare: compareMetrics ? 
                    MetricsConfig.formatMetricValue(compareMetrics.stupefiants, "stupefiants_p1k") + compareMetrics.crimeYearLabel : 
                    null,
                subRow: true,
                link: linkBase,
            },
            {
                title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                main: MetricsConfig.formatMetricValue(crimeData.escroqueries_p1k, "escroqueries_p1k") + (metrics ? metrics.crimeYearLabel : (crimeData.annee ? ` (${crimeData.annee})` : "")),
                compare: compareCrimeData ? 
                    MetricsConfig.formatMetricValue(compareCrimeData.escroqueries_p1k, "escroqueries_p1k") + (compareMetrics ? compareMetrics.crimeYearLabel : "") : 
                    null,
                subRow: true,
                link: linkBase,
            }
        ];
        
        return rows.filter(row => row.compare !== null || compareMetrics === null);
    }
    /**
     * Displays country-level details with comprehensive statistics.
     * @async
     */
    async function showCountryDetails() {
        try {
            const [data, namesData, crimeData] = await Promise.all([
                api.getCountryDetails(),
                api.getCountryNames(),
                api.getCountryCrime()
            ]);

            console.log("Country details:", data);
            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun pays trouvé.</p>";
            } else {
                const metrics = calculateCommonMetrics(namesData, crimeData);
                const crimeRows = createCrimeRows(metrics, crimeData, `/crime_graph.html?type=country&code=France`);
                
                const rows = [
                    {
                        title: "Population",
                        main: formatNumber(data.population),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("insecurite_score"),
                        main: MetricsConfig.formatMetricValue(data.insecurite_score, "insecurite_score"),
                    },
                    ...crimeRows,
                    {
                        title: MetricsConfig.getMetricLabel("immigration_score"),
                        main: MetricsConfig.formatMetricValue(data.immigration_score, "immigration_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                        main: MetricsConfig.formatMetricValue(metrics.extraEuropeenPct, "extra_europeen_pct") + metrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("islamisation_score"),
                        main: MetricsConfig.formatMetricValue(data.islamisation_score, "islamisation_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("musulman_pct"),
                        main: MetricsConfig.formatMetricValue(metrics.musulmanPct, "musulman_pct") + metrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("number_of_mosques"),
                        main: MetricsConfig.formatMetricValue(data.number_of_mosques, "number_of_mosques"),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("mosque_p100k"),
                        main: MetricsConfig.formatMetricValue(data.mosque_p100k, "mosque_p100k"),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("defrancisation_score"),
                        main: MetricsConfig.formatMetricValue(data.defrancisation_score, "defrancisation_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                        main: MetricsConfig.formatMetricValue(metrics.prenomFrancaisPct, "prenom_francais_pct") + metrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("wokisme_score"),
                        main: MetricsConfig.formatMetricValue(data.wokisme_score, "wokisme_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("total_qpv"),
                        main: MetricsConfig.formatMetricValue(data.total_qpv, "total_qpv"),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                        main: MetricsConfig.formatMetricValue(data.pop_in_qpv_pct, "pop_in_qpv_pct"),
                        subRow: true,
                    },
                ];
                
                renderScoreTable(data.country, rows);
            }
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche pays:", error);
        }
    }

    /**
     * Displays department-level details with comparison to country.
     * @async
     * @param {string} deptCode - Department code
     */
    async function showDepartmentDetails(deptCode) {
        try {
            const [
                data,
                countryData,
                namesData,
                crimeData,
                countryNamesData,
                countryCrimeData,
            ] = await Promise.all([
                api.getDepartmentDetails(deptCode),
                api.getCountryDetails(),
                api.getDepartmentNames(deptCode),
                api.getDepartmentCrime(deptCode),
                api.getCountryNames(),
                api.getCountryCrime(),
            ]);

            console.log("Department details:", data);
            
            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun département trouvé.</p>";
            } else {
                const deptMetrics = calculateCommonMetrics(namesData, crimeData);
                const countryMetrics = calculateCommonMetrics(countryNamesData, countryCrimeData);
                const crimeRows = createCrimeRows(
                    deptMetrics, 
                    crimeData, 
                    `/crime_graph.html?type=department&code=${deptCode}`,
                    countryMetrics,
                    countryCrimeData
                );
                const rows = [
                    {
                        title: "Population",
                        main: formatNumber(data.population),
                        compare: formatNumber(countryData.population),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("insecurite_score"),
                        main: MetricsConfig.formatMetricValue(data.insecurite_score, "insecurite_score"),
                        compare: MetricsConfig.formatMetricValue(countryData.insecurite_score, "insecurite_score"),
                    },
                    ...crimeRows,
                    {
                        title: MetricsConfig.getMetricLabel("immigration_score"),
                        main: MetricsConfig.formatMetricValue(data.immigration_score, "immigration_score"),
                        compare: MetricsConfig.formatMetricValue(countryData.immigration_score, "immigration_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                        main: MetricsConfig.formatMetricValue(deptMetrics.extraEuropeenPct, "extra_europeen_pct") + deptMetrics.yearLabel,
                        compare: MetricsConfig.formatMetricValue(countryMetrics.extraEuropeenPct, "extra_europeen_pct") + countryMetrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=department&code=${deptCode}`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("islamisation_score"),
                        main: MetricsConfig.formatMetricValue(data.islamisation_score, "islamisation_score"),
                        compare: MetricsConfig.formatMetricValue(countryData.islamisation_score, "islamisation_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("musulman_pct"),
                        main: MetricsConfig.formatMetricValue(deptMetrics.musulmanPct, "musulman_pct") + deptMetrics.yearLabel,
                        compare: MetricsConfig.formatMetricValue(countryMetrics.musulmanPct, "musulman_pct") + countryMetrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=department&code=${deptCode}`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("number_of_mosques"),
                        main: MetricsConfig.formatMetricValue(data.number_of_mosques, "number_of_mosques"),
                        compare: MetricsConfig.formatMetricValue(countryData.number_of_mosques, "number_of_mosques"),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("mosque_p100k"),
                        main: MetricsConfig.formatMetricValue(data.mosque_p100k, "mosque_p100k"),
                        compare: MetricsConfig.formatMetricValue(countryData.mosque_p100k, "mosque_p100k"),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("defrancisation_score"),
                        main: MetricsConfig.formatMetricValue(data.defrancisation_score, "defrancisation_score"),
                        compare: MetricsConfig.formatMetricValue(countryData.defrancisation_score, "defrancisation_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                        main: MetricsConfig.formatMetricValue(deptMetrics.prenomFrancaisPct, "prenom_francais_pct") + deptMetrics.yearLabel,
                        compare: MetricsConfig.formatMetricValue(countryMetrics.prenomFrancaisPct, "prenom_francais_pct") + countryMetrics.yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=department&code=${deptCode}`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("wokisme_score"),
                        main: MetricsConfig.formatMetricValue(data.wokisme_score, "wokisme_score"),
                        compare: MetricsConfig.formatMetricValue(countryData.wokisme_score, "wokisme_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("total_qpv"),
                        main: data.total_qpv !== null && data.total_qpv !== undefined
                            ? MetricsConfig.formatMetricValue(data.total_qpv, "total_qpv")
                            : "0",
                        compare: "",
                        subRow: true,
                        link: `/qpv.html?type=department&code=${deptCode}`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                        main: data.pop_in_qpv_pct !== null && data.pop_in_qpv_pct !== undefined
                            ? MetricsConfig.formatMetricValue(data.pop_in_qpv_pct, "pop_in_qpv_pct")
                            : "0.0%",
                        compare: countryData.pop_in_qpv_pct !== null && countryData.pop_in_qpv_pct !== undefined
                            ? MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct, "pop_in_qpv_pct")
                            : "0.0%",
                        subRow: true,
                    },
                ];
                
                renderScoreTable(`${deptCode} - ${departmentNames[deptCode] || deptCode}`, rows, "France");
            }
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche département:", error);
        }
    }

    /**
     * Displays commune-level details with comparison to department.
     * @async
     * @param {string} cog - Commune COG code
     */
    async function showCommuneDetails(cog) {
        try {
            // First get commune details from COG
            const item = await api.getCommuneDetails(cog);

            if (!item) {
                resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            const departement = item.departement;
            const commune = item.commune;

            // Handle missing commune names data gracefully
            let namesData = null;
            try {
                namesData = await api.getCommuneNames(cog);
            } catch (error) {
                console.log('Commune names data not available for COG:', cog);
                namesData = null;
            }

            const [deptData, crimeData, deptNamesData, deptCrimeData] =
                await Promise.all([
                    api.getDepartmentDetails(departement),
                    api.getCommuneCrime(cog),
                    api.getDepartmentNames(departement),
                    api.getDepartmentCrime(departement)
                ]);

            console.log("Commune details:", item);
            const communeMetrics = namesData ? calculateCommonMetrics(namesData, crimeData) : null;
            const deptMetrics = calculateCommonMetrics(deptNamesData, deptCrimeData);
            const traditionnelPct = namesData ? Math.round(namesData.traditionnel_pct) : null;
            const crimeRows = createCrimeRows(
                communeMetrics, 
                crimeData, 
                `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                deptMetrics,
                deptCrimeData
            );

            // Define rows, conditionally including prenom sub-rows only if their values are not NaN
            const rows = [
                {
                    title: "Population",
                    main: formatNumber(item.population),
                    compare: formatNumber(deptData.population),
                },
                {
                    title: MetricsConfig.getMetricLabel("insecurite_score"),
                    main: MetricsConfig.formatMetricValue(item.insecurite_score, "insecurite_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.insecurite_score, "insecurite_score"),
                },
                ...crimeRows, // Crime rows are now conditionally created
                {
                    title: MetricsConfig.getMetricLabel("immigration_score"),
                    main: MetricsConfig.formatMetricValue(item.immigration_score, "immigration_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.immigration_score, "immigration_score"),
                },
            ];

            // Conditionally add prenom-related sub-rows only if names data exists and values are not NaN
            if (communeMetrics && !isNaN(communeMetrics.extraEuropeenPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                    main: MetricsConfig.formatMetricValue(communeMetrics.extraEuropeenPct, "extra_europeen_pct") + communeMetrics.yearLabel,
                    compare: MetricsConfig.formatMetricValue(deptMetrics.extraEuropeenPct, "extra_europeen_pct") + deptMetrics.yearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            
            rows.push({
                title: MetricsConfig.getMetricLabel("islamisation_score"),
                main: MetricsConfig.formatMetricValue(item.islamisation_score, "islamisation_score"),
                compare: MetricsConfig.formatMetricValue(deptData.islamisation_score, "islamisation_score"),
            });
            
            if (communeMetrics && !isNaN(communeMetrics.musulmanPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: MetricsConfig.formatMetricValue(communeMetrics.musulmanPct, "musulman_pct") + communeMetrics.yearLabel,
                    compare: MetricsConfig.formatMetricValue(deptMetrics.musulmanPct, "musulman_pct") + deptMetrics.yearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            
            rows.push(
                {
                    title: MetricsConfig.getMetricLabel("number_of_mosques"),
                    main: MetricsConfig.formatMetricValue(item.number_of_mosques, "number_of_mosques"),
                    compare: MetricsConfig.formatMetricValue(deptData.number_of_mosques, "number_of_mosques"),
                    subRow: true,
                },
                {
                    title: MetricsConfig.getMetricLabel("mosque_p100k"),
                    main: MetricsConfig.formatMetricValue(item.mosque_p100k, "mosque_p100k"),
                    compare: MetricsConfig.formatMetricValue(deptData.mosque_p100k, "mosque_p100k"),
                    subRow: true,
                },
                {
                    title: MetricsConfig.getMetricLabel("defrancisation_score"),
                    main: MetricsConfig.formatMetricValue(item.defrancisation_score, "defrancisation_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.defrancisation_score, "defrancisation_score"),
                },
            );
            
            if (communeMetrics && traditionnelPct !== null && !isNaN(traditionnelPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: MetricsConfig.formatMetricValue(communeMetrics.prenomFrancaisPct, "prenom_francais_pct") + communeMetrics.yearLabel,
                    compare: MetricsConfig.formatMetricValue(deptMetrics.prenomFrancaisPct, "prenom_francais_pct") + deptMetrics.yearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            
            rows.push(
                {
                    title: MetricsConfig.getMetricLabel("wokisme_score"),
                    main: MetricsConfig.formatMetricValue(item.wokisme_score, "wokisme_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.wokisme_score, "wokisme_score"),
                },
                {
                    title: MetricsConfig.getMetricLabel("total_qpv"),
                    main: item.total_qpv !== null && item.total_qpv !== undefined
                        ? MetricsConfig.formatMetricValue(item.total_qpv, "total_qpv")
                        : "0",
                    compare: deptData.total_qpv !== null && deptData.total_qpv !== undefined
                        ? MetricsConfig.formatMetricValue(deptData.total_qpv, "total_qpv")
                        : "0",
                    subRow: true,
                    link: `/qpv.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                    main: item.pop_in_qpv_pct !== null && item.pop_in_qpv_pct !== undefined
                        ? MetricsConfig.formatMetricValue(item.pop_in_qpv_pct, "pop_in_qpv_pct")
                        : "0.0%",
                    compare: deptData.pop_in_qpv_pct !== null && deptData.pop_in_qpv_pct !== undefined
                        ? MetricsConfig.formatMetricValue(deptData.pop_in_qpv_pct, "pop_in_qpv_pct")
                        : "0.0%",
                    subRow: true,
                },
            );

            renderScoreTable(
                `${departement} - ${commune}`,
                rows,
                departmentNames[departement] || departement,
            );
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur lors de la recherche:", error);
        }
    }

    /**
     * Renders a score table with expandable sub-rows.
     * @param {string} header - Table header text
     * @param {Array} rows - Array of row objects
     * @param {string} compareHeader - Optional comparison header
     */
    function renderScoreTable(header, rows, compareHeader = "") {
        console.log(
            "Rendering table with header:",
            header,
            "rows:",
            rows,
            "compareHeader:",
            compareHeader,
        );

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
                            <th class="row-title">                            </th>
                            <th class="score-main">${header}</th>
                            ${compareHeader ? `<th class="score-compare">${compareHeader}</th>` : ""}
                        </tr>
                    </thead>
                    <tbody>
                        ${groupedRows
                            .map(
                                (row, index) => `
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
        const mainRows = resultsDiv.querySelectorAll(
            ".score-row:not(.sub-row)",
        );
        mainRows.forEach((row) => {
            row.addEventListener("click", () => {
                const groupId = row.getAttribute("data-group-id");
                const subRows = resultsDiv.querySelectorAll(
                    `.sub-row.group-${groupId}`,
                );
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

// Export for ES6 modules
export { ScoreTableHandler };