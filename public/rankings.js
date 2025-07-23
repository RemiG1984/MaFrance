import { DepartmentNames } from './departmentNames.js';
import { formatNumber, formatPercentage, formatMetricValue } from './utils.js';
import ErrorHandler from './errorHandler.js';

/**
 * Rankings page handler for displaying department and commune rankings
 */
document.addEventListener('DOMContentLoaded', function() {
    const errorHandler = ErrorHandler();
    const departmentNames = DepartmentNames;

    // DOM elements
    const levelSelect = document.getElementById('levelSelect');
    const metricSelect = document.getElementById('metricSelect');
    const directionSelect = document.getElementById('directionSelect');
    const populationSelect = document.getElementById('populationSelect');
    const rankingsTable = document.getElementById('rankingsTable');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // Check required elements
    if (!levelSelect || !metricSelect || !directionSelect || !rankingsTable) {
        console.error('Required DOM elements not found');
        return;
    }

    // Current parameters
    let currentParams = {
        level: 'departements',
        metric: 'total_score',
        direction: 'DESC',
        populationRange: '',
        limit: 50,
        offset: 0
    };

    /**
     * Shows loading state
     */
    function showLoading() {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';
        rankingsTable.innerHTML = '';
    }

    /**
     * Hides loading state
     */
    function hideLoading() {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    /**
     * Shows error message
     */
    function showError(message) {
        hideLoading();
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else {
            rankingsTable.innerHTML = `<p class="error">Erreur: ${message}</p>`;
        }
    }

    /**
     * Loads and displays rankings
     */
    async function loadRankings() {
        showLoading();

        try {
            const params = new URLSearchParams({
                sort: currentParams.metric,
                direction: currentParams.direction,
                limit: currentParams.limit.toString(),
                offset: currentParams.offset.toString()
            });

            if (currentParams.populationRange) {
                params.append('population_range', currentParams.populationRange);
            }

            const url = `/api/rankings/${currentParams.level}?${params.toString()}`;
            console.log('Fetching rankings from:', url);

            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Rankings data:', result);

            hideLoading();
            renderRankingsTable(result.data || []);

        } catch (error) {
            console.error('Error loading rankings:', error);
            showError(error.message);
            errorHandler.handleError(error, 'Failed to load rankings');
        }
    }

    /**
     * Renders the rankings table
     */
    function renderRankingsTable(data) {
        if (!data || data.length === 0) {
            rankingsTable.innerHTML = '<p>Aucune donnée disponible.</p>';
            return;
        }

        const isCommune = currentParams.level === 'communes';
        const metric = currentParams.metric;

        // Table header
        const headers = isCommune 
            ? ['Rang', 'Commune', 'Département', 'Population', 'Valeur']
            : ['Rang', 'Département', 'Population', 'Valeur'];

        // Build table HTML
        let tableHTML = `
            <table class="rankings-table">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach((item, index) => {
            const rank = currentParams.offset + index + 1;
            const population = formatNumber(item.population || 0);
            const value = formatMetricValue(item[metric], metric);

            if (isCommune) {
                const deptName = departmentNames[item.departement] || item.departement;
                tableHTML += `
                    <tr>
                        <td>${rank}</td>
                        <td><a href="/?dept=${item.departement}&commune=${encodeURIComponent(item.commune)}">${item.commune}</a></td>
                        <td><a href="/?dept=${item.departement}">${item.departement} - ${deptName}</a></td>
                        <td>${population}</td>
                        <td>${value}</td>
                    </tr>
                `;
            } else {
                const deptName = departmentNames[item.departement] || item.departement;
                tableHTML += `
                    <tr>
                        <td>${rank}</td>
                        <td><a href="/?dept=${item.departement}">${item.departement} - ${deptName}</a></td>
                        <td>${population}</td>
                        <td>${value}</td>
                    </tr>
                `;
            }
        });

        tableHTML += '</tbody></table>';
        rankingsTable.innerHTML = tableHTML;
    }

    /**
     * Updates metric options based on level
     */
    function updateMetricOptions() {
        const isCommune = currentParams.level === 'communes';

        // Define metrics for each level
        const departmentMetrics = [
            { value: 'total_score', label: 'Score Total' },
            { value: 'insecurite_score', label: 'Score Insécurité' },
            { value: 'immigration_score', label: 'Score Immigration' },
            { value: 'islamisation_score', label: 'Score Islamisation' },
            { value: 'defrancisation_score', label: 'Score Défrancisation' },
            { value: 'wokisme_score', label: 'Score Wokisme' },
            { value: 'population', label: 'Population' },
            { value: 'musulman_pct', label: 'Prénoms musulmans (%)' },
            { value: 'extra_europeen_pct', label: 'Prénoms extra-européens (%)' },
            { value: 'prenom_francais_pct', label: 'Prénoms français (%)' },
            { value: 'homicides_p100k', label: 'Homicides (pour 100k hab.)' },
            { value: 'violences_physiques_p1k', label: 'Violences physiques (pour 1k hab.)' },
            { value: 'violences_sexuelles_p1k', label: 'Violences sexuelles (pour 1k hab.)' },
            { value: 'vols_p1k', label: 'Vols (pour 1k hab.)' },
            { value: 'destructions_p1k', label: 'Destructions (pour 1k hab.)' },
            { value: 'stupefiants_p1k', label: 'Stupéfiants (pour 1k hab.)' },
            { value: 'escroqueries_p1k', label: 'Escroqueries (pour 1k hab.)' },
            { value: 'number_of_mosques', label: 'Nombre de mosquées' },
            { value: 'mosque_p100k', label: 'Mosquées (pour 100k hab.)' },
            { value: 'total_qpv', label: 'Quartiers prioritaires' },
            { value: 'pop_in_qpv_pct', label: 'Population en QPV (%)' }
        ];

        const communeMetrics = [
            { value: 'total_score', label: 'Score Total' },
            { value: 'insecurite_score', label: 'Score Insécurité' },
            { value: 'immigration_score', label: 'Score Immigration' },
            { value: 'islamisation_score', label: 'Score Islamisation' },
            { value: 'defrancisation_score', label: 'Score Défrancisation' },
            { value: 'wokisme_score', label: 'Score Wokisme' },
            { value: 'population', label: 'Population' },
            { value: 'number_of_mosques', label: 'Nombre de mosquées' },
            { value: 'mosque_p100k', label: 'Mosquées (pour 100k hab.)' },
            { value: 'total_qpv', label: 'Quartiers prioritaires' },
            { value: 'pop_in_qpv_pct', label: 'Population en QPV (%)' }
        ];

        const metrics = isCommune ? communeMetrics : departmentMetrics;

        metricSelect.innerHTML = metrics.map(m => 
            `<option value="${m.value}" ${m.value === currentParams.metric ? 'selected' : ''}>${m.label}</option>`
        ).join('');

        // Show/hide population filter for communes
        if (populationSelect) {
            populationSelect.style.display = isCommune ? 'inline-block' : 'none';
        }
    }

    // Event listeners
    levelSelect.addEventListener('change', function() {
        currentParams.level = this.value;
        currentParams.offset = 0; // Reset pagination
        updateMetricOptions();
        loadRankings();
    });

    metricSelect.addEventListener('change', function() {
        currentParams.metric = this.value;
        currentParams.offset = 0; // Reset pagination
        loadRankings();
    });

    directionSelect.addEventListener('change', function() {
        currentParams.direction = this.value;
        currentParams.offset = 0; // Reset pagination
        loadRankings();
    });

    if (populationSelect) {
        populationSelect.addEventListener('change', function() {
            currentParams.populationRange = this.value;
            currentParams.offset = 0; // Reset pagination
            loadRankings();
        });
    }

    // Initialize
    updateMetricOptions();
    loadRankings();
});