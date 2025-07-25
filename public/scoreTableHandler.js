import { formatNumber } from "./utils.js";
import { MetricsConfig } from "./metricsConfig.js";

/**
 * Score table handler module for displaying detailed score information.
 * Manages the display of scores for countries, departments, and communes.
 * @param {HTMLElement} resultsDiv - Container for displaying results
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Score table handler interface
 */
function ScoreTableHandler(resultsDiv, departmentNames) {
    /**
     * Displays country-level details with comprehensive statistics.
     * @async
     */
    async function showCountryDetails() {
        try {
            const [response, namesResponse, crimeResponse] = await Promise.all([
                fetch("/api/country/details"),
                fetch("/api/country/names"),
                fetch("/api/country/crime"),
            ]);
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la récupération des détails du pays: ${response.statusText}`,
                );
            }
            const data = await response.json();
            const namesData = await namesResponse.json();
            const crimeData = await crimeResponse.json();
            console.log("Country details:", data);
            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun pays trouvé.</p>";
            } else {
                const extraEuropeenPct = MetricsConfig.calculateMetric(
                    "extra_europeen_pct",
                    namesData,
                );
                const musulmanPct = Math.round(namesData.musulman_pct);
                const yearLabel = namesData.annais
                    ? ` (${namesData.annais})`
                    : "";
                const crimeYearLabel = crimeData.annee
                    ? ` (${crimeData.annee})`
                    : "";
                renderScoreTable(data.country, [
                    {
                        title: "Population",
                        main: formatNumber(data.population),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("insecurite_score"),
                        main: formatNumber(data.insecurite_score),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("homicides_p100k"),
                        main:
                            MetricsConfig.calculateMetric(
                                "homicides_total_p100k",
                                crimeData,
                            ).toFixed(2) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                        main:
                            MetricsConfig.calculateMetric(
                                "violences_physiques_p1k",
                                crimeData,
                            ).toFixed(1) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                        main:
                            crimeData.violences_sexuelles_p1k.toFixed(1) +
                            crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("vols_p1k"),
                        main:
                            MetricsConfig.calculateMetric(
                                "vols_p1k",
                                crimeData,
                            ).toFixed(1) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("destructions_p1k"),
                        main:
                            crimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                1,
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                        main:
                            MetricsConfig.calculateMetric(
                                "stupefiants_p1k",
                                crimeData,
                            ).toFixed(1) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                        main:
                            crimeData.escroqueries_p1k.toFixed(1) +
                            crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("immigration_score"),
                        main: formatNumber(data.immigration_score),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                        main: `${extraEuropeenPct}%${yearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("islamisation_score"),
                        main: formatNumber(data.islamisation_score),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("musulman_pct"),
                        main: `${musulmanPct}%${yearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("number_of_mosques"),
                        main: data.number_of_mosques,
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("mosque_p100k"),
                        main: data.mosque_p100k.toFixed(1),
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("defrancisation_score"),
                        main: formatNumber(data.defrancisation_score),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                        main: `${MetricsConfig.calculateMetric("prenom_francais_total", namesData)}%${yearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("wokisme_score"),
                        main: formatNumber(data.wokisme_score),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("total_qpv"),
                        main: data.total_qpv,
                        subRow: true,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                        main: data.pop_in_qpv_pct.toFixed(1) + "%",
                        subRow: true,
                    },
                ]);
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
                deptResponse,
                countryResponse,
                namesResponse,
                crimeResponse,
            ] = await Promise.all([
                fetch(`/api/departements/details?dept=${deptCode}`),
                fetch("/api/country/details"),
                fetch(`/api/departements/names?dept=${deptCode}`),
                fetch(`/api/departements/crime?dept=${deptCode}`),
            ]);
            if (!deptResponse.ok || !countryResponse.ok) {
                throw new Error(
                    `Erreur lors de la récupération: département ${deptResponse.statusText}, pays ${countryResponse.statusText}`,
                );
            }
            const data = await deptResponse.json();
            const countryData = await countryResponse.json();
            const namesData = await namesResponse.json();
            const crimeData = await crimeResponse.json();
            const countryNamesResponse = await fetch("/api/country/names");
            const countryNamesData = await countryNamesResponse.json();
            const countryCrimeResponse = await fetch("/api/country/crime");
            const countryCrimeData = await countryCrimeResponse.json();
            console.log("Department details:", data);
            if (!data) {
                resultsDiv.innerHTML = "<p>Aucun département trouvé.</p>";
            } else {
                const extraEuropeenPct = MetricsConfig.calculateMetric(
                    "extra_europeen_pct",
                    namesData,
                );
                const countryExtraEuropeenPct = MetricsConfig.calculateMetric(
                    "extra_europeen_pct",
                    countryNamesData,
                );
                const musulmanPct = Math.round(namesData.musulman_pct);
                const countryMusulmanPct = Math.round(
                    countryNamesData.musulman_pct,
                );
                const yearLabel = namesData.annais
                    ? ` (${namesData.annais})`
                    : "";
                const countryYearLabel = countryNamesData.annais
                    ? ` (${countryNamesData.annais})`
                    : "";
                const crimeYearLabel = crimeData.annee
                    ? ` (${crimeData.annee})`
                    : "";
                const countryCrimeYearLabel = countryCrimeData.annee
                    ? ` (${countryCrimeData.annee})`
                    : "";
                renderScoreTable(
                    `${deptCode} - ${departmentNames[deptCode] || deptCode}`,
                    [
                        {
                            title: "Population",
                            main: formatNumber(data.population),
                            compare: formatNumber(countryData.population),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("insecurite_score"),
                            main: formatNumber(data.insecurite_score),
                            compare: formatNumber(countryData.insecurite_score),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("homicides_p100k"),
                            main:
                                MetricsConfig.calculateMetric(
                                    "homicides_total_p100k",
                                    crimeData,
                                ).toFixed(2) + crimeYearLabel,
                            compare:
                                MetricsConfig.calculateMetric(
                                    "homicides_total_p100k",
                                    countryCrimeData,
                                ).toFixed(2) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                            main:
                                MetricsConfig.calculateMetric(
                                    "violences_physiques_p1k",
                                    crimeData,
                                ).toFixed(1) + crimeYearLabel,
                            compare:
                                MetricsConfig.calculateMetric(
                                    "violences_physiques_p1k",
                                    countryCrimeData,
                                ).toFixed(1) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                            main:
                                crimeData.violences_sexuelles_p1k.toFixed(1) +
                                crimeYearLabel,
                            compare:
                                countryCrimeData.violences_sexuelles_p1k.toFixed(
                                    1,
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("vols_p1k"),
                            main:
                                MetricsConfig.calculateMetric(
                                    "vols_p1k",
                                    crimeData,
                                ).toFixed(1) + crimeYearLabel,
                            compare:
                                MetricsConfig.calculateMetric(
                                    "vols_p1k",
                                    countryCrimeData,
                                ).toFixed(1) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("destructions_p1k"),
                            main:
                                crimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                    1,
                                ) + crimeYearLabel,
                            compare:
                                countryCrimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                    1,
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                            main:
                                MetricsConfig.calculateMetric(
                                    "stupefiants_p1k",
                                    crimeData,
                                ).toFixed(1) + crimeYearLabel,
                            compare:
                                MetricsConfig.calculateMetric(
                                    "stupefiants_p1k",
                                    countryCrimeData,
                                ).toFixed(1) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                            main:
                                crimeData.escroqueries_p1k.toFixed(1) +
                                crimeYearLabel,
                            compare:
                                countryCrimeData.escroqueries_p1k.toFixed(1) +
                                countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("immigration_score"),
                            main: formatNumber(data.immigration_score),
                            compare: formatNumber(
                                countryData.immigration_score,
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                            main: `${extraEuropeenPct}%${yearLabel}`,
                            compare: `${countryExtraEuropeenPct}%${countryYearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("islamisation_score"),
                            main: formatNumber(data.islamisation_score),
                            compare: formatNumber(
                                countryData.islamisation_score,
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("musulman_pct"),
                            main: `${musulmanPct}%${yearLabel}`,
                            compare: `${countryMusulmanPct}%${countryYearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("number_of_mosques"),
                            main: data.number_of_mosques,
                            compare: countryData.number_of_mosques,
                            subRow: true,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("mosque_p100k"),
                            main: MetricsConfig.formatMetricValue(data.mosque_p100k, "mosque_p100k"),
                            compare: countryData.mosque_p100k,
                            subRow: true,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("defrancisation_score"),
                            main: formatNumber(data.defrancisation_score),
                            compare: formatNumber(
                                countryData.defrancisation_score,
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                            main: `${MetricsConfig.calculateMetric("prenom_francais_total", namesData)}%${yearLabel}`,
                            compare: `${MetricsConfig.calculateMetric("prenom_francais_total", countryNamesData)}%${countryYearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("wokisme_score"),
                            main: formatNumber(data.wokisme_score),
                            compare: formatNumber(countryData.wokisme_score),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("total_qpv"),
                            main:
                                data.total_qpv !== null &&
                                data.total_qpv !== undefined
                                    ? data.total_qpv
                                    : 0,
                            compare: "",
                            subRow: true,
                            link: `/qpv.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                            main: MetricsConfig.formatMetricValue(data.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                            compare: MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct || 0, "pop_in_qpv_pct"),
                            subRow: true,
                        },
                    ],
                    "France",
                );
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
            const communeDetailsResponse = await fetch(
                `/api/communes/details?cog=${encodeURIComponent(cog)}`,
            );
            if (!communeDetailsResponse.ok) {
                throw new Error(
                    `Erreur lors de la récupération de la commune: ${communeDetailsResponse.statusText}`,
                );
            }
            const item = await communeDetailsResponse.json();
            if (!item) {
                resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            const departement = item.departement;
            const commune = item.commune;

            const [deptResponse, deptNamesResponse, deptCrimeResponse] =
                await Promise.all([
                    fetch(`/api/departements/details?dept=${departement}`),
                    fetch(`/api/departements/names?dept=${departement}`),
                    fetch(`/api/departements/crime?dept=${departement}`),
                ]);
            if (!deptResponse.ok) {
                throw new Error(
                    `Erreur lors de la récupération du département: ${deptResponse.statusText}`,
                );
            }
            const deptData = await deptResponse.json();
            const namesResponse = await fetch(
                `/api/communes/names?dept=${departement}&cog=${encodeURIComponent(cog)}`,
            );
            const namesData = await namesResponse.json();
            const crimeResponse = await fetch(
                `/api/communes/crime?dept=${departement}&cog=${encodeURIComponent(cog)}`,
            );
            const crimeData = await crimeResponse.json();
            const deptNamesData = await deptNamesResponse.json();
            const deptCrimeData = await deptCrimeResponse.json();
            console.log("Commune details:", item);
            const extraEuropeenPct = MetricsConfig.calculateMetric(
                "extra_europeen_pct",
                namesData,
            );
            const deptExtraEuropeenPct = MetricsConfig.calculateMetric(
                "extra_europeen_pct",
                deptNamesData,
            );
            const musulmanPct = Math.round(namesData.musulman_pct);
            const deptMusulmanPct = Math.round(deptNamesData.musulman_pct);
            const traditionnelPct = Math.round(namesData.traditionnel_pct);
            const yearLabel = namesData.annais ? ` (${namesData.annais})` : "";
            const deptYearLabel = deptNamesData.annais
                ? ` (${deptNamesData.annais})`
                : "";
            const crimeYearLabel = crimeData.annee
                ? ` (${crimeData.annee})`
                : "";
            const deptCrimeYearLabel = deptCrimeData.annee
                ? ` (${deptCrimeData.annee})`
                : "";

            // Define rows, conditionally including prenom sub-rows only if their values are not NaN
            const rows = [
                {
                    title: "Population",
                    main: formatNumber(item.population),
                    compare: formatNumber(deptData.population),
                },
                {
                    title: MetricsConfig.getMetricLabel("insecurite_score"),
                    main: formatNumber(item.insecurite_score),
                    compare: formatNumber(deptData.insecurite_score),
                },
                {
                    title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                    main:
                        MetricsConfig.calculateMetric(
                            "violences_physiques_p1k",
                            crimeData,
                        ).toFixed(1) + crimeYearLabel,
                    compare:
                        MetricsConfig.calculateMetric(
                            "violences_physiques_p1k",
                            deptCrimeData,
                        ).toFixed(1) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                    main:
                        crimeData.violences_sexuelles_p1k.toFixed(1) +
                        crimeYearLabel,
                    compare:
                        deptCrimeData.violences_sexuelles_p1k.toFixed(1) +
                        deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("vols_p1k"),
                    main:
                        MetricsConfig.calculateMetric(
                            "vols_p1k",
                            crimeData,
                        ).toFixed(1) + crimeYearLabel,
                    compare:
                        MetricsConfig.calculateMetric(
                            "vols_p1k",
                            deptCrimeData,
                        ).toFixed(1) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("destructions_p1k"),
                    main:
                        crimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                            1,
                        ) + crimeYearLabel,
                    compare:
                        deptCrimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                            1,
                        ) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                    main:
                        MetricsConfig.calculateMetric(
                            "stupefiants_p1k",
                            crimeData,
                        ).toFixed(1) + crimeYearLabel,
                    compare:
                        MetricsConfig.calculateMetric(
                            "stupefiants_p1k",
                            deptCrimeData,
                        ).toFixed(1) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                    main:
                        crimeData.escroqueries_p1k.toFixed(1) + crimeYearLabel,
                    compare:
                        deptCrimeData.escroqueries_p1k.toFixed(1) +
                        deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("immigration_score"),
                    main: formatNumber(item.immigration_score),
                    compare: formatNumber(deptData.immigration_score),
                },
            ];

            // Conditionally add prenom-related sub-rows only if their values are not NaN
            if (!isNaN(extraEuropeenPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                    main: `${extraEuropeenPct}%${yearLabel}`,
                    compare: `${deptExtraEuropeenPct}%${deptYearLabel}`,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            rows.push({
                title: MetricsConfig.getMetricLabel("islamisation_score"),
                main: formatNumber(item.islamisation_score),
                compare: formatNumber(deptData.islamisation_score),
            });
            if (!isNaN(musulmanPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: `${musulmanPct}%${yearLabel}`,
                    compare: `${deptMusulmanPct}%${deptYearLabel}`,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            rows.push(
                {
                    title: MetricsConfig.getMetricLabel("number_of_mosques"),
                    main: item.number_of_mosques,
                    compare: deptData.number_of_mosques,
                    subRow: true,
                },
                {
                    title: MetricsConfig.getMetricLabel("mosque_p100k"),
                    main: item.mosque_p100k.toFixed(1),
                    compare: deptData.mosque_p100k.toFixed(1),
                    subRow: true,
                },
                {
                    title: MetricsConfig.getMetricLabel("defrancisation_score"),
                    main: formatNumber(item.defrancisation_score),
                    compare: formatNumber(deptData.defrancisation_score),
                },
            );
            if (!isNaN(traditionnelPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: `${MetricsConfig.calculateMetric("prenom_francais_total", namesData)}%${yearLabel}`,
                    compare: `${MetricsConfig.calculateMetric("prenom_francais_total", deptNamesData)}%${deptYearLabel}`,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            rows.push(
                {
                    title: MetricsConfig.getMetricLabel("wokisme_score"),
                    main: formatNumber(item.wokisme_score),
                    compare: formatNumber(deptData.wokisme_score),
                },
                {
                    title: MetricsConfig.getMetricLabel("total_qpv"),
                    main:
                        item.total_qpv !== null && item.total_qpv !== undefined
                            ? item.total_qpv
                            : 0,
                    compare:
                        deptData.total_qpv !== null &&
                        deptData.total_qpv !== undefined
                            ? deptData.total_qpv
                            : 0,
                    subRow: true,
                    link: `/qpv.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                    main:
                        item.pop_in_qpv_pct !== null &&
                        item.pop_in_qpv_pct !== undefined
                            ? item.pop_in_qpv_pct.toFixed(1) + "%"
                            : "0.0%",
                    compare:
                        deptData.pop_in_qpv_pct !== null &&
                        deptData.pop_in_qpv_pct !== undefined
                            ? deptData.pop_in_qpv_pct.toFixed(1) + "%"
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
                            <th class="row-title"></th>
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
