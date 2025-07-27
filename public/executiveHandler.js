import { formatDate } from './utils.js';
import { api } from './apiService.js';

/**
 * Executive Handler module for displaying executive information (ministers, prefects, mayors).
 * Manages fetching and rendering of executive data for different administrative levels.
 * @param {HTMLElement} executiveDiv - Container for executive information
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Executive handler interface
 */
function ExecutiveHandler(executiveDiv, departmentNames) {
    /**
     * Shows country-level executive (Minister of Interior)
     */
    async function showCountryExecutive() {
        try {
            const data = await api.getCountryExecutive("France");
            if (!data) {
                executiveDiv.innerHTML = "<p>Aucun ministre trouvé.</p>";
            } else {
                renderExecutive(
                    "France",
                    "Ministre de l'intérieur",
                    data.prenom,
                    data.nom,
                    data.date_mandat,
                    data.famille_nuance,
                );
            }
        } catch (error) {
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error(
                "Erreur lors de la récupération du ministre:",
                error,
            );
        }
    }

    /**
     * Shows department-level executive (Prefect)
     * @param {string} deptCode - Department code
     */
    async function showDepartmentExecutive(deptCode) {
        try {
            const data = await apiService.request(`/api/departements/prefet?dept=${deptCode}`);
            console.log("Department executive data:", data);
            if (!data) {
                executiveDiv.innerHTML = "<p>Aucun préfet trouvé.</p>";
            } else {
                renderExecutive(
                    `${departmentNames[deptCode]} (${deptCode})`,
                    "Préfet",
                    data.prenom,
                    data.nom,
                    data.date_poste,
                    null, // No famille_nuance for prefets
                );
            }
        } catch (error) {
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error(
                "Erreur lors de la récupération du préfet:",
                error,
            );
        }
    }

    /**
     * Shows commune-level executive (Mayor)
     * @param {string} cog - Commune COG code
     */
    async function showCommuneExecutive(cog) {
        try {
            // First get commune details from COG
            const communeData = await api.getCommuneDetails(cog);
            if (!communeData) {
                executiveDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                return;
            }

            const data = await apiService.request(`/api/communes/maire?cog=${encodeURIComponent(cog)}`);
            console.log("Commune executive data:", data);
            if (!data) {
                executiveDiv.innerHTML = "<p>Aucun maire trouvé.</p>";
            } else {
                renderExecutive(
                    `${communeData.commune} (${communeData.departement})`,
                    "Maire",
                    data.prenom,
                    data.nom,
                    data.date_mandat,
                    data.famille_nuance,
                );
            }
        } catch (error) {
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error(
                "Erreur lors de la récupération du maire:",
                error,
            );
        }
    }

    /**
     * Renders executive information in the container
     * @param {string} location - Location name
     * @param {string} position - Executive position
     * @param {string} prenom - First name
     * @param {string} nom - Last name
     * @param {string} date - Date of mandate/appointment
     * @param {string|null} familleNuance - Political family
     */
    function renderExecutive(
        location,
        position,
        prenom,
        nom,
        date,
        familleNuance,
    ) {
        const dateLabel = date ? ` depuis le ${formatDate(date)}` : "";
        const familleLabel = familleNuance
            ? `<br>Famille politique: <span class="executive-famille">${familleNuance}</span>`
            : "";
        executiveDiv.innerHTML = `
            <div class="executive-box">
                <p>${position} de ${location}: <span class="executive-name">${prenom} ${nom}</span>${dateLabel}${familleLabel}</p>
            </div>
        `;
    }

    return {
        showCountryExecutive,
        showDepartmentExecutive,
        showCommuneExecutive,
    };
}

// Export for ES6 modules
export { ExecutiveHandler };