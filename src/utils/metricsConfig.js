/**
 * Centralized metrics configuration
 * Contains all metric definitions, labels, categories, and formatting logic
 * Label = description neutre
 * Alt1 = description positive (vision de gauche)
 * Alt2 = description négative (vision de droite)
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
    labelState: parseInt(localStorage.getItem('metricsLabelState')) || 0,

    // All available metrics with their properties
    metrics: [
        {
            value: "total_score",
            label: "Indice de changement général",
            alt1Label: "Indice général d'évolution inclusive",
            alt2Label: "Indice de fragmentation nationale",
            category: "général",
            format: "score",
        },
        // Insécurité category
        {
            value: "insecurite_score",
            label: "Indice d'insécurité",
            alt1Label: "Indice de répression policière",
            alt2Label: "Indice d'insécurité",
            category: "insécurité",
            format: "score",
        },
        {
            value: "homicides_p100k",
            label: "Homicides /100k hab.",
            alt1Label: "Homicides /100k hab.",
            alt2Label: "Homicides /100k hab.",
            category: "insécurité",
            format: "rate_100k",
        },
        {
            value: "homicides_total_p100k",
            label: "Homicides et tentatives /100k hab.",
            alt1Label: "Homicides et tentatives /100k hab.",
            alt2Label: "Homicides et tentatives /100k hab.",
            category: "insécurité",
            format: "rate_100k",
        },
        {
            value: "violences_physiques_p1k",
            label: "Violences physiques /1k hab.",
            alt1Label: "Communication corporelle musclée /1k hab.",
            alt2Label: "Agressions brutales /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "violences_sexuelles_p1k",
            label: "Violences sexuelles /1k hab.",
            alt1Label: "Libération de la parole /1k hab.",
            alt2Label: "Violences sexuelles /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "vols_p1k",
            label: "Vols /1k hab.",
            alt1Label: "Redistribution spontanée /1k hab.",
            alt2Label: "Pillages /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "destructions_p1k",
            label: "Destructions et dégradations /1k hab.",
            alt1Label: "Déconstruction créative /1k hab.",
            alt2Label: "Vandalisme /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "stupefiants_p1k",
            label: "Trafic et usage de stupéfiants /1k hab.",
            alt1Label: "Répression narcotique /1k hab.",
            alt2Label: "Trafic de drogues /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "escroqueries_p1k",
            label: "Escroqueries /1k hab.",
            alt1Label: "Astuces économiques /1k hab.",
            alt2Label: "Escroqueries /1k hab.",
            category: "insécurité",
            format: "rate_1k",
        },
        // Immigration category
        {
            value: "immigration_score",
            label: "Indice d'immigration",
            alt1Label: "Indice de créolisation",
            alt2Label: "Indice de grand remplacement",
            category: "immigration",
            format: "score",
        },
        {
            value: "extra_europeen_pct",
            label: "Prénoms de naissance extra-européen (%)",
            alt1Label: "Prénoms exotiques (%)",
            alt2Label: "Prénoms allogènes (%)",
            category: "immigration",
            format: "percentage",
        },
        // Islamisme category
        {
            value: "islamisation_score",
            label: "Indice de progression de l'Islam",
            alt1Label: "Indice d'enrichissement spirituel",
            alt2Label: "Indice d'islamisation",
            category: "islamisme",
            format: "score",
        },
        {
            value: "musulman_pct",
            label: "Prénoms d'origine arabo-musulmane (%)",
            alt1Label: "Prénoms orientaux (%)",
            alt2Label: "Prénoms islamiques (%)",
            category: "islamisme",
            format: "percentage",
        },
        {
            value: "number_of_mosques",
            label: "Nombre de mosquées",
            alt1Label: "Lieux de culte musulman",
            alt2Label: "Nombre de mosquées",
            category: "islamisme",
            format: "number",
        },
        {
            value: "mosque_p100k",
            label: "Nombre de Mosquées /100k hab.",
            alt1Label: "Densité des lieux de culte musulman /100k hab.",
            alt2Label: "Nombre de Mosquées /100k hab.",
            category: "islamisme",
            format: "rate_100k",
        },
        // Défrancisation category
        {
            value: "defrancisation_score",
            label: "Indice d'évolution culturelle",
            alt1Label: "Indice de dépoussiérage culturel",
            alt2Label: "Indice de défrancisation (petit remplacement)",
            category: "défrancisation",
            format: "score",
        },
        {
            value: "prenom_francais_pct",
            label: "Prénoms de naissance français (%)",
            alt1Label: "Prénoms franchouillards résiduels (%)",
            alt2Label: "Prénoms de naissance français (%)",
            category: "défrancisation",
            format: "percentage",
        },
        // Wokisme category
        {
            value: "wokisme_score",
            label: "Indice d'interventionnisme social",
            alt1Label: "Indice de progressisme",
            alt2Label: "Indice de wokisme",
            category: "wokisme",
            format: "score",
        },
        {
            value: "total_qpv",
            label: "Nombre de QPV",
            alt1Label: "Quartiers prioritaires (QPV)",
            alt2Label: "Quartiers à éviter (QPV)",
            category: "wokisme",
            format: "number",
        },
        {
            value: "pop_in_qpv_pct",
            label: "% Pop. en QPV",
            alt1Label: "% Pop. en zones défavorisées (QPV)",
            alt2Label: "% Pop. en quartiers perdus (QPV)",
            category: "wokisme",
            format: "percentage",
        },
        {
            value: "logements_sociaux_pct",
            label: "% Logements sociaux",
            alt1Label: "% Logements sociaux",
            alt2Label: "% Logements sociaux",
            category: "wokisme",
            format: "percentage",
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
        // Extra-European percentage calculation
        extra_europeen_pct: {
            formula: (data) =>
                Math.round(
                    data.musulman_pct + data.africain_pct + data.asiatique_pct,
                ),
            components: ["musulman_pct", "africain_pct", "asiatique_pct"],
        },

        // French names percentage calculation
        prenom_francais_total: {
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
    },

    // Data availability by geographic level
    dataAvailability: {
        france: [
            "total_score",
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
        ],
        departement: [
            "total_score",
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
        ],
        commune: [
            "total_score",
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

    // Calculate a metric if it's a calculated one
    calculateMetric(metricKey, data) {
        const calculation = this.calculatedMetrics[metricKey];
        if (calculation && calculation.formula) {
            return calculation.formula(data);
        }
        return data[metricKey];
    },

    // Get all metrics as options for dropdowns
    getMetricOptions() {
        return this.metrics.map((metric) => ({
            value: metric.value,
            label: this.getMetricLabel(metric.value),
        }));
    },

    // Cycle between label states (0 -> 1 -> 2 -> 0)
    cycleLabelState() {
        this.labelState = (this.labelState + 1) % 3;
        // Save to localStorage
        localStorage.setItem('metricsLabelState', this.labelState.toString());
        // Dispatch event to notify components of the change
        window.dispatchEvent(
            new CustomEvent("metricsLabelsToggled", {
                detail: { labelState: this.labelState },
            }),
        );
    },

    // Get current label state name
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

    // Get current page title
    getCurrentPageTitle() {
        const stateName = this.getLabelStateName();
        return this.pageTitles[stateName];
    },

    // Get current version label
    getCurrentVersionLabel() {
        const stateName = this.getLabelStateName();
        return this.versionLabels[stateName];
    },

    // Initialize version dropdown (prevents multiple event listeners)
    initializeVersionDropdown() {
        const versionDropdown = document.querySelector('.version-dropdown');
        const versionToggle = document.querySelector('.version-toggle');
        const versionMenu = document.querySelector('.version-menu');
        
        if (!versionDropdown || versionDropdown.dataset.initialized) return;
        
        // Mark as initialized to prevent multiple event listeners
        versionDropdown.dataset.initialized = "true";
        
        // Set initial version text
        const initialStateName = this.getLabelStateName();
        const versionText = versionToggle.querySelector('.version-text');
        if (versionText) {
            versionText.textContent = this.getCurrentVersionLabel();
        }
        
        // Toggle dropdown menu visibility
        versionToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            versionMenu.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!versionDropdown.contains(e.target)) {
                versionMenu.classList.remove('active');
            }
        });
        
        // Add click listeners to version options
        const versionOptions = versionMenu.querySelectorAll('.version-option');
        versionOptions.forEach((option, index) => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Set label state based on clicked option
                this.labelState = index;
                // Save to localStorage
                localStorage.setItem('metricsLabelState', this.labelState.toString());
                
                // Update version text
                const stateName = this.getLabelStateName();
                if (versionText) {
                    versionText.textContent = this.getCurrentVersionLabel();
                }
                
                // Close dropdown
                versionMenu.classList.remove('active');
                
                // Update page title
                document.title = this.getCurrentPageTitle();
                
                // Update header h1 if exists
                const headerH1 = document.querySelector('h1');
                if (headerH1) {
                    headerH1.textContent = this.getCurrentPageTitle();
                }
                
                // Dispatch event to notify components of the change
                window.dispatchEvent(
                    new CustomEvent("metricsLabelsToggled", {
                        detail: { labelState: this.labelState },
                    }),
                );
            });
        });
    },

    // Check if a metric is available at a specific geographic level
    isMetricAvailable(metricKey, level) {
        return (
            this.dataAvailability[level] &&
            this.dataAvailability[level].includes(metricKey)
        );
    },

    // Get available metrics for a specific geographic level
    getAvailableMetrics(level) {
        return this.dataAvailability[level] || [];
    },

    // Get available metric options for dropdowns filtered by geographic level
    getAvailableMetricOptions(level) {
        const availableMetrics = this.getAvailableMetrics(level);
        return this.metrics
            .filter((metric) => availableMetrics.includes(metric.value))
            .map((metric) => ({
                value: metric.value,
                label: this.getMetricLabel(metric.value),
            }));
    },

    // Extract and map data fields for a specific geographic level
    extractDataForLevel(sourceData, level, additionalFields = []) {
        const availableMetrics = this.getAvailableMetrics(level);
        const result = {};

        // Always include basic fields
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

    // Format metric values based on their format property
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
            case "number":
                return value.toString();
            default:
                return value.toString();
        }
    },
}

const chartLabels = {}

for(let metric of MetricsConfig.metrics) {
    chartLabels[metric.value] = metric
}

const articleCategoriesRef = {}

for(let articleCategory of MetricsConfig.articleCategories) {
    articleCategoriesRef[articleCategory.key] = articleCategory.name
}

export { chartLabels, MetricsConfig, articleCategoriesRef }