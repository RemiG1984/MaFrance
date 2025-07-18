const ScoreTableHandler = (function () {
    return function (resultsDiv, departmentNames) {
        async function showCountryDetails() {
            try {
                const [response, namesResponse, crimeResponse] =
                    await Promise.all([
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
                    const extraEuropeenPct = Math.round(
                        namesData.musulman_pct +
                            namesData.africain_pct +
                            namesData.asiatique_pct,
                    );
                    const musulmanPct = Math.round(namesData.musulman_pct);
                    const traditionnelPct = Math.round(
                        namesData.traditionnel_pct,
                    );
                    const modernePct = Math.round(namesData.moderne_pct);
                    const yearLabel = namesData.annais
                        ? ` (${namesData.annais})`
                        : "";
                    const crimeYearLabel = crimeData.annee
                        ? ` (${crimeData.annee})`
                        : "";
                    renderScoreTable(data.country, [
                        {
                            title: "Population",
                            main: data.population.toLocaleString("fr-FR"),
                        },
                        {
                            title: "Score Insécurité",
                            main: data.insecurite_score.toLocaleString("fr-FR"),
                        },
                        {
                            title: "Homicides et tentatives (pour 100k hab.)",
                            main:
                                (
                                    crimeData.homicides_p100k +
                                    crimeData.tentatives_homicides_p100k
                                ).toFixed(2) + crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Violences physiques (pour mille hab.)",
                            main:
                                (
                                    crimeData.coups_et_blessures_volontaires_p1k +
                                    crimeData.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                    crimeData.autres_coups_et_blessures_volontaires_p1k +
                                    crimeData.vols_avec_armes_p1k +
                                    crimeData.vols_violents_sans_arme_p1k
                                ).toFixed(1) + crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Violences sexuelles (pour mille hab.)",
                            main:
                                crimeData.violences_sexuelles_p1k.toFixed(1) +
                                crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Vols (pour mille hab.)",
                            main:
                                (
                                    crimeData.vols_avec_armes_p1k +
                                    crimeData.vols_violents_sans_arme_p1k +
                                    crimeData.vols_sans_violence_contre_des_personnes_p1k +
                                    crimeData.cambriolages_de_logement_p1k +
                                    crimeData.vols_de_vehicules_p1k +
                                    crimeData.vols_dans_les_vehicules_p1k +
                                    crimeData.vols_d_accessoires_sur_vehicules_p1k
                                ).toFixed(1) + crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Destruction et dégradations (pour mille hab.)",
                            main:
                                crimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                    1,
                                ) + crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Trafic et usage de stupéfiants (pour mille hab.)",
                            main:
                                (
                                    crimeData.usage_de_stupefiants_p1k +
                                    crimeData.usage_de_stupefiants_afd_p1k +
                                    crimeData.trafic_de_stupefiants_p1k
                                ).toFixed(1) + crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Escroqueries (pour mille hab.)",
                            main:
                                crimeData.escroqueries_p1k.toFixed(1) +
                                crimeYearLabel,
                            subRow: true,
                            link: `/crime_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Score Immigration",
                            main: data.immigration_score.toLocaleString(
                                "fr-FR",
                            ),
                        },
                        {
                            title: "Prénoms de naissance extra-européen",
                            main: `${extraEuropeenPct}%${yearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Score Islamisation",
                            main: data.islamisation_score.toLocaleString(
                                "fr-FR",
                            ),
                        },
                        {
                            title: "Prénoms de naissance musulmans",
                            main: `${musulmanPct}%${yearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Nombre de Mosquées",
                            main: data.number_of_mosques,
                            subRow: true,
                        },
                        {
                            title: "Nombre de Mosquées (pour 100k hab.)",
                            main: data.mosque_p100k.toFixed(1),
                            subRow: true,
                        },
                        {
                            title: "Score Défrancisation",
                            main: data.defrancisation_score.toLocaleString(
                                "fr-FR",
                            ),
                        },
                        {
                            title: "Prénoms de naissance français",
                            main: `${traditionnelPct + modernePct}%${yearLabel}`,
                            subRow: true,
                            link: `/names_graph.html?type=country&code=France`,
                        },
                        {
                            title: "Score Wokisme",
                            main: data.wokisme_score.toLocaleString("fr-FR"),
                        },
                        {
                            title: "Quartiers Prioritaires (QPV)",
                            main: data.total_qpv,
                            subRow: true,
                        },
                        {
                            title: "% de population dans les QPV",
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
                    const extraEuropeenPct = Math.round(
                        namesData.musulman_pct +
                            namesData.africain_pct +
                            namesData.asiatique_pct,
                    );
                    const countryExtraEuropeenPct = Math.round(
                        countryNamesData.musulman_pct +
                            countryNamesData.africain_pct +
                            countryNamesData.asiatique_pct,
                    );
                    const musulmanPct = Math.round(namesData.musulman_pct);
                    const countryMusulmanPct = Math.round(
                        countryNamesData.musulman_pct,
                    );
                    const traditionnelPct = Math.round(
                        namesData.traditionnel_pct,
                    );
                    const countryTraditionnelPct = Math.round(
                        countryNamesData.traditionnel_pct,
                    );
                    const modernePct = Math.round(namesData.moderne_pct);
                    const countryModernePct = Math.round(
                        countryNamesData.moderne_pct,
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
                                main: data.population.toLocaleString("fr-FR"),
                                compare:
                                    countryData.population.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Score Insécurité",
                                main: data.insecurite_score.toLocaleString(
                                    "fr-FR",
                                ),
                                compare:
                                    countryData.insecurite_score.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Homicides et tentatives (pour 100k hab.)",
                                main:
                                    (
                                        crimeData.homicides_p100k +
                                        crimeData.tentatives_homicides_p100k
                                    ).toFixed(2) + crimeYearLabel,
                                compare:
                                    (
                                        countryCrimeData.homicides_p100k +
                                        countryCrimeData.tentatives_homicides_p100k
                                    ).toFixed(2) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Violences physiques (pour mille hab.)",
                                main:
                                    (
                                        crimeData.coups_et_blessures_volontaires_p1k +
                                        crimeData.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                        crimeData.autres_coups_et_blessures_volontaires_p1k +
                                        crimeData.vols_avec_armes_p1k +
                                        crimeData.vols_violents_sans_arme_p1k
                                    ).toFixed(1) + crimeYearLabel,
                                compare:
                                    (
                                        countryCrimeData.coups_et_blessures_volontaires_p1k +
                                        countryCrimeData.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                        countryCrimeData.autres_coups_et_blessures_volontaires_p1k +
                                        countryCrimeData.vols_avec_armes_p1k +
                                        countryCrimeData.vols_violents_sans_arme_p1k
                                    ).toFixed(1) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Violences sexuelles (pour mille hab.)",
                                main:
                                    crimeData.violences_sexuelles_p1k.toFixed(
                                        1,
                                    ) + crimeYearLabel,
                                compare:
                                    countryCrimeData.violences_sexuelles_p1k.toFixed(
                                        1,
                                    ) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Vols (pour mille hab.)",
                                main:
                                    (
                                        crimeData.vols_avec_armes_p1k +
                                        crimeData.vols_violents_sans_arme_p1k +
                                        crimeData.vols_sans_violence_contre_des_personnes_p1k +
                                        crimeData.cambriolages_de_logement_p1k +
                                        crimeData.vols_de_vehicules_p1k +
                                        crimeData.vols_dans_les_vehicules_p1k +
                                        crimeData.vols_d_accessoires_sur_vehicules_p1k
                                    ).toFixed(1) + crimeYearLabel,
                                compare:
                                    (
                                        countryCrimeData.vols_avec_armes_p1k +
                                        countryCrimeData.vols_violents_sans_arme_p1k +
                                        countryCrimeData.vols_sans_violence_contre_des_personnes_p1k +
                                        countryCrimeData.cambriolages_de_logement_p1k +
                                        countryCrimeData.vols_de_vehicules_p1k +
                                        countryCrimeData.vols_dans_les_vehicules_p1k +
                                        countryCrimeData.vols_d_accessoires_sur_vehicules_p1k
                                    ).toFixed(1) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Destruction et dégradations (pour mille hab.)",
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
                                title: "Trafic et usage de stupéfiants (pour mille hab.)",
                                main:
                                    (
                                        crimeData.usage_de_stupefiants_p1k +
                                        crimeData.usage_de_stupefiants_afd_p1k +
                                        crimeData.trafic_de_stupefiants_p1k
                                    ).toFixed(1) + crimeYearLabel,
                                compare:
                                    (
                                        countryCrimeData.usage_de_stupefiants_p1k +
                                        countryCrimeData.usage_de_stupefiants_afd_p1k +
                                        countryCrimeData.trafic_de_stupefiants_p1k
                                    ).toFixed(1) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Escroqueries (pour mille hab.)",
                                main:
                                    crimeData.escroqueries_p1k.toFixed(1) +
                                    crimeYearLabel,
                                compare:
                                    countryCrimeData.escroqueries_p1k.toFixed(
                                        1,
                                    ) + countryCrimeYearLabel,
                                subRow: true,
                                link: `/crime_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Score Immigration",
                                main: data.immigration_score.toLocaleString(
                                    "fr-FR",
                                ),
                                compare:
                                    countryData.immigration_score.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Prénoms de naissance extra-européen",
                                main: `${extraEuropeenPct}%${yearLabel}`,
                                compare: `${countryExtraEuropeenPct}%${countryYearLabel}`,
                                subRow: true,
                                link: `/names_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Score Islamisation",
                                main: data.islamisation_score.toLocaleString(
                                    "fr-FR",
                                ),
                                compare:
                                    countryData.islamisation_score.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Prénoms de naissance musulmans",
                                main: `${musulmanPct}%${yearLabel}`,
                                compare: `${countryMusulmanPct}%${countryYearLabel}`,
                                subRow: true,
                                link: `/names_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Nombre de Mosquées",
                                main: data.number_of_mosques,
                                compare: countryData.number_of_mosques,
                                subRow: true,
                            },
                            {
                                title: "Nombre de Mosquées (pour 100k hab.)",
                                main: data.mosque_p100k.toFixed(1),
                                compare: countryData.mosque_p100k.toFixed(1),
                                subRow: true,
                            },
                            {
                                title: "Score Défrancisation",
                                main: data.defrancisation_score.toLocaleString(
                                    "fr-FR",
                                ),
                                compare:
                                    countryData.defrancisation_score.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Prénoms de naissance français",
                                main: `${traditionnelPct + modernePct}%${yearLabel}`,
                                compare: `${countryTraditionnelPct + countryModernePct}%${countryYearLabel}`,
                                subRow: true,
                                link: `/names_graph.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "Score Wokisme",
                                main: data.wokisme_score.toLocaleString(
                                    "fr-FR",
                                ),
                                compare:
                                    countryData.wokisme_score.toLocaleString(
                                        "fr-FR",
                                    ),
                            },
                            {
                                title: "Quartiers Prioritaires (QPV)",
                                main: data.total_qpv,
                                compare: countryData.total_qpv,
                                subRow: true,
                                link: `/qpv.html?type=department&code=${deptCode}`,
                            },
                            {
                                title: "% de population dans les QPV",
                                main:
                                    data.pop_in_qpv_pct !== null &&
                                    data.pop_in_qpv_pct !== undefined
                                        ? data.pop_in_qpv_pct.toFixed(1) + "%"
                                        : "0.0%",
                                compare:
                                    countryData.pop_in_qpv_pct !== null &&
                                    countryData.pop_in_qpv_pct !== undefined
                                        ? countryData.pop_in_qpv_pct.toFixed(
                                              1,
                                          ) + "%"
                                        : "0.0%",
                                subRow: true,
                            },
                        ],
                        "France",
                    );
                }
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error(
                    "Erreur lors de la recherche département:",
                    error,
                );
            }
        }

        async function showCommuneDetails(departement, commune) {
            try {
                const [
                    communeResponse,
                    deptResponse,
                    deptNamesResponse,
                    deptCrimeResponse,
                ] = await Promise.all([
                    fetch(
                        `/api/search?dept=${departement}&q=${encodeURIComponent(commune)}`,
                    ),
                    fetch(`/api/departements/details?dept=${departement}`),
                    fetch(`/api/departements/names?dept=${departement}`),
                    fetch(`/api/departements/crime?dept=${departement}`),
                ]);
                if (!communeResponse.ok || !deptResponse.ok) {
                    throw new Error(
                        `Erreur lors de la récupération: commune ${communeResponse.statusText}, département ${deptResponse.statusText}`,
                    );
                }
                const data = await communeResponse.json();
                const deptData = await deptResponse.json();
                if (data.length === 0) {
                    resultsDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    return;
                }
                const item = data[0];
                if (!item.COG) {
                    throw new Error("Code COG manquant pour la commune");
                }
                const namesResponse = await fetch(
                    `/api/communes/names?dept=${departement}&cog=${encodeURIComponent(item.COG)}`,
                );
                const namesData = await namesResponse.json();
                const crimeResponse = await fetch(
                    `/api/communes/crime?dept=${departement}&cog=${encodeURIComponent(item.COG)}`,
                );
                const crimeData = await crimeResponse.json();
                const deptNamesData = await deptNamesResponse.json();
                const deptCrimeData = await deptCrimeResponse.json();
                console.log("Commune details:", data);
                const extraEuropeenPct = Math.round(
                    namesData.musulman_pct +
                        namesData.africain_pct +
                        namesData.asiatique_pct,
                );
                const deptExtraEuropeenPct = Math.round(
                    deptNamesData.musulman_pct +
                        deptNamesData.africain_pct +
                        deptNamesData.asiatique_pct,
                );
                const musulmanPct = Math.round(namesData.musulman_pct);
                const deptMusulmanPct = Math.round(deptNamesData.musulman_pct);
                const traditionnelPct = Math.round(namesData.traditionnel_pct);
                const deptTraditionnelPct = Math.round(
                    deptNamesData.traditionnel_pct,
                );
                const modernePct = Math.round(namesData.moderne_pct);
                const deptModernePct = Math.round(deptNamesData.moderne_pct);
                const yearLabel = namesData.annais
                    ? ` (${namesData.annais})`
                    : "";
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
                        main: item.population.toLocaleString("fr-FR"),
                        compare: deptData.population.toLocaleString("fr-FR"),
                    },
                    {
                        title: "Score Insécurité",
                        main: item.insecurite_score.toLocaleString("fr-FR"),
                        compare:
                            deptData.insecurite_score.toLocaleString("fr-FR"),
                    },
                    {
                        title: "Violences physiques (pour mille hab.)",
                        main:
                            (
                                crimeData.coups_et_blessures_volontaires_p1k +
                                crimeData.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                crimeData.autres_coups_et_blessures_volontaires_p1k +
                                crimeData.vols_avec_armes_p1k +
                                crimeData.vols_violents_sans_arme_p1k
                            ).toFixed(1) + crimeYearLabel,
                        compare:
                            (
                                deptCrimeData.coups_et_blessures_volontaires_p1k +
                                deptCrimeData.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                deptCrimeData.autres_coups_et_blessures_volontaires_p1k +
                                deptCrimeData.vols_avec_armes_p1k +
                                deptCrimeData.vols_violents_sans_arme_p1k
                            ).toFixed(1) + deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Violences sexuelles (pour mille hab.)",
                        main:
                            crimeData.violences_sexuelles_p1k.toFixed(1) +
                            crimeYearLabel,
                        compare:
                            deptCrimeData.violences_sexuelles_p1k.toFixed(1) +
                            deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Vols (pour mille hab.)",
                        main:
                            (
                                crimeData.vols_avec_armes_p1k +
                                crimeData.vols_violents_sans_arme_p1k +
                                crimeData.vols_sans_violence_contre_des_personnes_p1k +
                                crimeData.cambriolages_de_logement_p1k +
                                crimeData.vols_de_vehicules_p1k +
                                crimeData.vols_dans_les_vehicules_p1k +
                                crimeData.vols_d_accessoires_sur_vehicules_p1k
                            ).toFixed(1) + crimeYearLabel,
                        compare:
                            (
                                deptCrimeData.vols_avec_armes_p1k +
                                deptCrimeData.vols_violents_sans_arme_p1k +
                                deptCrimeData.vols_sans_violence_contre_des_personnes_p1k +
                                deptCrimeData.cambriolages_de_logement_p1k +
                                deptCrimeData.vols_de_vehicules_p1k +
                                deptCrimeData.vols_dans_les_vehicules_p1k +
                                deptCrimeData.vols_d_accessoires_sur_vehicules_p1k
                            ).toFixed(1) + deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Destruction et dégradations (pour mille hab.)",
                        main:
                            crimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                1,
                            ) + crimeYearLabel,
                        compare:
                            deptCrimeData.destructions_et_degradations_volontaires_p1k.toFixed(
                                1,
                            ) + deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Trafic et usage de stupéfiants (pour mille hab.)",
                        main:
                            (
                                crimeData.usage_de_stupefiants_p1k +
                                crimeData.usage_de_stupefiants_afd_p1k +
                                crimeData.trafic_de_stupefiants_p1k
                            ).toFixed(1) + crimeYearLabel,
                        compare:
                            (
                                deptCrimeData.usage_de_stupefiants_p1k +
                                deptCrimeData.usage_de_stupefiants_afd_p1k +
                                deptCrimeData.trafic_de_stupefiants_p1k
                            ).toFixed(1) + deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Escroqueries (pour mille hab.)",
                        main:
                            crimeData.escroqueries_p1k.toFixed(1) +
                            crimeYearLabel,
                        compare:
                            deptCrimeData.escroqueries_p1k.toFixed(1) +
                            deptCrimeYearLabel,
                        subRow: true,
                        link: `/crime_graph.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "Score Immigration",
                        main: item.immigration_score.toLocaleString("fr-FR"),
                        compare:
                            deptData.immigration_score.toLocaleString("fr-FR"),
                    },
                ];

                // Conditionally add prenom-related sub-rows only if their values are not NaN
                if (!isNaN(extraEuropeenPct)) {
                    rows.push({
                        title: "Prénoms de naissance extra-européen",
                        main: `${extraEuropeenPct}%${yearLabel}`,
                        compare: `${deptExtraEuropeenPct}%${deptYearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=commune&code=${item.COG}&dept=${departement}`,
                    });
                }
                rows.push({
                    title: "Score Islamisation",
                    main: item.islamisation_score.toLocaleString("fr-FR"),
                    compare:
                        deptData.islamisation_score.toLocaleString("fr-FR"),
                });
                if (!isNaN(musulmanPct)) {
                    rows.push({
                        title: "Prénoms de naissance musulmans",
                        main: `${musulmanPct}%${yearLabel}`,
                        compare: `${deptMusulmanPct}%${deptYearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=commune&code=${item.COG}&dept=${departement}`,
                    });
                }
                rows.push(
                    {
                        title: "Nombre de Mosquées",
                        main: item.number_of_mosques,
                        compare: deptData.number_of_mosques,
                        subRow: true,
                    },
                    {
                        title: "Nombre de Mosquées (pour 100k hab.)",
                        main: item.mosque_p100k.toFixed(1),
                        compare: deptData.mosque_p100k.toFixed(1),
                        subRow: true,
                    },
                    {
                        title: "Score Défrancisation",
                        main: item.defrancisation_score.toLocaleString("fr-FR"),
                        compare:
                            deptData.defrancisation_score.toLocaleString(
                                "fr-FR",
                            ),
                    },
                );
                if (!isNaN(traditionnelPct)) {
                    rows.push({
                        title: "Prénoms de naissance français",
                        main: `${traditionnelPct + modernePct}%${yearLabel}`,
                        compare: `${deptTraditionnelPct + deptModernePct}%${deptYearLabel}`,
                        subRow: true,
                        link: `/names_graph.html?type=commune&code=${item.COG}&dept=${departement}`,
                    });
                }
                rows.push(
                    {
                        title: "Score Wokisme",
                        main: item.wokisme_score.toLocaleString("fr-FR"),
                        compare: deptData.wokisme_score.toLocaleString("fr-FR"),
                    },
                    {
                        title: "Quartiers Prioritaires (QPV)",
                        main:
                            item.total_qpv !== null &&
                            item.total_qpv !== undefined
                                ? item.total_qpv
                                : 0,
                        compare:
                            deptData.total_qpv !== null &&
                            deptData.total_qpv !== undefined
                                ? deptData.total_qpv
                                : 0,
                        subRow: true,
                        link: `/qpv.html?type=commune&code=${item.COG}&dept=${departement}&commune=${encodeURIComponent(commune)}`,
                    },
                    {
                        title: "% de population dans les QPV",
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
                    `${item.departement} - ${item.commune}`,
                    rows,
                    departmentNames[departement] || departement,
                );
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error("Erreur lors de la recherche:", error);
            }
        }

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
    };
})();
