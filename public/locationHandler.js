
import { normalizeDept, debounce } from './utils.js';
import { apiService } from './apiService.js';
import { validateDepartment, validateCommune } from './validators.js';

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
            const departements = await apiService.request("/api/departements");
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
        // Normalize and validate departement
        const normalizedDept = normalizeDept(departement);
        const validation = validateDepartment(normalizedDept);
        if (!validation.isValid) {
            console.error("Invalid departement code:", normalizedDept, validation.errors);
            resultsDiv.innerHTML = `<p>Erreur : ${validation.errors.join(', ')}</p>`;
            return;
        }
        
        try {
            const url = `/api/communes?dept=${normalizedDept}&q=${encodeURIComponent(query)}`;
            console.log("Fetching communes from:", url);
            const communes = await apiService.request(url);
            console.log("Communes fetched:", communes);
            communeList.innerHTML = "";
            communes.forEach((commune) => {
                const option = document.createElement("option");
                option.value = commune.commune;
                option.textContent = commune.commune;
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

    async function loadLieux(departement, cog) {
        // Normalize and validate departement
        const normalizedDept = normalizeDept(departement);
        const validation = validateDepartment(normalizedDept);
        if (!validation.isValid) {
            console.error("Invalid departement code:", normalizedDept, validation.errors);
            resultsDiv.innerHTML = `<p>Erreur : ${validation.errors.join(', ')}</p>`;
            return;
        }
        
        try {
            let url = `/api/articles/lieux?dept=${normalizedDept}`;
            if (cog) {
                url += `&cog=${encodeURIComponent(cog)}`;
            }

            const lieux = await apiService.request(url);
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
        const isDisabled = departementSelect.value === "";
        communeInput.disabled = isDisabled;
        if (isDisabled) {
            communeInput.value = ""; // Only clear if disabled
        }
        communeList.innerHTML = "";
        lieuxSelect.innerHTML =
            '<option value="">-- Tous les lieux --</option>';
        lieuxSelect.disabled = true;
    }

    function handleCommuneInput(departement, query) {
        if (!departement) {
            resetCommuneAndLieux();
            return;
        }
        if (query.length >= 2) {
            loadCommunes(departement, query);
        } else {
            communeList.innerHTML = ""; // Clear datalist but allow typing
        }
    }

    return {
        loadDepartements,
        loadCommunes,
        loadLieux,
        resetCommuneAndLieux,
        handleCommuneInput,
    };
}

// Export for ES6 modules
export { LocationHandler };
