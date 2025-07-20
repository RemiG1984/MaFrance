const ExecutiveHandler = (function () {
    return function (executiveDiv, departmentNames) {
        async function showCountryExecutive() {
            try {
                const response = await fetch("/api/country/ministre");
                if (!response.ok) {
                    throw new Error(
                        `Erreur lors de la récupération du ministre: ${response.statusText}`,
                    );
                }
                const data = await response.json();
                console.log("Country executive data:", data);
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

        async function showDepartmentExecutive(deptCode) {
            try {
                const response = await fetch(
                    `/api/departements/prefet?dept=${deptCode}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Erreur lors de la récupération du préfet: ${response.statusText}`,
                    );
                }
                const data = await response.json();
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

        async function showCommuneExecutive(cog) {
            try {
                // First get commune details from COG
                const communeResponse = await fetch(
                    `/api/communes/details?cog=${encodeURIComponent(cog)}`,
                );
                if (!communeResponse.ok) {
                    throw new Error(
                        `Erreur lors de la récupération de la commune: ${communeResponse.statusText}`,
                    );
                }
                const communeData = await communeResponse.json();
                if (!communeData) {
                    executiveDiv.innerHTML = "<p>Aucune commune trouvée.</p>";
                    return;
                }

                const response = await fetch(
                    `/api/communes/maire?cog=${encodeURIComponent(cog)}`,
                );
                if (!response.ok) {
                    throw new Error(
                        `Erreur lors de la récupération du maire: ${response.statusText}`,
                    );
                }
                const data = await response.json();
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

        function formatDate(dateStr) {
            if (!dateStr) return "";
            const [year, month, day] = dateStr.split("-");
            return `${day}/${month}/${year}`;
        }

        return {
            showCountryExecutive,
            showDepartmentExecutive,
            showCommuneExecutive,
        };
    };
})();
