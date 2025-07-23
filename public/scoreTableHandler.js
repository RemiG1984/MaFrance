import { formatNumber, formatPercentage, formatMetricValue, normalizeDept } from './utils.js';

/**
 * Score table handler module for displaying statistical data in tabular format.
 * Manages the display of country, department, and commune details.
 * @param {HTMLElement} resultsDiv - Container for displaying results
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Score table handler interface
 */
function ScoreTableHandler(resultsDiv, departmentNames) {

    /**
     * Renders a data table with the provided header and rows.
     * @param {string} header - Table header text
     * @param {Array} rows - Array of row objects with title, main, and optional properties
     */
    function renderTable(header, rows) {
        console.log("Rendering table with header:", header, "rows:", rows);

        let html = `
        <div class="data-box">
            <table class="score-table">
                <thead>
                    <tr class="score-header">
                        <th class="row-title"></th>
                        <th class="score-main">${header}</th>
                        </tr>
                </thead>
                <tbody>`;

        rows.forEach(row => {
            const rowClass = row.subRow ? ' class="score-row sub-row"' : ' class="score-row"';
            const linkStart = row.link ? `<a href="${row.link}" target="_blank">` : '';
            const linkEnd = row.link ? '</a>' : '';

            html += `<tr${rowClass}>
                <td class="row-title">${linkStart}${row.title}${linkEnd}</td>
                <td class="score-main">${linkStart}${row.main}${linkEnd}</td>
            </tr>`;
        });

        html += `
                </tbody>
            </table>
        </div>
        `;
        resultsDiv.innerHTML = html;
    }

    /**
     * Displays country-level statistics and details.
     * @async
     */
    async function showCountryDetails() {
        try {
            const [detailsResponse, crimeResponse, namesResponse] = await Promise.all([
                fetch('/api/country/details'),
                fetch('/api/country/crime'),
                fetch('/api/country/names')
            ]);

            if (!detailsResponse.ok || !crimeResponse.ok || !namesResponse.ok) {
                throw new Error('Erreur lors de la récupération des données');
            }

            const details = await detailsResponse.json();
            const crime = await crimeResponse.json();
            const names = await namesResponse.json();

            console.log("Country details:", details);

            const rows = [
                { title: "Population", main: formatNumber(details.population) },
                { title: "Score Insécurité", main: details.insecurite_score?.toString() || 'N/A' },
                { title: "Homicides et tentatives (pour 100k hab.)", main: `${((crime.homicides_p100k || 0) + (crime.tentatives_homicides_p100k || 0)).toFixed(2)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Violences physiques (pour mille hab.)", main: `${((crime.coups_et_blessures_volontaires_p1k || 0) + (crime.coups_et_blessures_volontaires_intrafamiliaux_p1k || 0) + (crime.autres_coups_et_blessures_volontaires_p1k || 0) + (crime.vols_avec_armes_p1k || 0) + (crime.vols_violents_sans_arme_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Violences sexuelles (pour mille hab.)", main: `${(crime.violences_sexuelles_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Vols (pour mille hab.)", main: `${((crime.vols_avec_armes_p1k || 0) + (crime.vols_violents_sans_arme_p1k || 0) + (crime.vols_sans_violence_contre_des_personnes_p1k || 0) + (crime.cambriolages_de_logement_p1k || 0) + (crime.vols_de_vehicules_p1k || 0) + (crime.vols_dans_les_vehicules_p1k || 0) + (crime.vols_d_accessoires_sur_vehicules_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Destruction et dégradations (pour mille hab.)", main: `${(crime.destructions_et_degradations_volontaires_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Trafic et usage de stupéfiants (pour mille hab.)", main: `${((crime.usage_de_stupefiants_p1k || 0) + (crime.usage_de_stupefiants_afd_p1k || 0) + (crime.trafic_de_stupefiants_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Escroqueries (pour mille hab.)", main: `${(crime.escroqueries_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: "/crime_graph.html?type=country&code=France" },
                { title: "Score Immigration", main: details.immigration_score?.toString() || 'N/A' },
                { title: "Score Islamisation", main: details.islamisation_score?.toString() || 'N/A' },
                { title: "Nombre de mosquées", main: formatNumber(details.number_of_mosques) },
                { title: "Mosquées pour 100k hab.", main: (details.mosque_p100k || 0).toFixed(2) },
                { title: "Score Défrancisation", main: details.defrancisation_score?.toString() || 'N/A' },
                { title: "Prénoms extra-européens", main: formatPercentage(names.extra_europeen_pct), subRow: true, link: `/names_graph.html?type=country&code=France` },
                { title: "Prénoms français", main: formatPercentage(names.prenom_francais_pct), subRow: true, link: `/names_graph.html?type=country&code=France` },
                { title: "Score Wokisme", main: details.wokisme_score?.toString() || 'N/A' },
                { title: "Quartiers prioritaires", main: formatNumber(details.total_qpv) },
                { title: "Population en QPV", main: formatPercentage(details.pop_in_qpv_pct), subRow: true, link: "/qpv.html" }
            ];

            renderTable(details.country, rows);
        } catch (error) {
            console.error("Erreur lors de la récupération des détails du pays:", error);
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    /**
     * Displays department-level statistics and details.
     * @async
     * @param {string} departement - Department code
     */
    async function showDepartmentDetails(departement) {
        const normalizedDept = normalizeDept(departement);

        try {
            const [detailsResponse, crimeResponse, namesResponse] = await Promise.all([
                fetch(`/api/departements/details?dept=${normalizedDept}`),
                fetch(`/api/departements/crime?dept=${normalizedDept}`),
                fetch(`/api/departements/names?dept=${normalizedDept}`)
            ]);

            if (!detailsResponse.ok || !crimeResponse.ok || !namesResponse.ok) {
                throw new Error('Erreur lors de la récupération des données du département');
            }

            const details = await detailsResponse.json();
            const crime = await crimeResponse.json();
            const names = await namesResponse.json();

            const deptName = departmentNames[departement] || departement;
            const header = `${departement} - ${deptName}`;

            const rows = [
                { title: "Population", main: formatNumber(details.population) },
                { title: "Score Insécurité", main: details.insecurite_score?.toString() || 'N/A' },
                { title: "Homicides et tentatives (pour 100k hab.)", main: `${((crime.homicides_p100k || 0) + (crime.tentatives_homicides_p100k || 0)).toFixed(2)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Violences physiques (pour mille hab.)", main: `${((crime.coups_et_blessures_volontaires_p1k || 0) + (crime.coups_et_blessures_volontaires_intrafamiliaux_p1k || 0) + (crime.autres_coups_et_blessures_volontaires_p1k || 0) + (crime.vols_avec_armes_p1k || 0) + (crime.vols_violents_sans_arme_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Violences sexuelles (pour mille hab.)", main: `${(crime.violences_sexuelles_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Vols (pour mille hab.)", main: `${((crime.vols_avec_armes_p1k || 0) + (crime.vols_violents_sans_arme_p1k || 0) + (crime.vols_sans_violence_contre_des_personnes_p1k || 0) + (crime.cambriolages_de_logement_p1k || 0) + (crime.vols_de_vehicules_p1k || 0) + (crime.vols_dans_les_vehicules_p1k || 0) + (crime.vols_d_accessoires_sur_vehicules_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Destruction et dégradations (pour mille hab.)", main: `${(crime.destructions_et_degradations_volontaires_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Trafic et usage de stupéfiants (pour mille hab.)", main: `${((crime.usage_de_stupefiants_p1k || 0) + (crime.usage_de_stupefiants_afd_p1k || 0) + (crime.trafic_de_stupefiants_p1k || 0)).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Escroqueries (pour mille hab.)", main: `${(crime.escroqueries_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=departement&code=${departement}` },
                { title: "Score Immigration", main: details.immigration_score?.toString() || 'N/A' },
                { title: "Score Islamisation", main: details.islamisation_score?.toString() || 'N/A' },
                { title: "Nombre de mosquées", main: formatNumber(details.number_of_mosques) },
                { title: "Mosquées pour 100k hab.", main: (details.mosque_p100k || 0).toFixed(2) },
                { title: "Score Défrancisation", main: details.defrancisation_score?.toString() || 'N/A' },
                { title: "Prénoms extra-européens", main: formatPercentage(names.extra_europeen_pct), subRow: true, link: `/names_graph.html?type=departement&code=${departement}` },
                { title: "Prénoms français", main: formatPercentage(names.prenom_francais_pct), subRow: true, link: `/names_graph.html?type=departement&code=${departement}` },
                { title: "Score Wokisme", main: details.wokisme_score?.toString() || 'N/A' },
                { title: "Quartiers prioritaires", main: formatNumber(details.total_qpv) },
                { title: "Population en QPV", main: formatPercentage(details.pop_in_qpv_pct), subRow: true, link: `/qpv.html?dept=${departement}` }
            ];

            renderTable(header, rows);
        } catch (error) {
            console.error("Erreur lors de la récupération des détails du département:", error);
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    /**
     * Displays commune-level statistics and details.
     * @async
     * @param {string} cog - Commune COG code
     */
    async function showCommuneDetails(cog) {
        try {
            const [communeResponse, crimeResponse, namesResponse] = await Promise.all([
                fetch(`/api/communes/details?cog=${encodeURIComponent(cog)}`),
                fetch(`/api/communes/crime?dept=${encodeURIComponent(cog.substring(0, 2))}&cog=${encodeURIComponent(cog)}`),
                fetch(`/api/communes/names?dept=${encodeURIComponent(cog.substring(0, 2))}&cog=${encodeURIComponent(cog)}`)
            ]);

            if (!communeResponse.ok) {
                throw new Error('Erreur lors de la récupération des données de la commune');
            }

            const commune = await communeResponse.json();
            const crime = crimeResponse.ok ? await crimeResponse.json() : {};
            const names = namesResponse.ok ? await namesResponse.json() : {};

            const header = `${commune.commune} (${commune.departement})`;

            const rows = [
                { title: "Population", main: formatNumber(commune.population) },
                { title: "Score Insécurité", main: commune.insecurite_score?.toString() || 'N/A' }
            ];

            // Add crime data if available
            if (crime.annee) {
                rows.push(
                    { title: "Violences physiques (pour mille hab.)", main: `${(crime.coups_et_blessures_volontaires_p1k + crime.coups_et_blessures_volontaires_intrafamiliaux_p1k + crime.autres_coups_et_blessures_volontaires_p1k + crime.vols_avec_armes_p1k + crime.vols_violents_sans_arme_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` },
                    { title: "Violences sexuelles (pour mille hab.)", main: `${(crime.violences_sexuelles_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` },
                    { title: "Vols (pour mille hab.)", main: `${(crime.vols_avec_armes_p1k + crime.vols_violents_sans_arme_p1k + crime.vols_sans_violence_contre_des_personnes_p1k + crime.cambriolages_de_logement_p1k + crime.vols_de_vehicules_p1k + crime.vols_dans_les_vehicules_p1k + crime.vols_d_accessoires_sur_vehicules_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` },
                    { title: "Destruction et dégradations (pour mille hab.)", main: `${(crime.destructions_et_degradations_volontaires_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` },
                    { title: "Trafic et usage de stupéfiants (pour mille hab.)", main: `${(crime.usage_de_stupefiants_p1k + crime.usage_de_stupefiants_afd_p1k + crime.trafic_de_stupefiants_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` },
                    { title: "Escroqueries (pour mille hab.)", main: `${(crime.escroqueries_p1k || 0).toFixed(1)} (${crime.annee})`, subRow: true, link: `/crime_graph.html?type=commune&code=${cog}` }
                );
            }

            rows.push(
                { title: "Score Immigration", main: commune.immigration_score?.toString() || 'N/A' },
                { title: "Score Islamisation", main: commune.islamisation_score?.toString() || 'N/A' },
                { title: "Nombre de mosquées", main: formatNumber(commune.number_of_mosques) },
                { title: "Mosquées pour 100k hab.", main: (commune.mosque_p100k || 0).toFixed(2) },
                { title: "Score Défrancisation", main: commune.defrancisation_score?.toString() || 'N/A' }
            );

            // Add name data if available
            if (names.annais) {
                rows.push(
                    { title: "Prénoms extra-européens", main: formatPercentage(names.musulman_pct + names.africain_pct + names.asiatique_pct), subRow: true, link: `/names_graph.html?type=commune&code=${cog}` },
                    { title: "Prénoms français", main: formatPercentage(names.traditionnel_pct + names.moderne_pct), subRow: true, link: `/names_graph.html?type=commune&code=${cog}` }
                );
            }

            rows.push(
                { title: "Score Wokisme", main: commune.wokisme_score?.toString() || 'N/A' },
                { title: "Quartiers prioritaires", main: formatNumber(commune.total_qpv) },
                { title: "Population en QPV", main: formatPercentage(commune.pop_in_qpv_pct), subRow: true, link: `/qpv.html?cog=${cog}` }
            );

            renderTable(header, rows);
        } catch (error) {
            console.error("Erreur lors de la récupération des détails de la commune:", error);
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    return {
        showCountryDetails,
        showDepartmentDetails,
        showCommuneDetails,
        renderTable
    };
}

// Export for ES6 modules
export { ScoreTableHandler };