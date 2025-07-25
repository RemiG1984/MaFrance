
import { formatNumber } from "./utils.js";
import { MetricsConfig } from "./metricsConfig.js";
import { api } from "./apiService.js";

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
            const [data, namesData, crimeData] = await Promise.all([
                api.getCountryDetails(),
                api.request("/api/country/names"),
                api.request("/api/country/crime")
            ]);
            
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
                        main: MetricsConfig.formatMetricValue(data.insecurite_score, "insecurite_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("homicides_p100k"),
                        main:
                            MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("homicides_total_p100k", crimeData),
                                "homicides_p100k"
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("violences_physiques_p1k", crimeData),
                                "violences_physiques_p1k"
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(crimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") +
                            crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("vols_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("vols_p1k", crimeData),
                                "vols_p1k"
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("destructions_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(
                                crimeData.destructions_et_degradations_volontaires_p1k,
                                "destructions_p1k"
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("stupefiants_p1k", crimeData),
                                "stupefiants_p1k"
                            ) + crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                        main:
                            MetricsConfig.formatMetricValue(crimeData.escroqueries_p1k, "escroqueries_p1k") +
                            crimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("immigration_score"),
                        main: MetricsConfig.formatMetricValue(data.immigration_score, "immigration_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                        main: MetricsConfig.formatMetricValue(extraEuropeenPct, "extra_europeen_pct") + yearLabel,
                        subRow: true,
                        link: `/names_graph.html?type=country&code=France`,
                    },
                    {
                        title: MetricsConfig.getMetricLabel("islamisation_score"),
                        main: MetricsConfig.formatMetricValue(data.islamisation_score, "islamisation_score"),
                    },
                    {
                        title: MetricsConfig.getMetricLabel("musulman_pct"),
                        main: MetricsConfig.formatMetricValue(musulmanPct, "musulman_pct") + yearLabel,
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
                        main: MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("prenom_francais_total", namesData),
                            "prenom_francais_pct"
                        ) + yearLabel,
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
                data,
                countryData,
                namesData,
                crimeData,
                countryNamesData,
                countryCrimeData,
            ] = await Promise.all([
                api.request(`/api/departements/details?dept=${deptCode}`),
                api.getCountryDetails(),
                api.request(`/api/departements/names?dept=${deptCode}`),
                api.request(`/api/departements/crime?dept=${deptCode}`),
                api.request("/api/country/names"),
                api.request("/api/country/crime"),
            ]);

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
                            main: MetricsConfig.formatMetricValue(data.insecurite_score, "insecurite_score"),
                            compare: MetricsConfig.formatMetricValue(countryData.insecurite_score, "insecurite_score"),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("homicides_p100k"),
                            main:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("homicides_total_p100k", crimeData),
                                    "homicides_p100k"
                                ) + crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("homicides_total_p100k", countryCrimeData),
                                    "homicides_p100k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("violences_physiques_p1k", crimeData),
                                    "violences_physiques_p1k"
                                ) + crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("violences_physiques_p1k", countryCrimeData),
                                    "violences_physiques_p1k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(crimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") +
                                crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    countryCrimeData.violences_sexuelles_p1k,
                                    "violences_sexuelles_p1k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("vols_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("vols_p1k", crimeData),
                                    "vols_p1k"
                                ) + crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("vols_p1k", countryCrimeData),
                                    "vols_p1k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("destructions_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(
                                    crimeData.destructions_et_degradations_volontaires_p1k,
                                    "destructions_p1k"
                                ) + crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    countryCrimeData.destructions_et_degradations_volontaires_p1k,
                                    "destructions_p1k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("stupefiants_p1k", crimeData),
                                    "stupefiants_p1k"
                                ) + crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(
                                    MetricsConfig.calculateMetric("stupefiants_p1k", countryCrimeData),
                                    "stupefiants_p1k"
                                ) + countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                            main:
                                MetricsConfig.formatMetricValue(crimeData.escroqueries_p1k, "escroqueries_p1k") +
                                crimeYearLabel,
                            compare:
                                MetricsConfig.formatMetricValue(countryCrimeData.escroqueries_p1k, "escroqueries_p1k") +
                                countryCrimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("immigration_score"),
                            main: MetricsConfig.formatMetricValue(data.immigration_score, "immigration_score"),
                            compare: MetricsConfig.formatMetricValue(
                                countryData.immigration_score,
                                "immigration_score"
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                            main: MetricsConfig.formatMetricValue(extraEuropeenPct, "extra_europeen_pct") + yearLabel,
                            compare: MetricsConfig.formatMetricValue(countryExtraEuropeenPct, "extra_europeen_pct") + countryYearLabel,
                            subRow: true,
                            link: `/names_graph.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("islamisation_score"),
                            main: MetricsConfig.formatMetricValue(data.islamisation_score, "islamisation_score"),
                            compare: MetricsConfig.formatMetricValue(
                                countryData.islamisation_score,
                                "islamisation_score"
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("musulman_pct"),
                            main: MetricsConfig.formatMetricValue(musulmanPct, "musulman_pct") + yearLabel,
                            compare: MetricsConfig.formatMetricValue(countryMusulmanPct, "musulman_pct") + countryYearLabel,
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
                            compare: MetricsConfig.formatMetricValue(
                                countryData.defrancisation_score,
                                "defrancisation_score"
                            ),
                        },
                        {
                            title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                            main: MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("prenom_francais_total", namesData),
                                "prenom_francais_pct"
                            ) + yearLabel,
                            compare: MetricsConfig.formatMetricValue(
                                MetricsConfig.calculateMetric("prenom_francais_total", countryNamesData),
                                "prenom_francais_pct"
                            ) + countryYearLabel,
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
                            main:
                                data.total_qpv !== null &&
                                data.total_qpv !== undefined
                                    ? MetricsConfig.formatMetricValue(data.total_qpv, "total_qpv")
                                    : "0",
                            compare: "",
                            subRow: true,
                            link: `/qpv.html?type=department&code=${deptCode}`,
                        },
                        {
                            title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                            main:
                                data.pop_in_qpv_pct !== null &&
                                data.pop_in_qpv_pct !== undefined
                                    ? MetricsConfig.formatMetricValue(data.pop_in_qpv_pct, "pop_in_qpv_pct")
                                    : "0.0%",
                            compare:
                                countryData.pop_in_qpv_pct !== null &&
                                countryData.pop_in_qpv_pct !== undefined
                                    ? MetricsConfig.formatMetricValue(countryData.pop_in_qpv_pct, "pop_in_qpv_pct")
                                    : "0.0%",
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
            const item = await api.request(
                `/api/communes/details?cog=${encodeURIComponent(cog)}`
            );
            
            if (!item) {
                resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            const departement = item.departement;
            const commune = item.commune;

            const [deptData, namesData, crimeData, deptNamesData, deptCrimeData] =
                await Promise.all([
                    api.request(`/api/departements/details?dept=${departement}`),
                    api.request(`/api/communes/names?dept=${departement}&cog=${encodeURIComponent(cog)}`),
                    api.request(`/api/communes/crime?dept=${departement}&cog=${encodeURIComponent(cog)}`),
                    api.request(`/api/departements/names?dept=${departement}`),
                    api.request(`/api/departements/crime?dept=${departement}`)
                ]);

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
                    main: MetricsConfig.formatMetricValue(item.insecurite_score, "insecurite_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.insecurite_score, "insecurite_score"),
                },
                {
                    title: MetricsConfig.getMetricLabel("violences_physiques_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("violences_physiques_p1k", crimeData),
                            "violences_physiques_p1k"
                        ) + crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("violences_physiques_p1k", deptCrimeData),
                            "violences_physiques_p1k"
                        ) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("violences_sexuelles_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(crimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") +
                        crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(deptCrimeData.violences_sexuelles_p1k, "violences_sexuelles_p1k") +
                        deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("vols_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("vols_p1k", crimeData),
                            "vols_p1k"
                        ) + crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("vols_p1k", deptCrimeData),
                            "vols_p1k"
                        ) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("destructions_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(
                            crimeData.destructions_et_degradations_volontaires_p1k,
                            "destructions_p1k"
                        ) + crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(
                            deptCrimeData.destructions_et_degradations_volontaires_p1k,
                            "destructions_p1k"
                        ) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("stupefiants_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("stupefiants_p1k", crimeData),
                            "stupefiants_p1k"
                        ) + crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(
                            MetricsConfig.calculateMetric("stupefiants_p1k", deptCrimeData),
                            "stupefiants_p1k"
                        ) + deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("escroqueries_p1k"),
                    main:
                        MetricsConfig.formatMetricValue(crimeData.escroqueries_p1k, "escroqueries_p1k") + crimeYearLabel,
                    compare:
                        MetricsConfig.formatMetricValue(deptCrimeData.escroqueries_p1k, "escroqueries_p1k") +
                        deptCrimeYearLabel,
                    subRow: true,
                    link: `/crime_graph.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("immigration_score"),
                    main: MetricsConfig.formatMetricValue(item.immigration_score, "immigration_score"),
                    compare: MetricsConfig.formatMetricValue(deptData.immigration_score, "immigration_score"),
                },
            ];

            // Conditionally add prenom-related sub-rows only if their values are not NaN
            if (!isNaN(extraEuropeenPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("extra_europeen_pct"),
                    main: MetricsConfig.formatMetricValue(extraEuropeenPct, "extra_europeen_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(deptExtraEuropeenPct, "extra_europeen_pct") + deptYearLabel,
                    subRow: true,
                    link: `/names_graph.html?type=commune&code=${cog}&dept=${departement}`,
                });
            }
            rows.push({
                title: MetricsConfig.getMetricLabel("islamisation_score"),
                main: MetricsConfig.formatMetricValue(item.islamisation_score, "islamisation_score"),
                compare: MetricsConfig.formatMetricValue(deptData.islamisation_score, "islamisation_score"),
            });
            if (!isNaN(musulmanPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("musulman_pct"),
                    main: MetricsConfig.formatMetricValue(musulmanPct, "musulman_pct") + yearLabel,
                    compare: MetricsConfig.formatMetricValue(deptMusulmanPct, "musulman_pct") + deptYearLabel,
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
            if (!isNaN(traditionnelPct)) {
                rows.push({
                    title: MetricsConfig.getMetricLabel("prenom_francais_pct"),
                    main: MetricsConfig.formatMetricValue(
                        MetricsConfig.calculateMetric("prenom_francais_total", namesData),
                        "prenom_francais_pct"
                    ) + yearLabel,
                    compare: MetricsConfig.formatMetricValue(
                        MetricsConfig.calculateMetric("prenom_francais_total", deptNamesData),
                        "prenom_francais_pct"
                    ) + deptYearLabel,
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
                    main:
                        item.total_qpv !== null && item.total_qpv !== undefined
                            ? MetricsConfig.formatMetricValue(item.total_qpv, "total_qpv")
                            : "0",
                    compare:
                        deptData.total_qpv !== null &&
                        deptData.total_qpv !== undefined
                            ? MetricsConfig.formatMetricValue(deptData.total_qpv, "total_qpv")
                            : "0",
                    subRow: true,
                    link: `/qpv.html?type=commune&code=${cog}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                },
                {
                    title: MetricsConfig.getMetricLabel("pop_in_qpv_pct"),
                    main:
                        item.pop_in_qpv_pct !== null &&
                        item.pop_in_qpv_pct !== undefined
                            ? MetricsConfig.formatMetricValue(item.pop_in_qpv_pct, "pop_in_qpv_pct")
                            : "0.0%",
                    compare:
                        deptData.pop_in_qpv_pct !== null &&
                        deptData.pop_in_qpv_pct !== undefined
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
