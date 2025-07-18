const LocationHandler = (function () {
    return function (
        departementSelect,
        communeInput,
        communeList,
        lieuxSelect,
        resultsDiv,
        departmentNames,
    ) {
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
                    // Normalize departement code
                    let deptCode = dept.departement.trim().toUpperCase();
                    if (/^\d+$/.test(deptCode)) {
                        deptCode = deptCode.padStart(2, "0");
                    }
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
            // Normalize departement
            departement = departement.trim().toUpperCase();
            if (/^\d+$/.test(departement)) {
                departement = departement.padStart(2, "0");
            }
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

        async function loadLieux(departement, cog) {
            // Normalize departement
            departement = departement.trim().toUpperCase();
            if (/^\d+$/.test(departement)) {
                departement = departement.padStart(2, "0");
            }
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
    };
})();
