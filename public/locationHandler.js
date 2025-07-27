import { normalizeDept, debounce } from './utils.js';
import { apiService, api } from './apiService.js';

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
    lieuxSelect,
    resultsDiv,
    departmentNames,
) {
    async function loadDepartements() {
        try {
            const departements = await api.getDepartments();
            console.log("Departments fetched:", departements);
            departementSelect.innerHTML =
                '<option value="">-- Choisir un département --</option>';
            departements.forEach((dept) => {
                // Normalize departement code using utils
                const deptCode = normalizeDept(dept.departement);
                if (
                    !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(
                        deptCode,
                    )
                ) {
                    console.warn(
                        "Invalid departement code skipped:",
                        deptCode,
                    );
                    return;
                }
                const option = document.createElement("option");
                option.value = deptCode;
                const deptName = departmentNames[deptCode] || deptCode;
                option.textContent = `${deptCode} - ${deptName}`;
                departementSelect.appendChild(option);
            });
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur chargement départements:", error);
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

    async function loadLieux(departement, cog) {
        // Normalize departement using utils
        const normalizedDept = normalizeDept(departement);
        if (
            !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(normalizedDept)
        ) {
            console.error("Invalid departement code:", normalizedDept);
            resultsDiv.innerHTML =
                "<p>Erreur : Code département invalide</p>";
            return;
        }
        try {
            const lieux = await api.getLieux(normalizedDept, cog);
            console.log("Lieux fetched:", lieux);
            lieuxSelect.innerHTML =
                '<option value="">-- Tous les lieux --</option>';
            lieux.forEach((lieu) => {
                const option = document.createElement("option");
                option.value = lieu.lieu;
                option.textContent = lieu.lieu;
                lieuxSelect.appendChild(option);
            });
            lieuxSelect.disabled = lieux.length === 0;
        } catch (error) {
            lieuxSelect.innerHTML =
                '<option value="">-- Aucun lieu --</option>';
            lieuxSelect.disabled = true;
            console.error("Erreur chargement lieux:", error);
        }
    }

    function resetCommuneAndLieux() {
        // Always enable commune input for global search
        communeInput.disabled = false;
        communeInput.placeholder = "Rechercher une commune...";
        communeList.innerHTML = "";
        lieuxSelect.innerHTML =
            '<option value="">-- Tous les lieux --</option>';
        lieuxSelect.disabled = true;
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

    return {
        loadDepartements,
        loadLieux,
        resetCommuneAndLieux,
        handleCommuneInput,
        getCOGForCommune,
        getDepartmentForCommune,
        searchCommunesGlobally,
    };
}

// Export for ES6 modules
export { LocationHandler };