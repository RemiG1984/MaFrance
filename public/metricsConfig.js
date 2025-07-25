/**
 * Centralized metrics configuration
 * Contains all metric definitions, labels, categories, and formatting logic
 */

export const MetricsConfig = {
    // All available metrics with their properties
    metrics: [
        {
            value: "total_score",
            label: "Score Total",
            category: "general",
            format: "score",
        },
        // Insécurité category
        {
            value: "insecurite_score",
            label: "Score Insécurité",
            category: "insécurité",
            format: "score",
        },
        {
            value: "homicides_p100k",
            label: "Homicides et tentatives (pour 100k hab.)",
            category: "insécurité",
            format: "rate_100k",
        },
        {
            value: "violences_physiques_p1k",
            label: "Violences physiques (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "violences_sexuelles_p1k",
            label: "Violences sexuelles (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "vols_p1k",
            label: "Vols (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "destructions_p1k",
            label: "Destruction et dégradations (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "stupefiants_p1k",
            label: "Trafic et usage de stupéfiants (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "escroqueries_p1k",
            label: "Escroqueries (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        // Immigration category
        {
            value: "immigration_score",
            label: "Score Immigration",
            category: "immigration",
            format: "score",
        },
        {
            value: "extra_europeen_pct",
            label: "Prénoms de naissance extra-européen (%)",
            category: "immigration",
            format: "percentage",
        },
        // Islamisme category
        {
            value: "islamisation_score",
            label: "Score Islamisation",
            category: "islamisme",
            format: "score",
        },
        {
            value: "musulman_pct",
            label: "Prénoms de naissance musulmans (%)",
            category: "islamisme",
            format: "percentage",
        },
        {
            value: "number_of_mosques",
            label: "Nombre de Mosquées",
            category: "islamisme",
            format: "number",
        },
        {
            value: "mosque_p100k",
            label: "Nombre de Mosquées (pour 100k hab.)",
            category: "islamisme",
            format: "rate_100k",
        },
        // Défrancisation category
        {
            value: "defrancisation_score",
            label: "Score Défrancisation",
            category: "défrancisation",
            format: "score",
        },
        {
            value: "prenom_francais_pct",
            label: "Prénoms de naissance français (%)",
            category: "défrancisation",
            format: "percentage",
        },
        // Wokisme category
        {
            value: "wokisme_score",
            label: "Score Wokisme",
            category: "wokisme",
            format: "score",
        },
        {
            value: "total_qpv",
            label: "Nombre de QPV",
            category: "wokisme",
            format: "number",
        },
        {
            value: "pop_in_qpv_pct",
            label: "% Population en QPV",
            category: "wokisme",
            format: "percentage",
        },
    ],

    // Article categories mapping
    articleCategories: [
        {
            name: "Insécurité",
            key: "insecurite",
            relatedMetrics: [
                "insecurite_score",
                "homicides_p100k",
                "violences_physiques_p1k",
                "violences_sexuelles_p1k",
                "vols_p1k",
                "destructions_p1k",
                "stupefiants_p1k",
                "escroqueries_p1k",
            ],
        },
        {
            name: "Immigration",
            key: "immigration",
            relatedMetrics: ["immigration_score", "extra_europeen_pct"],
        },
        {
            name: "Islamisme",
            key: "islamisme",
            relatedMetrics: [
                "islamisation_score",
                "musulman_pct",
                "number_of_mosques",
                "mosque_p100k",
            ],
        },
        {
            name: "Défrancisation",
            key: "defrancisation",
            relatedMetrics: ["defrancisation_score", "prenom_francais_pct"],
        },
        {
            name: "Wokisme",
            key: "wokisme",
            relatedMetrics: ["wokisme_score", "total_qpv", "pop_in_qpv_pct"],
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
        return metric ? metric.label : value;
    },

    getMetricsByCategory(category) {
        return this.metrics.filter((metric) => metric.category === category);
    },

    getArticleCategoryByKey(key) {
        return this.articleCategories.find((cat) => cat.key === key);
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
            label: metric.label,
        }));
    },

    // Get article categories as options
    getArticleCategoryOptions() {
        return this.articleCategories.map((category) => ({
            value: category.key,
            label: category.name,
        }));
    },

    // Format metric values based on their format property
    formatMetricValue(value, metricKey) {
        if (value == null || isNaN(value)) return "N/A";
        
        const metric = this.getMetricByValue(metricKey);
        const format = metric ? metric.format : "number";
        
        switch (format) {
            case "percentage":
                return `${value.toFixed(1)}%`;
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
