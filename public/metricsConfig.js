/**
 * Centralized metrics configuration
 * Contains all metric definitions, labels, categories, and formatting logic
 * Label = description neutre
 * Alt1 = description positive (vision de gauche)
 * Alt2 = description négative (vision de droite)
 */

export const MetricsConfig = {
    // Page titles for different label states
    pageTitles: {
        standard: "Changements sociaux en France",
        alt1: "Notre France Inclusive",
        alt2: "Où va ma France?"
    },

    // Label state: 0 = standard, 1 = alt1, 2 = alt2
    labelState: 0,

    // All available metrics with their properties
    metrics: [
        {
            value: "total_score",
            label: "Indice de changement global",
            alt1Label: "Indice d'évolution inclusive",
            alt2Label: "Indice de fragmentation nationale",
            category: "général",
            format: "score",
        },
        // Insécurité category
        {
            value: "insecurite_score",
            label: "Indice d'insécurité",
            alt1Label: "Indice de répression policière",
            alt2Label: "Indice de désordre public",
            category: "insécurité",
            format: "score",
        },
        {
            value: "homicides_p100k",
            label: "Homicides et tentatives (pour 100k hab.)",
            alt1Label: "Homicides et tentatives (pour 100k hab.)",
            alt2Label: "Homicides et tentatives (pour 100k hab.)",
            category: "insécurité",
            format: "rate_100k",
        },
        {
            value: "violences_physiques_p1k",
            label: "Violences physiques (pour mille hab.)",
            alt1Label: "Communication corporelle (pour mille hab.)",
            alt2Label: "Agressions brutales (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "violences_sexuelles_p1k",
            label: "Violences sexuelles (pour mille hab.)",
            alt1Label: "Amour non consenti (pour mille hab.)",
            alt2Label: "Violences sexuelles (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "vols_p1k",
            label: "Vols (pour mille hab.)",
            alt1Label: "Redistribution spontanée (pour mille hab.)",
            alt2Label: "Pillages (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "destructions_p1k",
            label: "Destruction et dégradations (pour mille hab.)",
            alt1Label: "Déconstruction créative (pour mille hab.)",
            alt2Label: "Vandalisme (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "stupefiants_p1k",
            label: "Trafic et usage de stupéfiants (pour mille hab.)",
            alt1Label: "Répression narcotique (pour mille hab.)",
            alt2Label: "Trafic de drogues (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "escroqueries_p1k",
            label: "Escroqueries (pour mille hab.)",
            alt1Label: "Astuces économiques (pour mille hab.)",
            alt2Label: "Escroqueries (pour mille hab.)",
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
            label: "Indice de diversité spirituelle",
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
            label: "Nombre de Mosquées (pour 100k hab.)",
            alt1Label: "Densité des lieux de culte musulman (pour 100k hab.)",
            alt2Label: "Nombre de Mosquées (pour 100k hab.)",
            category: "islamisme",
            format: "rate_100k",
        },
        // Défrancisation category
        {
            value: "defrancisation_score",
            label: "Indice d'évolution culturelle",
            alt1Label: "Indice de dépoussiérage culturel",
            alt2Label: "Indice de défrancisation",
            category: "défrancisation",
            format: "score",
        },
        {
            value: "prenom_francais_pct",
            label: "Prénoms de naissance français (%)",
            alt1Label: "Prénoms français résiduels (%)",
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
};
