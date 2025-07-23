import { formatDate, normalizeDept } from './utils.js';

/**
 * Executive handler module for displaying information about political executives.
 * Manages the display of ministers, prefects, and mayors.
 * @param {HTMLElement} executiveDiv - Container for displaying executive information
 * @param {Object} departmentNames - Department names mapping
 * @returns {Object} Executive handler interface
 */
function ExecutiveHandler(executiveDiv, departmentNames) {

    /**
     * Displays country-level executive information (Minister of Interior).
     * @async
     */
    async function showCountryExecutive() {
        try {
            const response = await fetch('/api/country/executive');
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des données de l\'exécutif');
            }

            const data = await response.json();
            console.log("Country executive data:", data);

            const formattedDate = formatDate(data.date_mandat);

            executiveDiv.innerHTML = `
                <h3>Ministre de l'Intérieur</h3>
                <div class="executive-info">
                    <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
                    <p><strong>Prise de fonction :</strong> ${formattedDate}</p>
                    <p><strong>Famille politique :</strong> ${data.famille_nuance}</p>
                </div>
            `;
        } catch (error) {
            console.error("Erreur lors de la récupération de l'exécutif du pays:", error);
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    /**
     * Displays department-level executive information (Prefect).
     * @async
     * @param {string} departement - Department code
     */
    async function showDepartmentExecutive(departement) {
        const normalizedDept = normalizeDept(departement);

        try {
            const response = await fetch(`/api/departements/prefet?dept=${normalizedDept}`);
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des données du préfet');
            }

            const data = await response.json();
            const deptName = departmentNames[departement] || departement;
            const formattedDate = formatDate(data.date_poste);

            executiveDiv.innerHTML = `
                <h3>Préfet de ${deptName}</h3>
                <div class="executive-info">
                    <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
                    <p><strong>Prise de fonction :</strong> ${formattedDate}</p>
                </div>
            `;
        } catch (error) {
            console.error("Erreur lors de la récupération du préfet:", error);
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    /**
     * Displays commune-level executive information (Mayor).
     * @async
     * @param {string} cog - Commune COG code
     */
    async function showCommuneExecutive(cog) {
        try {
            const response = await fetch(`/api/communes/${cog}/maire`);
            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des données du maire');
            }

            const data = await response.json();
            const formattedDate = formatDate(data.date_election);

            executiveDiv.innerHTML = `
                <h3>Maire de ${data.commune}</h3>
                <div class="executive-info">
                    <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
                    <p><strong>Sexe :</strong> ${data.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                    <p><strong>Date d'élection :</strong> ${formattedDate}</p>
                    <p><strong>Nuance politique :</strong> ${data.nuance_politique || 'Non renseigné'}</p>
                </div>
            `;
        } catch (error) {
            console.error("Erreur lors de la récupération du maire:", error);
            executiveDiv.innerHTML = `<p>Erreur : ${error.message}</p>`;
        }
    }

    return {
        showCountryExecutive,
        showDepartmentExecutive,
        showCommuneExecutive
    };
}

// Export for ES6 modules
export { ExecutiveHandler };