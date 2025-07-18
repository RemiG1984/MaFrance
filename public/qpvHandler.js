const QpvHandler = (function () {
    // Use shared department names
    const departmentNames = DepartmentNames;

    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            type: urlParams.get("type"),
            code: urlParams.get("code"),
            dept: urlParams.get("dept"),
            commune: urlParams.get("commune"),
        };
    }

    function formatNumber(value) {
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "number" && isNaN(value))
        )
            return "N/A";
        if (typeof value === "number") {
            return value.toLocaleString("fr-FR");
        }
        return value;
    }

    function formatPercentage(value) {
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            (typeof value === "number" && isNaN(value))
        )
            return "N/A";
        if (typeof value === "number") {
            return value.toFixed(1) + "%";
        }
        return value;
    }

    async function loadQpvData() {
        const params = getUrlParams();
        const resultsDiv = document.getElementById("results");
        const titleDiv = document.getElementById("pageTitle");

        try {
            let apiUrl;
            let pageTitle;

            console.log("QPV Handler - Params:", params);

            if (params.type === "department") {
                if (!params.code) {
                    throw new Error("Code département manquant");
                }
                apiUrl = `/api/qpv/departement/${params.code}`;
                pageTitle = `Quartiers "Prioritaires" (QPV) pour ${departmentNames[params.code] || params.code} (${params.code})`;
            } else if (params.type === "commune") {
                if (!params.code) {
                    throw new Error("Code commune (COG) manquant");
                }
                apiUrl = `/api/qpv/commune/${params.code}`;
                pageTitle = `Quartiers "Prioritaires" (QPV) pour ${params.commune || 'Commune'} (${params.dept || params.code})`;
            } else {
                throw new Error("Type non supporté: " + (params.type || 'undefined'));
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

    return {
        init: function () {
            document.addEventListener("DOMContentLoaded", loadQpvData);
        },
    };
})();

// Initialize when the script loads
QpvHandler.init();
