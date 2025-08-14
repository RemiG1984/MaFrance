/**
 * Centralized metrics configuration
 * Contains all metric definitions, labels, categories, formatting logic, and color scales
 * Label = description neutre
 * Alt1 = description positive (vision de gauche)
 * Alt2 = description négative (vision de droite)
 * Color scale: For metrics in metricRanges for a given level (departement or commune),
 * values below min are pure white (#ffffff), values above max are darkest red (#b10026).
 * For undefined metrics at a level, dynamic scaling is used.
 */

const MetricsConfig = {
    // Page titles for different label states
    pageTitles: {
        standard: "Ma France: état des lieux",
        alt1: "Ma France inclusive",
        alt2: "Où va ma France?",
    },

    // Version labels for different states
    versionLabels: {
        standard: "Version neutre ⚖️",
        alt1: "Version inclusive 🌈",
        alt2: "Version identitaire 🦅",
    },

    // Label state: 0 = standard, 1 = alt1, 2 = alt2
    labelState: parseInt(localStorage.getItem("metricsLabelState")) || 0,

    // Color scale configuration for all metrics
    colorScale: {
        defaultColors: [
            "#fff7c7",
            "#ffe083",
            "#ffb74d",
            "#ff8a65",
            "#e53935",
            "#b10026",
        ],
        // Define level-specific min/max values for metrics
        // Values below min are pure white (#ffffff), values above max are darkest red (#b10026)
        metricRanges: {
            departement: {
                total_score: { min: 40, max: 150 },
                population: { min: 100000, max: 2000000 },
                insecurite_score: { min: 40, max: 150 },
                homicides_total_p100k: { min: 1, max: 15 },
                violences_physiques_p1k: { min: 6, max: 15 },
                violences_sexuelles_p1k: { min: 1.2, max: 2.5 },
                vols_p1k: { min: 6, max: 40 },
                destructions_p1k: { min: 4, max: 11 },
                stupefiants_p1k: { min: 2, max: 20 },
                escroqueries_p1k: { min: 3, max: 8 },
                immigration_score: { min: 40, max: 150 },
                extra_europeen_pct: { min: 5, max: 50 },
                Total_places_migrants: { min: 100, max: 3000 },
                places_migrants_p1k: { min: 0.6, max: 3 },
                islamisation_score: { min: 40, max: 150 },
                musulman_pct: { min: 2, max: 40 },
                number_of_mosques: { min: 1, max: 70 },
                mosque_p100k: { min: 0.5, max: 7 },
                defrancisation_score: {min: 40, max: 150 },
                prenom_francais_pct: { min: 20, max: 70, invert: true },
                wokisme_score: { min: 40, max: 150 },
                total_qpv: { min: 1, max: 70 },
                pop_in_qpv_pct: { min: 1.5, max: 20 },
                logements_sociaux_pct: { min: 5, max: 30 },
                total_subventions_parHab: { min: 20, max: 100 },
            },
            commune: {
                total_score: { min: 40, max: 150 },
                population: { min: 500, max: 100000 },
                insecurite_score: { min: 40, max: 150 },
                homicides_total_p100k: { min: 1, max: 15 },
                violences_physiques_p1k: { min: 3, max: 15 },
                violences_sexuelles_p1k: { min: 1.2, max: 2.5 },
                vols_p1k: { min: 6, max: 40 },
                destructions_p1k: { min: 4, max: 11 },
                stupefiants_p1k: { min: 2, max: 20 },
                escroqueries_p1k: { min: 2, max: 10 },
                immigration_score: {min: 40, max: 150 },
                extra_europeen_pct: { min: 5, max: 50 },
                Total_places_migrants: { min: 10, max: 500 },
                places_migrants_p1k: { min: 0.6, max: 3 },
                islamisation_score: { min: 40, max: 150 },
                musulman_pct: { min: 2, max: 40 },
                number_of_mosques: { min: 1, max: 5 },
                mosque_p100k: { min: 1, max: 7 },
                defrancisation_score: { min: 40, max: 150 },
                prenom_francais_pct: { min: 20, max: 70, invert: true },
                wokisme_score: { min: 40, max: 150 },
                total_qpv: { min: 0.5, max: 3 },
                pop_in_qpv_pct: { min: 1.5, max: 20 },
                logements_sociaux_pct: { min: 5, max: 30 },
                total_subventions_parHab: { min: 5, max: 100 },
            },
        },
    },

    // All available metrics with their properties, in order of appearance within each category in ScoreTable
    metrics: [
        {
            value: "total_score",
            label: "Indice de changement général",
            alt1Label: "Indice général d'évolution inclusive",
            alt2Label: "Indice de fragmentation nationale",
            category: "général",
            format: "score",
            source: "details",
        },
        {
            value: "population",
            label: "Population",
            alt1Label: "Population",
            alt2Label: "Population",
            category: "général",
            format: "number",
            source: "details",
        },
        // Insécurité category
        {
            value: "insecurite_score",
            label: "Indice d'insécurité",
            alt1Label: "Indice de répression policière",
            alt2Label: "Indice d'insécurité",
            category: "insécurité",
            format: "score",
            source: "details",
        },
        {
            value: "homicides_total_p100k",
            label: "Homicides et tentatives /100k hab.",
            alt1Label: "Homicides et tentatives /100k hab.",
            alt2Label: "Homicides et tentatives /100k hab.",
            category: "insécurité",
            format: "rate_100k",
            source: "crime",
        },
        {
            value: "violences_physiques_p1k",
            label: "Violences physiques /1k hab.",
            alt1Label: "Communication corporelle musclée /1k hab.",
            alt2Label: "Agressions brutales /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        {
            value: "violences_sexuelles_p1k",
            label: "Violences sexuelles /1k hab.",
            alt1Label: "Libération de la parole /1k hab.",
            alt2Label: "Violences sexuelles /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        {
            value: "vols_p1k",
            label: "Vols /1k hab.",
            alt1Label: "Redistribution spontanée /1k hab.",
            alt2Label: "Pillages /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        {
            value: "destructions_p1k",
            label: "Destructions et dégradations /1k hab.",
            alt1Label: "Déconstruction créative /1k hab.",
            alt2Label: "Vandalisme /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        {
            value: "stupefiants_p1k",
            label: "Trafic et usage de stupéfiants /1k hab.",
            alt1Label: "Répression narcotique /1k hab.",
            alt2Label: "Trafic de drogues /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        {
            value: "escroqueries_p1k",
            label: "Escroqueries /1k hab.",
            alt1Label: "Astuces économiques /1k hab.",
            alt2Label: "Escroqueries /1k hab.",
            category: "insécurité",
            format: "rate_1k",
            source: "crime",
        },
        // Immigration category
        {
            value: "immigration_score",
            label: "Indice d'immigration",
            alt1Label: "Indice de créolisation",
            alt2Label: "Indice de grand remplacement",
            category: "immigration",
            format: "score",
            source: "details",
        },
        {
            value: "extra_europeen_pct",
            label: "Prénoms de naissance extra-européen (%)",
            alt1Label: "Prénoms exotiques (%)",
            alt2Label: "Prénoms allogènes (%)",
            category: "immigration",
            format: "percentage",
            source: "names",
        },
        {
            value: "Total_places_migrants",
            label: "Places en centre d'hébergement pour clandestin",
            alt1Label: "Places en centre d'hébergement pour migrant",
            alt2Label: "Places en centre d'hébergement pour colon",
            category: "immigration",
            format: "number",
            source: "details",
        },
        {
            value: "places_migrants_p1k",
            label: "Places en centre d'hébergement pour clandestin /1k hab",
            alt1Label: "Places en centre d'hébergement pour migrant /1k hab",
            alt2Label: "Places en centre d'hébergement pour colon /1k hab",
            category: "immigration",
            format: "rate_1k",
            source: "details",
        },
        // Islamisme category
        {
            value: "islamisation_score",
            label: "Indice de progression de l'Islam",
            alt1Label: "Indice d'enrichissement spirituel",
            alt2Label: "Indice d'islamisation",
            category: "islamisme",
            format: "score",
            source: "details",
        },
        {
            value: "musulman_pct",
            label: "Prénoms d'origine arabo-musulmane (%)",
            alt1Label: "Prénoms orientaux (%)",
            alt2Label: "Prénoms islamiques (%)",
            category: "islamisme",
            format: "percentage",
            source: "names",
        },
        {
            value: "number_of_mosques",
            label: "Nombre de mosquées",
            alt1Label: "Lieux de culte musulman",
            alt2Label: "Nombre de mosquées",
            category: "islamisme",
            format: "number",
            source: "details",
        },
        {
            value: "mosque_p100k",
            label: "Nombre de Mosquées /100k hab.",
            alt1Label: "Densité des lieux de culte musulman /100k hab.",
            alt2Label: "Nombre de Mosquées /100k hab.",
            category: "islamisme",
            format: "rate_100k",
            source: "details",
        },
        // Défrancisation category
        {
            value: "defrancisation_score",
            label: "Indice d'évolution culturelle",
            alt1Label: "Indice de dépoussiérage culturel",
            alt2Label: "Indice de défrancisation (petit remplacement)",
            category: "défrancisation",
            format: "score",
            source: "details",
        },
        {
            value: "prenom_francais_pct",
            label: "Prénoms de naissance français (%)",
            alt1Label: "Prénoms franchouillards résiduels (%)",
            alt2Label: "Prénoms de naissance français (%)",
            category: "défrancisation",
            format: "percentage",
            source: "names",
        },
        // Wokisme category
        {
            value: "wokisme_score",
            label: "Indice d'interventionnisme social",
            alt1Label: "Indice de progressisme",
            alt2Label: "Indice de wokisme",
            category: "wokisme",
            format: "score",
            source: "details",
        },
        {
            value: "total_qpv",
            label: "Nombre de QPV",
            alt1Label: "Quartiers prioritaires (QPV)",
            alt2Label: "Quartiers à éviter (QPV)",
            category: "wokisme",
            format: "number",
            source: "details",
        },
        {
            value: "pop_in_qpv_pct",
            label: "% Pop. en QPV",
            alt1Label: "% Pop. en zones défavorisées (QPV)",
            alt2Label: "% Pop. en quartiers perdus (QPV)",
            category: "wokisme",
            format: "percentage",
            source: "details",
        },
        {
            value: "logements_sociaux_pct",
            label: "% Logements sociaux",
            alt1Label: "% Logements sociaux",
            alt2Label: "% Logements sociaux",
            category: "wokisme",
            format: "percentage",
            source: "details",
        },
        {
            value: "total_subventions_parHab",
            label: "Subventions aux associations /hab/an",
            alt1Label: "Subventions aux associations /hab/an",
            alt2Label: "Subventions aux associations /hab/an",
            category: "wokisme",
            format: "currency",
            source: "details",
        },
    ],

    // Article categories mapping
    articleCategories: [
        {
            name: "Insécurité",
            key: "insecurite",
        },
        {
            name: "Immigration",
            key: "immigration",
        },
        {
            name: "Islamisme",
            key: "islamisme",
        },
        {
            name: "Défrancisation",
            key: "defrancisation",
        },
        {
            name: "Wokisme",
            key: "wokisme",
        },
    ],

    // Calculated metrics definitions (for complex calculations)
    calculatedMetrics: {
        // Total score calculation
        total_score: {
            formula: (data) =>
                Math.round(
                    (data.insecurite_score +
                        data.immigration_score +
                        data.islamisation_score +
                        data.defrancisation_score +
                        data.wokisme_score) /
                        5,
                ),
            components: [
                "insecurite_score",
                "immigration_score",
                "islamisation_score",
                "defrancisation_score",
                "wokisme_score",
            ],
        },

        // Extra-European percentage calculation
        extra_europeen_pct: {
            formula: (data) =>
                Math.round(
                    data.musulman_pct + data.africain_pct + data.asiatique_pct,
                ),
            components: ["musulman_pct", "africain_pct", "asiatique_pct"],
        },

        // French names percentage calculation
        prenom_francais_pct: {
            formula: (data) =>
                Math.round(data.traditionnel_pct + data.moderne_pct),
            components: ["traditionnel_pct", "moderne_pct"],
        },

        // Total physical violence calculation
        violences_physiques_p1k: {
            formula: (data) =>
                data.coups_et_blessures_volontaires_p1k +
                data.coups_et_blessures_volontaires_intrafamiliaux_p1k +
                data.autres_coups_et_blessures_volontaires_p1k +
                data.vols_avec_armes_p1k +
                data.vols_violents_sans_arme_p1k,
            components: [
                "coups_et_blessures_volontaires_p1k",
                "coups_et_blessures_volontaires_intrafamiliaux_p1k",
                "autres_coups_et_blessures_volontaires_p1k",
                "vols_avec_armes_p1k",
                "vols_violents_sans_arme_p1k",
            ],
        },

        // Total homicides calculation
        homicides_total_p100k: {
            formula: (data) =>
                data.homicides_p100k + data.tentatives_homicides_p100k,
            components: ["homicides_p100k", "tentatives_homicides_p100k"],
        },

        // Total theft calculation
        vols_p1k: {
            formula: (data) =>
                data.vols_avec_armes_p1k +
                data.vols_violents_sans_arme_p1k +
                data.vols_sans_violence_contre_des_personnes_p1k +
                data.cambriolages_de_logement_p1k +
                data.vols_de_vehicules_p1k +
                data.vols_dans_les_vehicules_p1k +
                data.vols_d_accessoires_sur_vehicules_p1k,
            components: [
                "vols_avec_armes_p1k",
                "vols_violents_sans_arme_p1k",
                "vols_sans_violence_contre_des_personnes_p1k",
                "cambriolages_de_logement_p1k",
                "vols_de_vehicules_p1k",
                "vols_dans_les_vehicules_p1k",
                "vols_d_accessoires_sur_vehicules_p1k",
            ],
        },

        // Total drug-related crimes calculation
        stupefiants_p1k: {
            formula: (data) =>
                data.usage_de_stupefiants_p1k +
                data.usage_de_stupefiants_afd_p1k +
                data.trafic_de_stupefiants_p1k,
            components: [
                "usage_de_stupefiants_p1k",
                "usage_de_stupefiants_afd_p1k",
                "trafic_de_stupefiants_p1k",
            ],
        },

        // Non-calculated metrics
        violences_sexuelles_p1k: {
            formula: (data) => data.violences_sexuelles_p1k,
            components: ["violences_sexuelles_p1k"],
        },
        destructions_p1k: {
            formula: (data) =>
                data.destructions_et_degradations_volontaires_p1k,
            components: ["destructions_et_degradations_volontaires_p1k"],
        },
    },

    // Data availability by geographic level
    dataAvailability: {
        country: [
            "total_score",
            "population",
            "insecurite_score",
            "homicides_total_p100k",
            "violences_physiques_p1k",
            "violences_sexuelles_p1k",
            "vols_p1k",
            "destructions_p1k",
            "stupefiants_p1k",
            "escroqueries_p1k",
            "immigration_score",
            "extra_europeen_pct",
            "islamisation_score",
            "musulman_pct",
            "number_of_mosques",
            "mosque_p100k",
            "defrancisation_score",
            "prenom_francais_pct",
            "wokisme_score",
            "total_qpv",
            "pop_in_qpv_pct",
            "logements_sociaux_pct",
            "total_subventions_parHab",
            "Total_places_migrants",
            "places_migrants_p1k",
        ],
        departement: [
            "total_score",
            "population",
            "insecurite_score",
            "homicides_total_p100k",
            "violences_physiques_p1k",
            "violences_sexuelles_p1k",
            "vols_p1k",
            "destructions_p1k",
            "stupefiants_p1k",
            "escroqueries_p1k",
            "immigration_score",
            "extra_europeen_pct",
            "islamisation_score",
            "musulman_pct",
            "number_of_mosques",
            "mosque_p100k",
            "defrancisation_score",
            "prenom_francais_pct",
            "wokisme_score",
            "total_qpv",
            "pop_in_qpv_pct",
            "logements_sociaux_pct",
            "total_subventions_parHab",
            "Total_places_migrants",
            "places_migrants_p1k",
        ],
        commune: [
            "total_score",
            "population",
            "insecurite_score",
            "violences_physiques_p1k",
            "violences_sexuelles_p1k",
            "vols_p1k",
            "destructions_p1k",
            "stupefiants_p1k",
            "escroqueries_p1k",
            "immigration_score",
            "islamisation_score",
            "number_of_mosques",
            "mosque_p100k",
            "defrancisation_score",
            "wokisme_score",
            "total_qpv",
            "pop_in_qpv_pct",
            "logements_sociaux_pct",
            "total_subventions_parHab",
            "Total_places_migrants",
            "places_migrants_p1k",
        ],
    },

    // Utility functions
    getMetricByValue(value) {
        return this.metrics.find((metric) => metric.value === value);
    },

    getMetricLabel(value) {
        const metric = this.getMetricByValue(value);
        if (!metric) return value;

        switch (this.labelState) {
            case 1:
                return metric.alt1Label || metric.label;
            case 2:
                return metric.alt2Label || metric.label;
            default:
                return metric.label;
        }
    },

    getMetricsByCategory(category) {
        return this.metrics.filter((metric) => metric.category === category);
    },

    calculateMetric(metricKey, data) {
        const calculation = this.calculatedMetrics[metricKey];
        if (calculation && calculation.formula) {
            return calculation.formula(data);
        }
        return data[metricKey];
    },

    getMetricOptions() {
        return this.metrics.map((metric) => ({
            value: metric.value,
            label: this.getMetricLabel(metric.value),
        }));
    },

    cycleLabelState() {
        this.labelState = (this.labelState + 1) % 3;
        localStorage.setItem("metricsLabelState", this.labelState.toString());
        window.dispatchEvent(
            new CustomEvent("metricsLabelsToggled", {
                detail: { labelState: this.labelState },
            }),
        );
    },

    getLabelStateName() {
        switch (this.labelState) {
            case 1:
                return "alt1";
            case 2:
                return "alt2";
            default:
                return "standard";
        }
    },

    getCurrentPageTitle() {
        const stateName = this.getLabelStateName();
        return this.pageTitles[stateName];
    },

    getCurrentVersionLabel() {
        const stateName = this.getLabelStateName();
        return this.versionLabels[stateName];
    },

    initializeVersionDropdown() {
        const versionDropdown = document.querySelector(".version-dropdown");
        const versionToggle = document.querySelector(".version-toggle");
        const versionMenu = document.querySelector(".version-menu");

        if (!versionDropdown || versionDropdown.dataset.initialized) return;

        versionDropdown.dataset.initialized = "true";

        const versionText = versionToggle.querySelector(".version-text");
        if (versionText) {
            versionText.textContent = this.getCurrentVersionLabel();
        }

        versionToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            versionMenu.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!versionDropdown.contains(e.target)) {
                versionMenu.classList.remove("active");
            }
        });

        const versionOptions = versionMenu.querySelectorAll(".version-option");
        versionOptions.forEach((option, index) => {
            option.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                this.labelState = index;
                localStorage.setItem(
                    "metricsLabelState",
                    this.labelState.toString(),
                );

                if (versionText) {
                    versionText.textContent = this.getCurrentVersionLabel();
                }

                versionMenu.classList.remove("active");
                document.title = this.getCurrentPageTitle();

                const headerH1 = document.querySelector("h1");
                if (headerH1) {
                    headerH1.textContent = this.getCurrentPageTitle();
                }

                window.dispatchEvent(
                    new CustomEvent("metricsLabelsToggled", {
                        detail: { labelState: this.labelState },
                    }),
                );
            });
        });
    },

    isMetricAvailable(metricKey, level) {
        return (
            this.dataAvailability[level] &&
            this.dataAvailability[level].includes(metricKey)
        );
    },

    getAvailableMetrics(level) {
        return this.dataAvailability[level] || [];
    },

    getAvailableMetricOptions(level) {
        const availableMetrics = this.getAvailableMetrics(level);
        return this.metrics
            .filter((metric) => availableMetrics.includes(metric.value))
            .map((metric) => ({
                value: metric.value,
                label: this.getMetricLabel(metric.value),
            }));
    },

    extractDataForLevel(sourceData, level, additionalFields = []) {
        const availableMetrics = this.getAvailableMetrics(level);
        const result = {};

        const basicFields = ["population", "commune", "departement", "COG"];
        [...basicFields, ...availableMetrics, ...additionalFields].forEach(
            (field) => {
                if (sourceData.hasOwnProperty(field)) {
                    result[field] = sourceData[field];
                }
            },
        );

        return result;
    },

    formatMetricValue(value, metricKey) {
        if (value == null || isNaN(value)) return "N/A";

        const metric = this.getMetricByValue(metricKey);
        const format = metric ? metric.format : "number";

        switch (format) {
            case "percentage":
                return `${value.toFixed(0)}%`;
            case "score":
                return value.toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                });
            case "rate_100k":
                return value.toFixed(1);
            case "rate_1k":
                return value.toFixed(1);
            case "currency":
                return value.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                });
            case "number":
                return value.toLocaleString("fr-FR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                });
            default:
                return value.toString();
        }
    },

    // Get color scale configuration for a metric at a specific level
    getMetricColorScale(metricKey, level) {
        if (
            this.colorScale.metricRanges[level] &&
            this.colorScale.metricRanges[level].hasOwnProperty(metricKey)
        ) {
            const range = this.colorScale.metricRanges[level][metricKey];
            return {
                colors: this.colorScale.defaultColors,
                min: range.min,
                max: range.max,
                invert: range.invert || false,
                useFixedRange: true,
            };
        }
        // Return default config for dynamic scaling
        return {
            colors: this.colorScale.defaultColors,
            min: 0,
            max: 100,
            invert: false,
            useFixedRange: false,
        };
    },
};

const chartLabels = {};
for (let metric of MetricsConfig.metrics) {
    chartLabels[metric.value] = metric;
}

const articleCategoriesRef = {};
for (let articleCategory of MetricsConfig.articleCategories) {
    articleCategoriesRef[articleCategory.key] = articleCategory.name;
}

export { chartLabels, MetricsConfig, articleCategoriesRef };
