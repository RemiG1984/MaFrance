
import { formatNumber, formatPercentage } from './utils.js';

/**
 * QPV (Quartiers Prioritaires de la Ville) Handler module for displaying QPV data.
 * Manages QPV data visualization and table rendering.
 * @returns {Object} QPV handler interface
 */
function QpvHandler() {
    // Use shared department names
    const departmentNames = DepartmentNames;

    /**
     * Gets URL parameters for QPV page.
     * @returns {Object} URL parameters object
     */
    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            type: urlParams.get("type"),
            code: urlParams.get("code"),
            dept: urlParams.get("dept"),
            commune: urlParams.get("commune"),
        };
    }

    /**
     * Loads QPV data based on URL parameters.
     */
    async function loadQpvData() {
        const params = getUrlParams();
        const resultsDiv = document.getElementById("results");
        const titleDiv = document.getElementById("pageTitle");

        try {
            let apiUrl;
            let pageTitle;

            console.log("QPV Handler - Params:", params);

            if (params.type === "department") {
                apiUrl = `/api/qpv/departement/${params.code}`;
                pageTitle = `Quartiers "Prioritaires" (QPV) pour ${departmentNames[params.code] || params.code} (${params.code})`;
            } else if (params.type === "commune") {
                apiUrl = `/api/qpv/commune/${params.code}`;
                pageTitle = `Quartiers "Prioritaires" (QPV) pour ${params.commune} (${params.dept})`;
            } else {
                throw new Error("Type non supporté: " + params.type);
            }

            console.log("QPV Handler - API URL:", apiUrl);
            titleDiv.textContent = pageTitle;

            const response = await fetch(apiUrl);
            console.log("QPV Handler - Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("QPV Handler - Error response:", errorText);
                throw new Error(
                    `Erreur HTTP: ${response.status} - ${errorText}`,
                );
            }

            const qpvData = await response.json();
            console.log("QPV data loaded:", qpvData);

            if (!qpvData || qpvData.length === 0) {
                resultsDiv.innerHTML =
                    "<p>Aucun QPV trouvé pour cette zone.</p>";
                return;
            }

            renderQpvTable(qpvData);
        } catch (error) {
            console.error("Error loading QPV data:", error);
            resultsDiv.innerHTML = `<p>Erreur lors du chargement des données QPV: ${error.message}</p>`;
        }
    }

    /**
     * Renders QPV data table.
     * @param {Array} qpvData - Array of QPV data objects
     */
    function renderQpvTable(qpvData) {
        const resultsDiv = document.getElementById("results");

        const tableHtml = `
            <div class="data-box">
                <div class="table-container">
                    <table class="qpv-table">
                        <thead>
                            <tr class="score-header">
                                <th>Quartier QPV</th>
                                <th>Population</th>
                                <th>Indice Jeunesse</th>
                                <th>Logements sociaux</th>
                                <th>Taux logements sociaux</th>
                                <th>Taux d'emploi</th>
                                <th>Taux de pauvreté</th>
                                <th>RSA socle</th>
                                <th>Allocataires CAF</th>
                                <th>Couverture CAF</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${qpvData
                                .map(
                                    (qpv) => `
                                <tr class="score-row">
                                    <td class="row-title">
                                        <a href="https://sig.ville.gouv.fr/territoire/${qpv.codeQPV}" target="_blank">
                                            ${qpv.lib_qp || qpv.codeQPV}
                                        </a>
                                    </td>
                                    <td class="score-main">${formatNumber(qpv.popMuniQPV)}</td>
                                    <td class="score-main">${formatNumber(qpv.indiceJeunesse)}</td>
                                    <td class="score-main">${formatNumber(qpv.nombre_logements_sociaux)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_logements_sociaux)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_d_emploi)}</td>
                                    <td class="score-main">${formatPercentage(qpv.taux_pauvrete_60)}</td>
                                    <td class="score-main">${formatNumber(qpv.RSA_socle)}</td>
                                    <td class="score-main">${formatNumber(qpv.allocataires_CAF)}</td>
                                    <td class="score-main">${formatNumber(qpv.personnes_couvertes_CAF)}</td>
                                </tr>
                            `,
                                )
                                .join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        resultsDiv.innerHTML = tableHtml;
    }

    /**
     * Initializes the QPV handler.
     */
    function init() {
        document.addEventListener("DOMContentLoaded", loadQpvData);
    }

    return {
        init,
        loadQpvData,
        renderQpvTable
    };
}

// Export for ES6 modules
export { QpvHandler };

// Initialize when the script loads (for backward compatibility)
if (typeof window !== 'undefined') {
    const qpvHandler = QpvHandler();
    qpvHandler.init();
}
