/**
 * Centralized metrics configuration
 * Contains all metric definitions, labels, categories, and formatting logic
 */

export const MetricsConfig = {
    // Label state: 0 = standard, 1 = alt1, 2 = alt2
    labelState: 0,

    // All available metrics with their properties
    metrics: [
        {
            value: "total_score",
            label: "Score Total (somme des 5 scores)",
            alt1Label: "Indice de Francité Globale",
            alt2Label: "Indicateur de Cohésion Nationale",
            category: "général",
            format: "score",
        },
        // Insécurité category
        {
            value: "insecurite_score",
            label: "Score Insécurité",
            alt1Label: "Indice de Sûreté Publique",
            alt2Label: "Niveau de Tranquillité Sociale",
            category: "insécurité",
            format: "score",
        },
        {
            value: "homicides_p100k",
            label: "Homicides et tentatives (pour 100k hab.)",
            alt1Label: "Atteintes à la vie (pour 100k hab.)",
            alt2Label: "Crimes contre les personnes (pour 100k hab.)",
            category: "insécurité",
            format: "rate_100k",
        },
        {
            value: "violences_physiques_p1k",
            label: "Violences physiques (pour mille hab.)",
            alt1Label: "Agressions corporelles (pour mille hab.)",
            alt2Label: "Conflits interpersonnels (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "violences_sexuelles_p1k",
            label: "Violences sexuelles (pour mille hab.)",
            alt1Label: "Infractions sexuelles (pour mille hab.)",
            alt2Label: "Délits contre l'intégrité (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "vols_p1k",
            label: "Vols (pour mille hab.)",
            alt1Label: "Soustraction frauduleuse (pour mille hab.)",
            alt2Label: "Appropriation illégale (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "destructions_p1k",
            label: "Destruction et dégradations (pour mille hab.)",
            alt1Label: "Dommages aux biens (pour mille hab.)",
            alt2Label: "Vandalisme urbain (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "stupefiants_p1k",
            label: "Trafic et usage de stupéfiants (pour mille hab.)",
            alt1Label: "Infractions aux stupéfiants (pour mille hab.)",
            alt2Label: "Économie souterraine (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        {
            value: "escroqueries_p1k",
            label: "Escroqueries (pour mille hab.)",
            alt1Label: "Délits économiques (pour mille hab.)",
            alt2Label: "Tromperies financières (pour mille hab.)",
            category: "insécurité",
            format: "rate_1k",
        },
        // Immigration category
        {
            value: "immigration_score",
            label: "Score Immigration",
            alt1Label: "Indice de Diversité Culturelle",
            alt2Label: "Métrique de Brassage Démographique",
            category: "immigration",
            format: "score",
        },
        {
            value: "extra_europeen_pct",
            label: "Prénoms de naissance extra-européen (%)",
            alt1Label: "Diversité onomastique mondiale (%)",
            alt2Label: "Origine géographique élargie (%)",
            category: "immigration",
            format: "percentage",
        },
        // Islamisme category
        {
            value: "islamisation_score",
            label: "Score Islamisation",
            alt1Label: "Indice de Pluralisme Religieux",
            alt2Label: "Coefficient de Diversité Spirituelle",
            category: "islamisme",
            format: "score",
        },
        {
            value: "musulman_pct",
            label: "Prénoms de naissance musulmans (%)",
            alt1Label: "Prénoms d'origine arabo-musulmane (%)",
            alt2Label: "Héritage onomastique oriental (%)",
            category: "islamisme",
            format: "percentage",
        },
        {
            value: "number_of_mosques",
            label: "Nombre de Mosquées",
            alt1Label: "Lieux de culte musulman",
            alt2Label: "Édifices religieux islamiques",
            category: "islamisme",
            format: "number",
        },
        {
            value: "mosque_p100k",
            label: "Nombre de Mosquées (pour 100k hab.)",
            alt1Label: "Densité des lieux de culte musulman (pour 100k hab.)",
            alt2Label: "Concentration religieuse islamique (pour 100k hab.)",
            category: "islamisme",
            format: "rate_100k",
        },
        // Défrancisation category
        {
            value: "defrancisation_score",
            label: "Score Défrancisation",
            alt1Label: "Indice de Préservation Culturelle",
            alt2Label: "Mesure de Continuité Identitaire",
            category: "défrancisation",
            format: "score",
        },
        {
            value: "prenom_francais_pct",
            label: "Prénoms de naissance français (%)",
            alt1Label: "Heritage onomastique français (%)",
            alt2Label: "Tradition nominative nationale (%)",
            category: "défrancisation",
            format: "percentage",
        },
        // Wokisme category
        {
            value: "wokisme_score",
            label: "Score Wokisme",
            alt1Label: "Indice de Politique Urbaine",
            alt2Label: "Coefficient d'Intervention Sociale",
            category: "wokisme",
            format: "score",
        },
        {
            value: "total_qpv",
            label: "Nombre de QPV",
            alt1Label: "Quartiers en développement prioritaire",
            alt2Label: "Zones d'attention particulière",
            category: "wokisme",
            format: "number",
        },
        {
            value: "pop_in_qpv_pct",
            label: "% Population en QPV",
            alt1Label: "% Pop. en zones prioritaires",
            alt2Label: "% Résidents en territoires ciblés",
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
        window.dispatchEvent(new CustomEvent('metricsLabelsToggled', {
            detail: { labelState: this.labelState }
        }));
    },

    // Get current label state name
    getLabelStateName() {
        switch (this.labelState) {
            case 1: return 'alt1';
            case 2: return 'alt2';
            default: return 'standard';
        }
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
    }
};
