// config/chartConfig.js
export const crimeChartConfig = {
  homicides_p100k: {
    title: 'Homicides et tentatives /100k hab',
    yAxisLabel: 'Nombre pour 100k habitants',
    styles: {
      country: { 
        color: "#ff0000",
        borderColor: "#ff0000",
        backgroundColor: "rgba(255, 0, 0, 0.1)",
        label: "France"
      },
      departement: { 
        color: "#ff6600",
        borderColor: "#ff6600", 
        backgroundColor: "rgba(255, 102, 0, 0.1)",
        label: "Département"
      },
      commune: { 
        color: "#ffaa00",
        borderColor: "#ffaa00",
        backgroundColor: "rgba(255, 170, 0, 0.1)",
        label: "Commune"
      }
    }
  },
  cambriolages_de_logement_p1k: {
    title: 'Cambriolages de logement /1k hab',
    yAxisLabel: 'Nombre pour 1k habitants',
    styles: {
      country: { 
        color: "#0066ff",
        borderColor: "#0066ff",
        backgroundColor: "rgba(0, 102, 255, 0.1)",
        label: "France"
      },
      departement: { 
        color: "#3388ff",
        borderColor: "#3388ff",
        backgroundColor: "rgba(51, 136, 255, 0.1)",
        label: "Département"
      },
      commune: { 
        color: "#66aaff",
        borderColor: "#66aaff",
        backgroundColor: "rgba(102, 170, 255, 0.1)",
        label: "Commune"
      }
    }
  },
  coups_et_blessures_volontaires_p1k: {
    title: 'Coups et blessures volontaires /1k hab',
    yAxisLabel: 'Nombre pour 1k habitants',
    styles: {
      country: { 
        color: "#ff00aa",
        borderColor: "#ff00aa",
        backgroundColor: "rgba(255, 0, 170, 0.1)",
        label: "France"
      },
      departement: { 
        color: "#ff44bb",
        borderColor: "#ff44bb",
        backgroundColor: "rgba(255, 68, 187, 0.1)",
        label: "Département"
      },
      commune: { 
        color: "#ff77cc",
        borderColor: "#ff77cc",
        backgroundColor: "rgba(255, 119, 204, 0.1)",
        label: "Commune"
      }
    }
  },
  destructions_et_degradations_volontaires_p1k: {
    title: 'Destructions et dégradations volontaires /1k hab',
    yAxisLabel: 'Nombre pour 1k habitants',
    styles: {
      country: { 
        color: "#00aa44",
        borderColor: "#00aa44",
        backgroundColor: "rgba(0, 170, 68, 0.1)",
        label: "France"
      },
      departement: { 
        color: "#33bb66",
        borderColor: "#33bb66",
        backgroundColor: "rgba(51, 187, 102, 0.1)",
        label: "Département"
      },
      commune: { 
        color: "#66cc88",
        borderColor: "#66cc88",
        backgroundColor: "rgba(102, 204, 136, 0.1)",
        label: "Commune"
      }
    }
  }
}

// utils/chartDataExtractor.js
export class ChartDataExtractor {
  constructor(dataStore, chartConfig) {
    this.dataStore = dataStore
    this.chartConfig = chartConfig
    this.levels = ['country', 'departement', 'commune']
  }

