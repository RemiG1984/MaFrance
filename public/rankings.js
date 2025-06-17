const RankingsHandler = (function () {
    // Department code to name mapping (same as in main.js)
    const departmentNames = {
        '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes',
        '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes', '09': 'Ariège', '10': 'Aube',
        '11': 'Aude', '12': 'Aveyron', '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal',
        '16': 'Charente', '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '2A': 'Corse-du-Sud',
        '2B': 'Haute-Corse', '21': 'Côte-d\'Or', '22': 'Côtes-d\'Armor', '23': 'Creuse', '24': 'Dordogne',
        '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
        '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde', '34': 'Hérault',
        '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura',
        '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique',
        '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
        '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle',
        '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord',
        '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
        '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône',
        '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
        '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres',
        '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
        '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne',
        '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
        '94': 'Val-de-Marne', '95': 'Val-d\'Oise', '971': 'Guadeloupe', '972': 'Martinique',
        '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte'
    };

    return function (departementSelect, metricSelect, resultsDiv) {
        async function loadDepartements() {
            try {
                const response = await fetch('/api/departements');
                if (!response.ok) throw new Error('Erreur lors du chargement des départements');
                const departements = await response.json();
                departementSelect.innerHTML = '<option value="">-- Tous les départements --</option>';
                departements.forEach(dept => {
                    let deptCode = dept.departement.trim().toUpperCase();
                    if (/^\d+$/.test(deptCode)) deptCode = deptCode.padStart(2, '0');
                    if (!/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(deptCode)) return;
                    const option = document.createElement('option');
                    option.value = deptCode;
                    option.textContent = `${deptCode} - ${departmentNames[deptCode] || deptCode}`;
                    departementSelect.appendChild(option);
                });
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error('Erreur chargement départements:', error);
            }
        }

        async function fetchDepartmentRankings(metric) {
            try {
                // Fetch top 10 (DESC)
                const topResponse = await fetch(`/api/departements/details_all?limit=10&sort=${metric}&direction=DESC`);
                if (!topResponse.ok) throw new Error('Erreur lors de la récupération des données départementales (top)');
                const topData = await topResponse.json();

                // Fetch bottom 10 (ASC)
                const bottomResponse = await fetch(`/api/departements/details_all?limit=10&sort=${metric}&direction=ASC`);
                if (!bottomResponse.ok) throw new Error('Erreur lors de la récupération des données départementales (bottom)');
                const bottomData = await bottomResponse.json();

                // Process data
                const totalDepartments = 101; // Total number of departments
                const rankings = [
                    ...topData.map((dept, index) => ({
                        deptCode: dept.departement,
                        name: departmentNames[dept.departement] || dept.departement,
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
                        musulman_pct: Math.round(dept.musulman_pct || 0),
                        number_of_mosques: dept.number_of_mosques,
                        mosque_p100k: dept.mosque_p100k,
                        defrancisation_score: dept.defrancisation_score,
                        prenom_francais_pct: dept.prenom_francais_pct || 0,
                        wokisme_score: dept.wokisme_score,
                        total_score: dept.total_score,
                        rank: index + 1 // Top ranks: 1–10
                    })),
                    ...bottomData.map((dept, index) => ({
                        deptCode: dept.departement,
                        name: departmentNames[dept.departement] || dept.departement,
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
                        musulman_pct: Math.round(dept.musulman_pct || 0),
                        number_of_mosques: dept.number_of_mosques,
                        mosque_p100k: dept.mosque_p100k,
                        defrancisation_score: dept.defrancisation_score,
                        prenom_francais_pct: dept.prenom_francais_pct || 0,
                        wokisme_score: dept.wokisme_score,
                        total_score: dept.total_score,
                        rank: totalDepartments - index // Bottom ranks: 92–101
                    }))
                ];
                return rankings;
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error('Erreur chargement classements départements:', error);
                return [];
            }
        }

        async function fetchCommuneRankings(deptCode, metric) {
            try {
                // Build URL
                const baseUrl = deptCode 
                    ? `/api/communes/details_all?dept=${deptCode}&limit=10&sort=${metric}` 
                    : `/api/communes/details_all?limit=10&sort=${metric}`;

                // Fetch top 10 (DESC)
                const topResponse = await fetch(`${baseUrl}&direction=DESC`);
                if (!topResponse.ok) throw new Error('Erreur lors de la récupération des données des communes (top)');
                const topResult = await topResponse.json();
                const topData = topResult.data;
                const totalCommunes = topResult.total_count;

                // Fetch bottom 10 (ASC)
                const bottomResponse = await fetch(`${baseUrl}&direction=ASC`);
                if (!bottomResponse.ok) throw new Error('Erreur lors de la récupération des données des communes (bottom)');
                const bottomResult = await bottomResponse.json();
                const bottomData = bottomResult.data;

                // Debug logs
                console.log('totalCommunes:', totalCommunes);
                console.log('Raw bottomData:', bottomData.map(item => ({
                    commune: item.commune,
                    [metric]: item[metric] || 0
                })));

                // Process data
                const rankings = [
                    ...topData.map((commune, index) => ({
                        deptCode: commune.departement,
                        name: commune.commune,
                        insecurite_score: commune.insecurite_score,
                        violences_physiques_p1k: commune.violences_physiques_p1k || 0,
                        violences_sexuelles_p1k: commune.violences_sexuelles_p1k || 0,
                        vols_p1k: commune.vols_p1k || 0,
                        destructions_p1k: commune.destructions_p1k || 0,
                        stupefiants_p1k: commune.stupefiants_p1k || 0,
                        escroqueries_p1k: commune.escroqueries_p1k || 0,
                        immigration_score: commune.immigration_score,
                        extra_europeen_pct: commune.extra_europeen_pct || 0,
                        islamisation_score: commune.islamisation_score,
                        musulman_pct: Math.round(commune.musulman_pct || 0),
                        number_of_mosques: commune.number_of_mosques || 0,
                        mosque_p100k: commune.mosque_p100k || 0,
                        defrancisation_score: commune.defrancisation_score,
                        prenom_francais_pct: commune.prenom_francais_pct || 0,
                        wokisme_score: commune.wokisme_score,
                        total_score: commune.total_score,
                        rank: index + 1 // Top ranks: 1–10
                    })),
                    ...bottomData.map((commune, index) => ({
                        deptCode: commune.departement,
                        name: commune.commune,
                        insecurite_score: commune.insecurite_score,
                        violences_physiques_p1k: commune.violences_physiques_p1k || 0,
                        violences_sexuelles_p1k: commune.violences_sexuelles_p1k || 0,
                        vols_p1k: commune.vols_p1k || 0,
                        destructions_p1k: commune.destructions_p1k || 0,
                        stupefiants_p1k: commune.stupefiants_p1k || 0,
                        escroqueries_p1k: commune.escroqueries_p1k || 0,
                        immigration_score: commune.immigration_score,
                        extra_europeen_pct: commune.extra_europeen_pct || 0,
                        islamisation_score: commune.islamisation_score,
                        musulman_pct: Math.round(commune.musulman_pct || 0),
                        number_of_mosques: commune.number_of_mosques || 0,
                        mosque_p100k: commune.mosque_p100k || 0,
                        defrancisation_score: commune.defrancisation_score,
                        prenom_francais_pct: commune.prenom_francais_pct || 0,
                        wokisme_score: commune.wokisme_score,
                        total_score: commune.total_score,
                        rank: totalCommunes - index // Bottom ranks: e.g., 342 to 333
                    }))
                ];

                return rankings;
            } catch (error) {
                resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
                console.error('Erreur chargement classements communes:', error);
                return [];
            }
        }

        function renderRankings(type, rankings, metric) {
            const metricName = metricSelect.options[metricSelect.selectedIndex]?.text || metric;
            const top10 = rankings.slice(0, 10);
            const bottom10 = rankings.slice(-10).sort((a, b) => a.rank - b.rank);
            resultsDiv.innerHTML = `
                <div class="data-box">
                    <h2>Classement des ${type}s pour ${metricName}</h2>
                    <h3>Top 10</h3>
                    <table class="score-table">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>${type}</th>
                                <th>Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top10.map(item => `
                                <tr>
                                    <td>${item.rank}</td>
                                    <td>${type === 'Département' ? `${item.deptCode} - ${item.name}` : item.name}</td>
                                    <td>${formatMetricValue(item[metric], metric)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <h3>Bottom 10</h3>
                    <table class="score-table">
                        <thead>
                            <tr>
                                <th>Rang</th>
                                <th>${type}</th>
                                <th>Valeur</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bottom10.map(item => `
                                <tr>
                                    <td>${item.rank}</td>
                                    <td>${type === 'Département' ? `${item.deptCode} - ${item.name}` : item.name}</td>
                                    <td>${formatMetricValue(item[metric], metric)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        function formatMetricValue(value, metric) {
            if (value === undefined || value === null) return 'N/A';
            if (metric.includes('_pct')) return `${value}%`;
            if (metric.includes('_p100k') || metric.includes('_p1k')) return value.toFixed(1);
            if (metric.includes('_score')) return value.toLocaleString('fr-FR');
            return value.toString();
        }

        async function updateRankings() {
            const deptCode = departementSelect.value;
            const metric = metricSelect.value;

            if (!metric) {
                resultsDiv.innerHTML = '<p>Veuillez sélectionner une métrique.</p>';
                return;
            }

            if (!deptCode) {
                const rankings = await fetchDepartmentRankings(metric);
                renderRankings('Département', rankings, metric);
            } else {
                const rankings = await fetchCommuneRankings(deptCode, metric);
                renderRankings('Commune', rankings, metric);
            }
        }

        // Event listeners
        departementSelect.addEventListener('change', updateRankings);
        metricSelect.addEventListener('change', updateRankings);

        // Initialize
        loadDepartements();
        updateRankings();

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

    // Validate DOM elements
    if (!departementSelect || !metricSelect || !resultsDiv) {
        console.error('One or more DOM elements are missing');
        return;
    }

    // Initialize handler
    const rankingsHandler = RankingsHandler(departementSelect, metricSelect, resultsDiv);
})();