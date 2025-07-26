
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

    async function loadCommunes(departement, query = "") {
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
            console.log("Fetching communes for dept:", normalizedDept, "query:", query);
            const communes = await apiService.request(`/api/communes?dept=${normalizedDept}&q=${encodeURIComponent(query)}`);
            console.log("Communes fetched:", communes);
            communeList.innerHTML = "";
            communes.forEach((commune) => {
                const option = document.createElement("option");
                option.value = commune.commune;
                option.textContent = commune.commune;
                option.setAttribute('data-cog', commune.COG);
                option.setAttribute('data-dept', commune.departement);
                communeList.appendChild(option);
            });
        } catch (error) {
            resultsDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error("Erreur chargement communes:", {
                error: error.message,
                stack: error.stack,
                departement: normalizedDept,
                query: query,
            });
        }
    }

    async function searchCommunesGlobally(query = "") {
        if (query.length < 2) {
            communeList.innerHTML = "";
            return;
        }
        
        try {
            console.log("Searching communes globally with query:", query);
            const communes = await apiService.request(`/api/communes/search?q=${encodeURIComponent(query)}`);
            console.log("Global communes search results:", communes);
            communeList.innerHTML = "";
            communes.forEach((commune) => {
                const option = document.createElement("option");
                option.value = commune.commune;
                option.textContent = `${commune.commune} (${commune.departement})`;
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
            let url = `/api/articles/lieux?dept=${normalizedDept}`;
            if (cog) {
                url += `&cog=${encodeURIComponent(cog)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error("Erreur lors du chargement des lieux");
            }
            const lieux = await response.json();
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
        communeList.innerHTML = "";
        lieuxSelect.innerHTML =
            '<option value="">-- Tous les lieux --</option>';
        lieuxSelect.disabled = true;
    }

    function handleCommuneInput(departement, query) {
        if (departement) {
            if (query.length >= 2) {
                loadCommunes(departement, query);
            } else {
                communeList.innerHTML = ""; // Clear datalist but allow typing
            }
        } else {
            // Global search when no department is selected
            if (query.length >= 2) {
                searchCommunesGlobally(query);
            } else {
                communeList.innerHTML = "";
            }
        }
    }

    function getCOGForCommune(communeName) {
        const options = communeList.querySelectorAll('option');
        for (const option of options) {
            if (option.value === communeName || option.value.startsWith(communeName + ' (')) {
                return option.getAttribute('data-cog');
            }
        }
        return null;
    }

    function getDepartmentForCommune(communeName) {
        const options = communeList.querySelectorAll('option');
        for (const option of options) {
            if (option.value === communeName || option.value.startsWith(communeName + ' (')) {
                return option.getAttribute('data-dept');
            }
        }
        return null;
    }

    return {
        loadDepartements,
        loadCommunes,
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