  /**
   * Extrait et formate les données pour un graphique Chart.js
   * @param {string} key - La clé des données à extraire (ex: 'homicides_p100k')
   * @returns {Object} Données formatées pour Chart.js
   */
  extractCrimeData(key) {
    const config = this.chartConfig[key]
    if (!config) {
      console.warn(`Configuration non trouvée pour la clé: ${key}`)
      return null
    }

    const datasets = []
    const allLabels = new Set()
    
    // Collecte des données pour chaque niveau jusqu'au niveau actuel
    for (const level of this.levels) {
      const levelData = this.dataStore[level]?.crimeData || []
      
      if (levelData.length === 0) continue

      // Extraction des données pour ce niveau
      const dataPoints = []
      const labels = []
      
      for (const entry of levelData) {
        if (entry[key] !== undefined && entry[key] !== null) {
          labels.push(entry.annee)
          dataPoints.push({
            x: entry.annee,
            y: entry[key]
          })
          allLabels.add(entry.annee)
        }
      }

      if (dataPoints.length > 0) {
        const levelStyle = config.styles[level] || {}
        
        datasets.push({
          label: levelStyle.label || level.charAt(0).toUpperCase() + level.slice(1),
          data: dataPoints,
          borderColor: levelStyle.borderColor || levelStyle.color || '#000000',
          backgroundColor: levelStyle.backgroundColor || 'rgba(0,0,0,0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1
        })
      }

      // Arrêt si on a atteint le niveau actuel
      if (level === this.dataStore.currentLevel) break
    }

    // Tri des labels (années)
    const sortedLabels = Array.from(allLabels).sort((a, b) => a - b)

    return {
      labels: sortedLabels,
      datasets: datasets,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: config.title
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Année'
            }
          },
          y: {
            title: {
              display: true,
              text: config.yAxisLabel || 'Valeur'
            },
            beginAtZero: true
          }
        }
      }
    }
  }

  /**
   * Vérifie la cohérence des années entre les niveaux
   * @param {string} key - La clé des données à vérifier
   * @returns {Object} Rapport de cohérence
   */
  validateDataConsistency(key) {
    const report = {
      isConsistent: true,
      issues: [],
      yearsByLevel: {}
    }

    for (const level of this.levels) {
      const levelData = this.dataStore[level]?.crimeData || []
      const years = levelData
        .filter(entry => entry[key] !== undefined && entry[key] !== null)
        .map(entry => entry.annee)
        .sort((a, b) => a - b)
      
      report.yearsByLevel[level] = years

      if (level === this.dataStore.currentLevel) break
    }

    // Vérification de la cohérence des années
    const levelKeys = Object.keys(report.yearsByLevel)
    if (levelKeys.length > 1) {
      const baseYears = report.yearsByLevel[levelKeys[0]]
      
      for (let i = 1; i < levelKeys.length; i++) {
        const currentYears = report.yearsByLevel[levelKeys[i]]
        const missingYears = baseYears.filter(year => !currentYears.includes(year))
        const extraYears = currentYears.filter(year => !baseYears.includes(year))
        
        if (missingYears.length > 0 || extraYears.length > 0) {
          report.isConsistent = false
          report.issues.push({
            level: levelKeys[i],
            missingYears,
            extraYears
          })
        }
      }
    }

    return report
  }

  /**
   * Obtient la liste des clés disponibles dans la configuration
   * @returns {Array} Liste des clés disponibles
   */
  getAvailableKeys() {
    return Object.keys(this.chartConfig)
  }
}

// Exemple d'utilisation dans votre composant Home.vue
/*
<script>
import { ChartDataExtractor } from '@/utils/chartDataExtractor'
import { crimeChartConfig } from '@/config/chartConfig'

export default {
  data() {
    return {
      chartDataExtractor: null,
      availableCharts: []
    }
  },
  
  mounted() {
    // Initialisation de l'extracteur de données
    this.chartDataExtractor = new ChartDataExtractor(this.dataStore, crimeChartConfig)
    this.availableCharts = this.chartDataExtractor.getAvailableKeys()
  },
  
  methods: {
    getChartData(key) {
      if (!this.chartDataExtractor) return null
      
      // Validation optionnelle
      const validation = this.chartDataExtractor.validateDataConsistency(key)
      if (!validation.isConsistent) {
        console.warn('Incohérence détectée dans les données:', validation.issues)
      }
      
      // Extraction des données
      return this.chartDataExtractor.extractCrimeData(key)
    },
    
    generateAllCharts() {
      const chartsData = {}
      for (const key of this.availableCharts) {
        chartsData[key] = this.getChartData(key)
      }
      return chartsData
    }
  }
}
</script>
*/