const QpvHandler = (function() {
    const departmentNames = {
        "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
        "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube",
        "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal",
        "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
        "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne",
        "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère",
        "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault",
        "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura",
        "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique",
        "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire",
        "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle",
        "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
        "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
        "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
        "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
        "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
        "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse",
        "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne",
        "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis",
        "94": "Val-de-Marne", "95": "Val-d'Oise", "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
        "974": "La Réunion", "976": "Mayotte"
    };

    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            type: urlParams.get('type'),
            code: urlParams.get('code'),
            dept: urlParams.get('dept'),
            commune: urlParams.get('commune')
        };
    }

    function formatNumber(value) {
        if (value === null || value === undefined || value === '' || value === 0 || (typeof value === 'number' && isNaN(value))) return 'N/A';
        if (typeof value === 'number') {
            return value.toLocaleString('fr-FR');
        }
        return value;
    }

    function formatPercentage(value) {
        if (value === null || value === undefined || value === '' || value === 0 || (typeof value === 'number' && isNaN(value))) return 'N/A';
        if (typeof value === 'number') {
            return value.toFixed(1) + '%';
        }
        return value;
    }

    async function loadQpvData() {
        const params = getUrlParams();
        const resultsDiv = document.getElementById('results');
        const titleDiv = document.getElementById('pageTitle');

        try {
            let apiUrl;
            let pageTitle;

            console.log('QPV Handler - Params:', params);

            if (params.type === 'department') {
                apiUrl = `/api/qpv/departement/${params.code}`;
                pageTitle = `QPV pour ${departmentNames[params.code] || params.code} (${params.code})`;
            } else if (params.type === 'commune') {
                apiUrl = `/api/qpv/commune/${params.code}`;
                pageTitle = `QPV pour ${params.commune} (${params.dept})`;
            } else {
                throw new Error('Type non supporté: ' + params.type);
            }

            console.log('QPV Handler - API URL:', apiUrl);
            titleDiv.textContent = pageTitle;

            const response = await fetch(apiUrl);
            console.log('QPV Handler - Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('QPV Handler - Error response:', errorText);
                throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
            }

            const qpvData = await response.json();
            console.log('QPV data loaded:', qpvData);

            if (!qpvData || qpvData.length === 0) {
                resultsDiv.innerHTML = '<p>Aucun QPV trouvé pour cette zone.</p>';
                return;
            }

            renderQpvTable(qpvData);

        } catch (error) {
            console.error('Error loading QPV data:', error);
            resultsDiv.innerHTML = `<p>Erreur lors du chargement des données QPV: ${error.message}</p>`;
        }
    }

    function renderQpvTable(qpvData) {
        const resultsDiv = document.getElementById('results');

        const tableHtml = `
            <div class="data-box">
                <div class="table-container">
                    <table class="score-table">
                        <thead>
                            <tr class="score-header">
                                <th>Nom du QPV</th>
                                <th>Population</th>
                                <th>Indice Jeunesse</th>
                                <th>Logements sociaux</th>
                                <th>Taux logements sociaux</th>
                                <th>Taux d'emploi</th>
                                <th>Taux de pauvreté</th>
                                <th>Personnes CAF</th>
                                <th>Allocataires CAF</th>
                                <th>RSA socle</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${qpvData.map(qpv => `
                                <tr class="score-row">
                                    <td class="row-title">
                                        <a href="https://sig.ville.gouv.fr/territoire/${qpv.codeQPV}" target="_blank">
                                            ${qpv.lib_qp || qpv.codeQPV}
                                        </a>
                                    </td>
                                    <td class="score-main">${formatNumber(qpv.popMuniQPV)}</td>
                                    <td class="score-main">${formatNumber(qpv.indiceJeunesse)}</td>
                                    <td class="score-main">${formatNumber(qpv.nombre_logements_sociaux)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_logements_sociaux)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_d_emploi)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_pauvrete_60)}</td>
                                    <td class="score-main">${formatNumber(qpv.personnes_couvertes_CAF)}</td>
                                    <td class="score-main">${formatNumber(qpv.allocataires_CAF)}</td>
                                    <td class="score-main">${formatNumber(qpv.RSA_socle)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        resultsDiv.innerHTML = tableHtml;
    }

    return {
        init: function() {
            document.addEventListener('DOMContentLoaded', loadQpvData);
        }
    };
})();

// Initialize when the script loads
QpvHandler.init();