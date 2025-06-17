const RankingsHandler = (function () {
    return function (departementSelect, metricSelect, resultsDiv, departmentNames) {

        async function loadDepartements() {
            try {
                const response = await fetch('/departements');
                if (!response.ok) {
                    throw new Error(`Erreur lors de la récupération des départements: ${response.statusText}`);
                }
                const data = await response.json();
                console.log('Departments fetched for rankings:', data);

                departementSelect.innerHTML = '<option value="">-- Tous les départements --</option>';
                data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.departement;
                    option.textContent = `${dept.departement} - ${departmentNames[dept.departement] || dept.departement}`;
                    departementSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Erreur lors du chargement des départements:', error);
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            }
        }

        async function updateRankings() {
            const metric = metricSelect.value;
            const departement = departementSelect.value;

            if (!metric) {
                resultsDiv.innerHTML = '<p>Veuillez sélectionner une métrique.</p>';
                return;
            }

            try {
                let endpoint = '';
                let params = new URLSearchParams();

                if (departement) {
                    params.append('dept', departement);
                }
                params.append('metric', metric);

                if (metric.includes('commune')) {
                    endpoint = `/rankings/communes?${params.toString()}`;
                } else {
                    endpoint = `/rankings/departements?${params.toString()}`;
                }

                const response = await fetch(endpoint);
                if (!response.ok) {
                    throw new Error(`Erreur lors de la récupération du classement: ${response.statusText}`);
                }

                const data = await response.json();
                renderRankings(data, metric);
            } catch (error) {
                console.error('Erreur lors du chargement du classement:', error);
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            }
        }

        function renderRankings(data, metric) {
            if (!data || data.length === 0) {
                resultsDiv.innerHTML = '<p>Aucune donnée trouvée.</p>';
                return;
            }

            let html = `<h2>Classement - ${getMetricTitle(metric)}</h2>`;
            html += '<table class="rankings-table">';
            html += '<thead><tr><th>Rang</th><th>Nom</th><th>Valeur</th></tr></thead>';
            html += '<tbody>';

            data.forEach((item, index) => {
                const rank = index + 1;
                const name = item.commune ? 
                    `${item.commune} (${item.departement})` : 
                    `${departmentNames[item.departement] || item.departement} (${item.departement})`;
                const value = formatValue(item[metric], metric);

                html += `<tr>
                    <td>${rank}</td>
                    <td>${name}</td>
                    <td>${value}</td>
                </tr>`;
            });

            html += '</tbody></table>';
            resultsDiv.innerHTML = html;
        }

        function getMetricTitle(metric) {
            const titles = {
                'insecurite_score': 'Score Insécurité',
                'immigration_score': 'Score Immigration',
                'islamisation_score': 'Score Islamisation',
                'defrancisation_score': 'Score Défrancisation',
                'wokisme_score': 'Score Wokisme',
                'mosque_p100k': 'Mosquées pour 100k habitants'
            };
            return titles[metric] || metric;
        }

        function formatValue(value, metric) {
            if (value === null || value === undefined) return 'N/A';
            if (metric.includes('_p100k') || metric.includes('_p1k')) {
                return parseFloat(value).toFixed(2);
            }
            return value.toString();
        }

        return {
            loadDepartements,
            updateRankings
        };
    };
})();

(function () {
    // DOM elements
    const departementSelect = document.getElementById('departementSelect');
    const metricSelect = document.getElementById('metricSelect');
    const resultsDiv = document.getElementById('results');

    // Department names mapping
    const departmentNames = {
        "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes", "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes",
        "09": "Ariège", "10": "Aube", "11": "Aude", "12": "Aveyron",
        "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente",
        "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
        "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse",
        "24": "Dordogne", "25": "Doubs", "26": "Drôme", "27": "Eure",
        "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard", "31": "Haute-Garonne",
        "32": "Gers", "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine",
        "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura",
        "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire",
        "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne",
        "48": "Lozère", "49": "Maine-et-Loire", "50": "Manche", "51": "Marne",
        "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle", "55": "Meuse",
        "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
        "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme",
        "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales",
        "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône", "70": "Haute-Saône",
        "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
        "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines",
        "79": "Deux-Sèvres", "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne",
        "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne",
        "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort",
        "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis",
        "94": "Val-de-Marne", "95": "Val-d'Oise", "971": "Guadeloupe",
        "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte"
    };

    // Validate DOM elements
    if (!departementSelect || !metricSelect || !resultsDiv) {
        console.error('One or more DOM elements are missing');
        return;
    }

    // Initialize handler
    const rankingsHandler = RankingsHandler(departementSelect, metricSelect, resultsDiv, departmentNames);

    // Event listeners
    metricSelect.addEventListener('change', rankingsHandler.updateRankings);
    departementSelect.addEventListener('change', rankingsHandler.updateRankings);

    // Initialize
    rankingsHandler.loadDepartements();
})();