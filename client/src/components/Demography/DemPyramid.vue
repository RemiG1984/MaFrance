<template>
  <div class="bg-white p-4 rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-2">Pyramide des Âges - {{ selectedYearComputed }}</h2>
    <!-- Slider overlay au-dessus du graphique -->
    <div v-if="showSlider" class="bg-gray-100 p-3 rounded mb-3">
      <label class="block mb-2 text-sm font-medium">Sélectionnez l'année :</label>
      <input
        type="range"
        v-model="selectedYearComputed"
        :min="minYear"
        :max="maxYear"
        :key="selectedYearComputed"
        class="w-full"
      />
      <p class="text-center text-sm mt-1">Année : {{ selectedYearComputed }}</p>
    </div>
    <div v-if="!pyramidData" class="text-center p-4">
      Chargement des données...
    </div>
    <div class="w-full max-w-4xl mx-auto"> <!-- Réduction largeur X via CSS -->
      <BarChart
        v-if="pyramidData"
        :key="JSON.stringify(pyramidData)"
        :data="pyramidData"
        :options="pyramidOptions"
        class="h-96"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Bar as BarChart } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LinearScale
} from 'chart.js';

// Enregistrement des composants Chart.js
ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale);

// Props du composant
const props = defineProps({
  pyramid: Object, // { popF: [], popM: [] } - populations par âge (tableaux de 101 éléments)
  selectedYear: { type: [Number, String], default: 2024 },
  year2100Pyramid: Object, // Pyramide spécifique pour 2100 (pour le score de stabilité)
  minYear: { type: Number, default: 2024 },
  maxYear: { type: Number, default: 2100 },
  showSlider: { type: Boolean, default: true }
});

// Local ref for selectedYear to handle v-model
const selectedYearLocal = ref(Number(props.selectedYear));

// Computed property for selectedYear to handle v-model
const selectedYearComputed = computed({
  get: () => selectedYearLocal.value,
  set: (value) => {
    selectedYearLocal.value = value;
    emit('update:selectedYear', value);
  }
});

// Watch prop changes to update local ref
watch(() => props.selectedYear, (newVal) => {
  selectedYearLocal.value = Number(newVal);
});

// Émettre les changements du slider
const emit = defineEmits(['update:selectedYear']);

// Données du graphique
const pyramidData = ref(null);

// Labels pour les tranches d'âge agrégées (21 groupes : jeune à vieux, pour compacité et orientation bas-haut)
const ageGroups = [
  '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44',
  '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84',
  '85-89', '90-94', '95-99', '100+'
];

// Surveillance des changements de pyramide pour mise à jour du graphique
watch(() => props.pyramid, (newPyramid) => {
  if (!newPyramid || !newPyramid.popF || !newPyramid.popM) {
    pyramidData.value = null;
    return;
  }

  // Fonction pour agréger les populations par tranches de 5 ans
  const aggregateData = (popData) => {
    const aggregated = [];
    // 20 tranches de 5 ans (0-99)
    for (let i = 0; i < 20; i++) {
      const start = i * 5;
      const end = start + 4;
      aggregated.push(popData.slice(start, end + 1).reduce((sum, p) => sum + p, 0));
    }
    // Tranche finale 100+ (somme des âges >=100)
    aggregated.push(popData.slice(100).reduce((sum, p) => sum + p, 0));
    return aggregated;
  };

  // Agréger les données pour hommes et femmes
  const femaleAggregated = aggregateData(newPyramid.popF);
  const maleAggregated = aggregateData(newPyramid.popM);

  // Inverser l'ordre pour que les jeunes soient en bas
  femaleAggregated.reverse();
  maleAggregated.reverse();

  // Préparer les datasets : FEMMES À GAUCHE (négatif), HOMMES À DROITE (positif)
  const femaleData = femaleAggregated.map(p => -p / 1e3); // Négatif pour gauche (femmes)
  const maleData = maleAggregated.map(p => p / 1e3); // Positif pour droite (hommes)

  pyramidData.value = {
    labels: [...ageGroups].reverse(), // Ordre vieux à jeune : 100+ en haut avec reversed: true
    datasets: [
      {
        label: 'Femmes (milliers)',
        data: femaleData,
        backgroundColor: '#f9a8d4', // Rose clair pour femmes
        borderColor: '#f472b6',
        borderWidth: 1,
        barPercentage: 1.0, // Barres pleines pour alignement parfait
        categoryPercentage: 1.0, // Pas d'espace entre barres d'un même âge (anti-stagger total)
        barThickness: 10, // Épaisseur fixe pour chevauchement complet
        offset: 0 // Chevauchement complet avec les barres hommes
      },
      {
        label: 'Hommes (milliers)',
        data: maleData,
        backgroundColor: '#60a5fa', // Bleu clair pour hommes
        borderColor: '#3b82f6',
        borderWidth: 1,
        barPercentage: 1.0, // Alignement parfait avec femmes
        categoryPercentage: 1.0,
        barThickness: 10, // Épaisseur fixe pour chevauchement complet
        offset: 0 // Chevauchement complet avec les barres femmes
      }
    ]
  };
}, { immediate: true, deep: true });


// Options du graphique (configuration pour compacité et orientation)
const pyramidOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false, // Permet de fixer la hauteur via CSS
  maxHeight: 384, // Hauteur maximale fixe en px (empêche l'expansion)
  layout: {
    padding: {
      left: 10,
      right: 10
    } // Réduction marges X pour taille plus compacte
  },
  indexAxis: 'y', // Barres horizontales (classique pour pyramide)
  scales: {
    x: {
      beginAtZero: true,
      title: { display: true, text: 'Population (milliers)' },
      ticks: {
        callback: function(value) {
          return Math.abs(value); // Affichage absolu pour symétrie gauche/droite
        }
      }
    },
    y: {
      reversed: true, // VIEUX EN HAUT (100+ haut), JEUNES EN BAS (0-4 bas) – ordre naturel
      title: { display: true, text: 'Âge' },
      stacked: true,
      ticks: {
        autoSkip: false, // Afficher tous les labels agrégés (21 max, pas d'expansion)
        maxRotation: 0 // Labels horizontaux pour compacité
      }
    }
  },
  plugins: {
    legend: { display: true, position: 'top' }, // Légende en haut
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${Math.abs(context.parsed.x).toFixed(1)}k`
      }
    }
  }
}));
</script>

<style scoped>
/* Hauteur et largeur fixes pour éviter l'expansion */
.h-96 {
  height: 24rem; /* 384px - suffisant pour 21 tranches */
  max-height: 24rem;
  width: 100%; /* Pleine largeur conteneur, mais max-w-4xl limite X */
}
</style>