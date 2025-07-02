(function () {
    // Department code to name mapping
    const departmentNames = {
        "01": "Ain",
        "02": "Aisne",
        "03": "Allier",
        "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes",
        "06": "Alpes-Maritimes",
        "07": "Ardèche",
        "08": "Ardennes",
        "09": "Ariège",
        10: "Aube",
        11: "Aude",
        12: "Aveyron",
        13: "Bouches-du-Rhône",
        14: "Calvados",
        15: "Cantal",
        16: "Charente",
        17: "Charente-Maritime",
        18: "Cher",
        19: "Corrèze",
        "2A": "Corse-du-Sud",
        "2B": "Haute-Corse",
        21: "Côte-d'Or",
        22: "Côtes-d'Armor",
        23: "Creuse",
        24: "Dordogne",
        25: "Doubs",
        26: "Drôme",
        27: "Eure",
        28: "Eure-et-Loir",
        29: "Finistère",
        30: "Gard",
        31: "Haute-Garonne",
        32: "Gers",
        33: "Gironde",
        34: "Hérault",
        35: "Ille-et-Vilaine",
        36: "Indre",
        37: "Indre-et-Loire",
        38: "Isère",
        39: "Jura",
        40: "Landes",
        41: "Loir-et-Cher",
        42: "Loire",
        43: "Haute-Loire",
        44: "Loire-Atlantique",
        45: "Loiret",
        46: "Lot",
        47: "Lot-et-Garonne",
        48: "Lozère",
        49: "Maine-et-Loire",
        50: "Manche",
        51: "Marne",
        52: "Haute-Marne",
        53: "Mayenne",
        54: "Meurthe-et-Moselle",
        55: "Meuse",
        56: "Morbihan",
        57: "Moselle",
        58: "Nièvre",
        59: "Nord",
        60: "Oise",
        61: "Orne",
        62: "Pas-de-Calais",
        63: "Puy-de-Dôme",
        64: "Pyrénées-Atlantiques",
        65: "Hautes-Pyrénées",
        66: "Pyrénées-Orientales",
        67: "Bas-Rhin",
        68: "Haut-Rhin",
        69: "Rhône",
        70: "Haute-Saône",
        71: "Saône-et-Loire",
        72: "Sarthe",
        73: "Savoie",
        74: "Haute-Savoie",
        75: "Paris",
        76: "Seine-Maritime",
        77: "Seine-et-Marne",
        78: "Yvelines",
        79: "Deux-Sèvres",
        80: "Somme",
        81: "Tarn",
        82: "Tarn-et-Garonne",
        83: "Var",
        84: "Vaucluse",
        85: "Vendée",
        86: "Vienne",
        87: "Haute-Vienne",
        88: "Vosges",
        89: "Yonne",
        90: "Territoire de Belfort",
        91: "Essonne",
        92: "Hauts-de-Seine",
        93: "Seine-Saint-Denis",
        94: "Val-de-Marne",
        95: "Val-d'Oise",
        971: "Guadeloupe",
        972: "Martinique",
        973: "Guyane",
        974: "La Réunion",
        976: "Mayotte",
    };

    // Parse URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get("type"); // country, department, or commune
    const code = urlParams.get("code"); // France, dept code, or COG
    const dept = urlParams.get("dept"); // Department code for communes
    const communeName = urlParams.get("commune"); // Commune name from URL

    // DOM element for the chart grid
    const chartGrid = document.getElementById("chartGrid");
    if (!chartGrid) {
        console.error('Chart grid element with ID "chartGrid" not found');
        return;
    }

    // Initialize Chart.js
    async function initCrimeCharts() {
        try {
            let endpoint,
                params = {};
            let deptData = null,
                countryData = null,
                mainData = null;
            let titleText;

            // Determine the endpoint and title
            if (type === "country") {
                endpoint = "/api/country/crime_history";
                params = { country: code || "France" };
                titleText = "France";
            } else if (type === "department") {
                endpoint = "/api/departements/crime_history";
                params = { dept: code };
                titleText = `${code} - ${departmentNames[code] || code}`;
            } else if (type === "commune") {
                if (!dept || !communeName) {
                    throw new Error(
                        "Department code and commune name are required for commune",
                    );
                }
                endpoint = "/api/communes/crime_history";
                params = { dept: dept, cog: code };
                titleText = `${communeName} (${dept})`;
            } else {
                throw new Error("Invalid type parameter");
            }

            // Fetch main data
            const queryString = new URLSearchParams(params).toString();
            console.log(
                "Fetching main data from:",
                `${endpoint}?${queryString}`,
            );
            const response = await fetch(`${endpoint}?${queryString}`);
            if (!response.ok) {
                console.error("Fetch failed:", {
                    status: response.status,
                    statusText: response.statusText,
                });
                throw new Error(
                    `Erreur lors de la récupération des données: ${response.statusText}`,
                );
            }
            mainData = await response.json();
            console.log("Main crime data:", mainData);

            if (!mainData || mainData.length === 0) {
                chartGrid.innerHTML =
                    "<p>Aucune donnée disponible pour cet emplacement.</p>";
                return;
            }

            // Fetch higher-level data
            if (type === "department" || type === "commune") {
                const countryResponse = await fetch(
                    "/api/country/crime_history?country=France",
                );
                if (!countryResponse.ok) {
                    console.error("Country fetch failed:", {
                        status: countryResponse.status,
                        statusText: countryResponse.statusText,
                    });
                    throw new Error(
                        `Erreur lors de la récupération des données nationales: ${countryResponse.statusText}`,
                    );
                }
                countryData = await countryResponse.json();
                console.log("Country crime data:", countryData);
            }

            if (type === "commune") {
                const deptResponse = await fetch(
                    `/api/departements/crime_history?dept=${dept}`,
                );
                if (!deptResponse.ok) {
                    console.error("Department fetch failed:", {
                        status: deptResponse.status,
                        statusText: deptResponse.statusText,
                    });
                    throw new Error(
                        `Erreur lors de la récupération des données départementales: ${deptResponse.statusText}`,
                    );
                }
                deptData = await deptResponse.json();
                console.log("Department crime data:", deptData);
            }

            // Extract years (use main data years as reference)
            const years = mainData.map((row) => row.annee);

            // Define crime categories
            const categories =
                type === "commune"
                    ? [
                          {
                              key: "violences_physiques_p1k",
                              label: "Violences physiques",
                              color: "#007bff",
                          },
                          {
                              key: "violences_sexuelles_p1k",
                              label: "Violences sexuelles",
                              color: "#28a745",
                          },
                          { key: "vols_p1k", label: "Vols", color: "#ffc107" },
                          {
                              key: "destructions_p1k",
                              label: "Destructions et dégradations",
                              color: "#e83e8c",
                          },
                          {
                              key: "stupefiants_p1k",
                              label: "Trafic et usage de stupéfiants",
                              color: "#17a2b8",
                          },
                          {
                              key: "escroqueries_p1k",
                              label: "Escroqueries",
                              color: "#fd7e14",
                          },
                      ]
                    : [
                          {
                              key: "homicides_p100k",
                              label: "Homicides et tentatives",
                              color: "#dc3545",
                          },
                          {
                              key: "violences_physiques_p1k",
                              label: "Violences physiques",
                              color: "#007bff",
                          },
                          {
                              key: "violences_sexuelles_p1k",
                              label: "Violences sexuelles",
                              color: "#28a745",
                          },
                          { key: "vols_p1k", label: "Vols", color: "#ffc107" },
                          {
                              key: "destructions_p1k",
                              label: "Destructions et dégradations",
                              color: "#e83e8c",
                          },
                          {
                              key: "stupefiants_p1k",
                              label: "Trafic et usage de stupéfiants",
                              color: "#17a2b8",
                          },
                          {
                              key: "escroqueries_p1k",
                              label: "Escroqueries",
                              color: "#fd7e14",
                          },
                      ];

            // Create a chart for each category
            categories.forEach((category, index) => {
                // Create chart container and canvas
                const chartContainer = document.createElement("div");
                chartContainer.className = "chart-container";
                const canvas = document.createElement("canvas");
                canvas.id = `crimeChart_${index}`;
                chartContainer.appendChild(canvas);
                chartGrid.appendChild(chartContainer);

                // Calculate data for the main level
                const mainDataValues = mainData.map((row) => {
                    let value;
                    if (category.key === "homicides_p100k") {
                        value =
                            row.homicides_p100k +
                            row.tentatives_homicides_p100k;
                    } else if (category.key === "violences_physiques_p1k") {
                        value =
                            row.coups_et_blessures_volontaires_p1k +
                            row.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                            row.autres_coups_et_blessures_volontaires_p1k +
                            row.vols_avec_armes_p1k +
                            row.vols_violents_sans_arme_p1k;
                    } else if (category.key === "vols_p1k") {
                        value =
                            row.vols_avec_armes_p1k +
                            row.vols_violents_sans_arme_p1k +
                            row.vols_sans_violence_contre_des_personnes_p1k +
                            row.cambriolages_de_logement_p1k +
                            row.vols_de_vehicules_p1k +
                            row.vols_dans_les_vehicules_p1k +
                            row.vols_d_accessoires_sur_vehicules_p1k;
                    } else if (category.key === "stupefiants_p1k") {
                        value =
                            row.usage_de_stupefiants_p1k +
                            row.usage_de_stupefiants_afd_p1k +
                            row.trafic_de_stupefiants_p1k;
                    } else if (category.key === "destructions_p1k") {
                        value =
                            row.destructions_et_degradations_volontaires_p1k;
                    } else {
                        value = row[category.key];
                    }
                    return value;
                });

                // Calculate data for country level (if applicable)
                let countryDataValues = null;
                if (
                    countryData &&
                    (type === "department" || type === "commune")
                ) {
                    countryDataValues = countryData.map((row) => {
                        let value;
                        if (category.key === "homicides_p100k") {
                            value =
                                row.homicides_p100k +
                                row.tentatives_homicides_p100k;
                        } else if (category.key === "violences_physiques_p1k") {
                            value =
                                row.coups_et_blessures_volontaires_p1k +
                                row.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                row.autres_coups_et_blessures_volontaires_p1k +
                                row.vols_avec_armes_p1k +
                                row.vols_violents_sans_arme_p1k;
                        } else if (category.key === "vols_p1k") {
                            value =
                                row.vols_avec_armes_p1k +
                                row.vols_violents_sans_arme_p1k +
                                row.vols_sans_violence_contre_des_personnes_p1k +
                                row.cambriolages_de_logement_p1k +
                                row.vols_de_vehicules_p1k +
                                row.vols_dans_les_vehicules_p1k +
                                row.vols_d_accessoires_sur_vehicules_p1k;
                        } else if (category.key === "stupefiants_p1k") {
                            value =
                                row.usage_de_stupefiants_p1k +
                                row.usage_de_stupefiants_afd_p1k +
                                row.trafic_de_stupefiants_p1k;
                        } else if (category.key === "destructions_p1k") {
                            value =
                                row.destructions_et_degradations_volontaires_p1k;
                        } else {
                            value = row[category.key];
                        }
                        return Math.min(
                            value,
                            category.key === "homicides_p100k" ? 1000 : 100,
                        );
                    });
                }

                // Calculate data for department level (if commune)
                let deptDataValues = null;
                if (deptData && type === "commune") {
                    deptDataValues = deptData.map((row) => {
                        let value;
                        if (category.key === "homicides_p100k") {
                            value =
                                row.homicides_p100k +
                                row.tentatives_homicides_p100k;
                        } else if (category.key === "violences_physiques_p1k") {
                            value =
                                row.coups_et_blessures_volontaires_p1k +
                                row.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                                row.autres_coups_et_blessures_volontaires_p1k +
                                row.vols_avec_armes_p1k +
                                row.vols_violents_sans_arme_p1k;
                        } else if (category.key === "vols_p1k") {
                            value =
                                row.vols_avec_armes_p1k +
                                row.vols_violents_sans_arme_p1k +
                                row.vols_sans_violence_contre_des_personnes_p1k +
                                row.cambriolages_de_logement_p1k +
                                row.vols_de_vehicules_p1k +
                                row.vols_dans_les_vehicules_p1k +
                                row.vols_d_accessoires_sur_vehicules_p1k;
                        } else if (category.key === "stupefiants_p1k") {
                            value =
                                row.usage_de_stupefiants_p1k +
                                row.usage_de_stupefiants_afd_p1k +
                                row.trafic_de_stupefiants_p1k;
                        } else if (category.key === "destructions_p1k") {
                            value =
                                row.destructions_et_degradations_volontaires_p1k;
                        } else {
                            value = row[category.key];
                        }
                        return Math.min(
                            value,
                            category.key === "homicides_p100k" ? 1000 : 100,
                        );
                    });
                }

                console.log(
                    `${category.label} main data values:`,
                    mainDataValues,
                );
                if (countryDataValues)
                    console.log(
                        `${category.label} country data values:`,
                        countryDataValues,
                    );
                if (deptDataValues)
                    console.log(
                        `${category.label} department data values:`,
                        deptDataValues,
                    );

                // Calculate suggestedMax for y-axis
                const allValues = [...mainDataValues];
                if (countryDataValues) allValues.push(...countryDataValues);
                if (deptDataValues) allValues.push(...deptDataValues);
                const maxDataValue = Math.max(...allValues);
                const suggestedMax = Math.ceil(maxDataValue * 1.1) || 1;
                const tickPrecision = 1;

                // Determine y-axis title
                const yAxisTitle =
                    category.key === "homicides_p100k"
                        ? "Taux (pour 100k habitants)"
                        : "Taux (pour mille habitants)";

                // Prepare datasets
                const datasets = [
                    {
                        label: titleText,
                        data: mainDataValues,
                        borderColor: category.color,
                        backgroundColor: category.color,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                    },
                ];

                if (
                    countryDataValues &&
                    (type === "department" || type === "commune")
                ) {
                    datasets.push({
                        label: "France",
                        data: countryDataValues,
                        borderColor: "#808080",
                        backgroundColor: "#808080",
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                    });
                }

                if (deptDataValues && type === "commune") {
                    datasets.push({
                        label: `${dept} - ${departmentNames[dept] || dept}`,
                        data: deptDataValues,
                        borderColor: "#A9A9A9",
                        backgroundColor: "#A9A9A9",
                        borderDash: [10, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0,
                    });
                }

                // Create the chart
                new Chart(canvas, {
                    type: "line",
                    data: {
                        labels: years,
                        datasets: datasets,
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: "top",
                                labels: {
                                    font: {
                                        family: "'Roboto', Arial, sans-serif",
                                        size: 14,
                                    },
                                    color: "#343a40",
                                },
                            },
                            title: {
                                display: true,
                                text: category.label,
                                font: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 18,
                                    weight: "700",
                                },
                                color: "#343a40",
                                padding: {
                                    top: 10,
                                    bottom: 20,
                                },
                            },
                            tooltip: {
                                backgroundColor: "#fff",
                                titleColor: "#343a40",
                                bodyColor: "#343a40",
                                borderColor: "#dee2e6",
                                borderWidth: 1,
                                titleFont: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 14,
                                },
                                bodyFont: {
                                    family: "'Roboto', Arial, sans-serif",
                                    size: 12,
                                },
                                callbacks: {
                                    label: function (context) {
                                        let label = context.dataset.label || "";
                                        if (label) {
                                            label += ": ";
                                        }
                                        const unit =
                                            context.dataset.label.includes(
                                                "Homicides",
                                            )
                                                ? " (pour 100k hab.)"
                                                : " (pour mille hab.)";
                                        return (
                                            label +
                                            context.parsed.y.toFixed(
                                                tickPrecision,
                                            ) +
                                            unit
                                        );
                                    },
                                },
                            },
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: "Année",
                                    font: {
                                        family: "'Roboto', Arial, sans-serif",
                                        size: 14,
                                        weight: "600",
                                    },
                                    color: "#343a40",
                                },
                                ticks: {
                                    font: {
                                        family: "'Roboto', Arial, sans-serif",
                                        size: 12,
                                    },
                                    color: "#343a40",
                                },
                                grid: {
                                    color: "#ececec",
                                },
                            },
                            y: {
                                beginAtZero: true,
                                max: suggestedMax,
                                ticks: {
                                    font: {
                                        family: "'Roboto', Arial, sans-serif",
                                        size: 12,
                                    },
                                    color: "#343a40",
                                    callback: function (value) {
                                        return value.toFixed(tickPrecision);
                                    },
                                },
                                grid: {
                                    color: "#ececec",
                                },
                                title: {
                                    display: true,
                                    text: yAxisTitle,
                                    font: {
                                        family: "'Roboto', Arial, sans-serif",
                                        size: 14,
                                        weight: "600",
                                    },
                                    color: "#343a40",
                                },
                            },
                        },
                    },
                });
            });
        } catch (error) {
            chartGrid.innerHTML = `<p>Erreur : ${error.message}</p>`;
            console.error(
                "Erreur lors de la création des graphiques de criminalité:",
                error,
            );
        }
    }

    initCrimeCharts();
})();
