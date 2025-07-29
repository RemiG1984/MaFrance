// Removed normalizeDept import as it's causing issues
import { api, apiService } from './apiService.js';
import { spinner } from './spinner.js';

/**
 * Location handler module for managing department, commune, and lieu selection.
 * Manages loading and filtering of geographical data.
 * @param {HTMLSelectElement} departementSelect - Department selection dropdown
 * @param {HTMLInputElement} communeInput - Commune input field
 * @param {HTMLDataListElement} communeList - Commune datalist options
 * @param {HTMLSelectElement} lieuxSelect - Lieu selection dropdown
 * @param {HTMLElement} resultsDiv - Results display container
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Location handler interface
 */
function LocationHandler(
    departementSelect,
    communeInput,
    communeList,
    resultsDiv,
    departmentNames,
) {
    async function loadDepartements() {
        const spinnerId = spinner.show(departementSelect.parentElement, 'Chargement des départements...');
        try {
            departementSelect.disabled = true;
            
            const departements = await api.getDepartments();
            console.log("Departments fetched:", departements);
            departementSelect.innerHTML =
                '<option value="">-- Choisir un département --</option>';
            
            departements.forEach((dept) => {
                // Use the raw departement code from the API
                const deptCode = dept.departement;
                console.log("Processing department:", deptCode);
                
                // Basic validation for French department codes
                if (!deptCode || typeof deptCode !== 'string') {
                    console.warn("Invalid departement code skipped:", deptCode);
                    return;
                }
                
                const option = document.createElement("option");
                option.value = deptCode;
                const deptName = departmentNames[deptCode] || deptCode;
                option.textContent = `${deptCode} - ${deptName}`;
                departementSelect.appendChild(option);
                console.log("Added department option:", option.textContent);
            });
            
            console.log("Total department options added:", departementSelect.options.length - 1);
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur chargement départements:", error);
        } finally {
            departementSelect.disabled = false;
            spinner.hide(spinnerId);
        }
    }

    

    // Store communes data for autocomplete
    let communesData = [];

    async function searchCommunesGlobally(query = "") {
        if (query.length < 2) {
            return;
        }

        try {
            console.log("Searching communes globally with query:", query);
            const communes = await api.searchCommunes(query);
            console.log("Global communes search results:", communes);

            // Store the communes data for getCOGForCommune and getDepartmentForCommune
            communesData = communes.map(commune => ({
                displayName: `${commune.commune} (${commune.departement})`,
                commune: commune.commune,
                COG: commune.COG,
                departement: commune.departement
            }));

            // Update datalist with global search results
            communeList.innerHTML = "";
            communesData.forEach((commune) => {
                const option = document.createElement("option");
                option.value = commune.displayName;
                option.setAttribute('data-cog', commune.COG);
                option.setAttribute('data-dept', commune.departement);
                communeList.appendChild(option);
            });

        } catch (error) {
            console.error("Erreur recherche globale communes:", {
                error: error.message,
                stack: error.stack,
                query: query,
            });
        }
    }

    function resetCommuneAndLieux() {
        // Always enable commune input for global search
        communeInput.disabled = false;
        communeInput.placeholder = "Rechercher une commune...";
        communeList.innerHTML = "";
    }

    async function handleCommuneInput(departement, query) {
        if (!query || query.length < 2) {
            communeList.innerHTML = "";
            communesData = [];
            return;
        }

        // Always use global search with fuzzy matching and ranking
        await searchCommunesGlobally(query);
    }

    function getCOGForCommune(communeName) {
        // First try to find in stored communes data
        for (const commune of communesData) {
            if (commune.displayName === communeName || commune.commune === communeName) {
                return commune.COG;
            }
        }

        // Fallback to datalist options if any exist
        const options = communeList.querySelectorAll('option');
        for (const option of options) {
            const optionCommuneName = option.value.includes(' (') 
                ? option.value.substring(0, option.value.lastIndexOf(' ('))
                : option.value;
            if (option.value === communeName || optionCommuneName === communeName) {
                return option.getAttribute('data-cog');
            }
        }
        return null;
    }

    function getDepartmentForCommune(communeName) {
        // First try to find in stored communes data
        for (const commune of communesData) {
            if (commune.displayName === communeName || commune.commune === communeName) {
                return commune.departement;
            }
        }

        // Fallback to datalist options if any exist
        const options = communeList.querySelectorAll('option');
        for (const option of options) {
            const optionCommuneName = option.value.includes(' (') 
                ? option.value.substring(0, option.value.lastIndexOf(' ('))
                : option.value;
            if (option.value === communeName || optionCommuneName === communeName) {
                return option.getAttribute('data-dept');
            }
        }
        return null;
    }

    async function loadLieux(departement, cog) {
        const lieuxSelect = document.getElementById('lieuxSelect');
        if (!lieuxSelect || !cog) return; // Only load at commune level

        const spinnerId = spinner.show(lieuxSelect.parentElement, 'Chargement des lieux...');
        try {
            lieuxSelect.disabled = true;

            const lieux = await api.getLieux(departement, cog);
            console.log("Lieux fetched:", lieux);
            lieuxSelect.innerHTML = '<option value="">-- Tous les lieux --</option>';

            lieux.forEach((lieu) => {
                const option = document.createElement("option");
                option.value = lieu.lieu;
                option.textContent = lieu.lieu;
                lieuxSelect.appendChild(option);
            });

            // Don't show/hide here - let renderFilterButtons handle visibility
            lieuxSelect.disabled = false;
        } catch (error) {
            lieuxSelect.innerHTML = '<option value="">-- Aucun lieu --</option>';
            lieuxSelect.disabled = true;
            console.error("Erreur chargement lieux:", error);
        } finally {
            spinner.hide(spinnerId);
        }
    }

    return {
        loadDepartements,
        resetCommuneAndLieux,
        handleCommuneInput,
        getCOGForCommune,
        getDepartmentForCommune,
        searchCommunesGlobally,
        loadLieux,
    };
}

// Export for ES6 modules
export { LocationHandler };