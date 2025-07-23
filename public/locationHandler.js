import { normalizeDept } from './utils.js';

/**
 * Creates a location handler object for managing department, commune, and place selections.
 * @param {HTMLSelectElement} departementSelect - The department select element.
 * @param {HTMLInputElement} communeInput - The commune input element.
 * @param {HTMLDataListElement} communeList - The commune datalist element.
 * @param {HTMLSelectElement} lieuxSelect - The place select element.
 * @param {HTMLDivElement} resultsDiv - The results display div.
 * @param {Object} departmentNames - Mapping of department codes to names.
 * @returns {Object} The location handler object with methods.
 */
export function LocationHandler(
    departementSelect,
    communeInput,
    communeList,
    lieuxSelect,
    resultsDiv,
    departmentNames,
) {
    /**
     * Loads the list of departments from the API and populates the select element.
     */
    async function loadDepartements() {
        try {
            const response = await fetch("/api/departements");
            if (!response.ok) {
                throw new Error(
                    "Erreur lors du chargement des départements",
                );
            }
            const departements = await response.json();
            console.log("Departments fetched:", departements);
            departementSelect.innerHTML =
                '<option value="">-- Choisir un département --</option>';
            departements.forEach((dept) => {
                let deptCode = normalizeDept(dept.departement);
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

    /**
     * Loads the list of communes for a given department and optional query, populating the datalist.
     * @param {string} departement - The department code.
     * @param {string} [query=""] - Optional search query for filtering communes.
     */
    async function loadCommunes(departement, query = "") {
        departement = normalizeDept(departement);
        if (
            !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)
        ) {
            console.error("Invalid departement code:", departement);
            resultsDiv.innerHTML =
                "<p>Erreur : Code département invalide</p>";
            return;
        }
        try {
            const url = `/api/communes?dept=${departement}&q=${encodeURIComponent(query)}`;
            console.log("Fetching communes from:", url);
            const response = await fetch(url);
            console.log(
                "Communes response status:",
                response.status,
                response.statusText,
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Communes API error response:", errorText);
                throw new Error(
                    `Erreur ${response.status}: ${response.statusText} - ${errorText}`,
                );
            }
            const communes = await response.json();
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
                departement: departement,
                query: query,
            });
        }
    }

    /**
     * Loads the list of places (lieux) for a given department and optional COG, populating the select element.
     * @param {string} departement - The department code.
     * @param {string} [cog] - Optional COG code for filtering places.
     */
    async function loadLieux(departement, cog) {
        departement = normalizeDept(departement);
        if (
            !/^(0[1-9]|[1-8][0-9]|9[0-5]|2[AB]|97[1-6])$/.test(departement)
        ) {
            console.error("Invalid departement code:", departement);
            resultsDiv.innerHTML =
                "<p>Erreur : Code département invalide</p>";
            return;
        }
        try {
            let url = `/api/articles/lieux?dept=${departement}`;
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

    /**
     * Resets the commune input and places select when no department is selected.
     */
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

    /**
     * Handles input changes for the commune field, loading suggestions if applicable.
     * @param {string} departement - The department code.
     * @param {string} query - The current input query.
     */
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