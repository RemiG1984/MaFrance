import { formatNumber, normalizeDept } from './utils.js';

/**
 * Location handler module for managing department, commune, and lieu selection.
 * Handles DOM interactions and API calls for location-based data.
 * @param {HTMLSelectElement} departementSelect - Department selection dropdown
 * @param {HTMLInputElement} communeInput - Commune search input
 * @param {HTMLElement} communeList - Commune suggestions container
 * @param {HTMLSelectElement} lieuxSelect - Location selection dropdown
 * @param {HTMLElement} resultsDiv - Results display container
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Location handler interface
 */
function LocationHandler(
    departementSelect,
    communeInput,
    communeList,
    lieuxSelect,
    resultsDiv,
    departmentNames,
) {
    /**
     * Loads and populates the department dropdown with options.
     * @async
     */
    async function loadDepartements() {
        try {
            const response = await fetch("/api/departements");
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la récupération des départements: ${response.statusText}`,
                );
            }
            const data = await response.json();
            console.log("Departments fetched:", data);

            departementSelect.innerHTML = '<option value="">Sélectionner un département</option>';
            data.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.departement;
                const deptName = departmentNames[item.departement] || item.departement;
                option.textContent = `${item.departement} - ${deptName}`;
                departementSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erreur lors du chargement des départements:", error);
            departementSelect.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    }

    /**
     * Loads communes for a specific department and handles search input.
     * @async
     * @param {string} departement - Department code
     * @param {string} query - Search query for commune
     */
    async function handleCommuneInput(departement, query) {
        if (!departement || query.length < 2) {
            communeList.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(
                `/api/search?dept=${departement}&q=${encodeURIComponent(query)}`,
            );
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la recherche de communes: ${response.statusText}`,
                );
            }
            const data = await response.json();

            communeList.innerHTML = "";
            if (data.length === 0) {
                communeList.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            data.forEach((item) => {
                const div = document.createElement("div");
                div.className = "commune-item";
                div.textContent = `${item.commune} (${formatNumber(item.population)} hab.)`;
                div.addEventListener("click", () => {
                    communeInput.value = item.commune;
                    communeList.innerHTML = "";
                    loadLieux(departement, item.COG);
                });
                communeList.appendChild(div);
            });
        } catch (error) {
            console.error("Erreur lors de la recherche de communes:", error);
            communeList.innerHTML = "<p>Erreur lors de la recherche.</p>";
        }
    }

    /**
     * Loads available locations (lieux) for a specific commune.
     * @async
     * @param {string} departement - Department code
     * @param {string} cog - Commune COG code
     */
    async function loadLieux(departement, cog) {
        try {
            const response = await fetch(`/api/lieux?dept=${departement}&cog=${cog}`);
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la récupération des lieux: ${response.statusText}`,
                );
            }
            const data = await response.json();

            lieuxSelect.innerHTML = '<option value="">Tous les lieux</option>';
            data.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.lieu;
                option.textContent = item.lieu;
                lieuxSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Erreur lors du chargement des lieux:", error);
            lieuxSelect.innerHTML = '<option value="">Erreur de chargement</option>';
        }
    }

    /**
     * Loads communes for a specific department.
     * @async
     * @param {string} departement - Department code
     */
    async function loadCommunes(departement) {
        const normalizedDept = normalizeDept(departement);
        try {
            const response = await fetch(`/api/communes?dept=${normalizedDept}`);
            if (!response.ok) {
                throw new Error(
                    `Erreur lors de la récupération des communes: ${response.statusText}`,
                );
            }
            // Additional logic for handling commune data can be added here
        } catch (error) {
            console.error("Erreur lors du chargement des communes:", error);
        }
    }

    /**
     * Resets commune input and lieu selection to default state.
     */
    function resetCommuneAndLieux() {
        communeList.innerHTML = "";
        lieuxSelect.innerHTML = '<option value="">Tous les lieux</option>';
    }

    return {
        loadDepartements,
        loadCommunes,
        handleCommuneInput,
        loadLieux,
        resetCommuneAndLieux,
    };
}

// Export for use as module
window.LocationHandler = LocationHandler;