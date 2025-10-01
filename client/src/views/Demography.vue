<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Projection Démographique en France</h1>
    <!-- Paramètres d'entrée -->
    <DemParameters
      :initialTFR="initialTFR"
      @update:fertility="fertilityParams = $event"
      @update:migration="migrationEvol = $event"
      @run="runProjection"
    />
    <!-- Graphique des tendances de population (en premier) -->
    <DemGraph :historical="historicalData" :projected="projectedData" :yearRange="yearRange" :selectedScale="selectedScale" :targetTFR="fertilityParams.targetTFR" :targetTFRYear="fertilityParams.targetTFRYear" @update:selectedScale="selectedScale = $event" />
    <!-- Grille avec pyramide dans la première colonne et score/année dans la seconde -->
    <v-row>
      <v-col cols="12" md="6">
        <DemPyramid
          :pyramid="currentPyramid"
          v-model:selectedYear="selectedYear"
          :year2100Pyramid="year2100Pyramid"
          :minYear="2024"
          :maxYear="yearRange[1]"
        />
      </v-col>
      <v-col cols="12" md="6">
        <!-- Année de stabilisation démographique -->
        <div class="bg-green-50 p-4 rounded-lg mb-4">
          <h3 class="text-lg font-medium mb-2">Année de Stabilisation Démographique</h3>
          <p class="text-sm" v-if="stabilizationYear !== null">La population se stabilise à partir de {{ stabilizationYear }} (variations absolues < 0,2 %/an).</p>
          <p class="text-sm" v-else>Aucune stabilisation démographique n'a été atteinte</p>
        </div>
        <div v-if="stabilityScore !== null" class="mt-4 p-3 bg-blue-50 rounded">
          <h3 class="text-lg font-medium mb-2">Score de Stabilité Démographique (pour 2100)</h3>
          <p class="text-sm">Score : {{ stabilityScore }}/100 (plus élevé = pyramide plus proche de l'idéal stationnaire)</p>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Papa from 'papaparse';
import DemParameters from '../components/Demography/DemParameters.vue';
import DemGraph from '../components/Demography/DemGraph.vue';
import DemPyramid from '../components/Demography/DemPyramid.vue';

// État pour les données d'entrée
const pyramid = ref(null);
const mortality = ref(null);
const fertility = ref(null);
const migration = ref(null);
const historicalData = ref([]);

// État pour les paramètres
const fertilityParams = ref({});
const migrationEvol = ref([]); // Sera mis à jour par DemParameters
const selectedScale = ref("1-2024");
const initialTFR = ref(1.59);

// Computed year range based on selected scale
const yearRange = computed(() => {
  const scales = {
    "1-2024": [1, 2024],
    "1000-2024": [1000, 2024],
    "1900-2024": [1900, 2024],
    "1900-2100": [1900, 2100],
    "1000-2100": [1000, 2100]
  };
  return scales[selectedScale.value] || [1900, 2100];
});

// État pour les résultats de projection
const projectedData = ref([]);
const allPyramids = ref({}); // { year: { popF: [], popM: [] } }
const selectedYear = ref(2024);
const stabilizationYear = ref(null);
const year2100Pyramid = ref(null);
const stabilityScore = ref(null);

// Données de la pyramide courante
const currentPyramid = computed(() => allPyramids.value[selectedYear.value]);

// Surveillance pour calculer le score de stabilité (sur données détaillées de 2100) - plus réactif à la forme de la pyramide
watch(() => year2100Pyramid.value, (year2100Pyramid) => {
  if (!year2100Pyramid || !year2100Pyramid.popF || !year2100Pyramid.popM) {
    stabilityScore.value = null;
    return;
  }

  // Filtrer les âges 0-80
  const popF = year2100Pyramid.popF.slice(0, 81);
  const popM = year2100Pyramid.popM.slice(0, 81);
  const total = popF.map((f, i) => f + popM[i]);

  // Score de symétrie : favorise l'égalité hommes/femmes
  const symmetryDiffs = total.map((t, i) => Math.abs(popF[i] - popM[i]) / (t + 1e-6));
  const meanSymDiff = symmetryDiffs.reduce((a, b) => a + b, 0) / symmetryDiffs.length;
  const symmetryScore = 100 * Math.pow(1 - meanSymDiff, 1.5);

  // Score de régularité : favorise les transitions lisses entre cohortes
  const regularityDiffs = [];
  for (let i = 0; i < 80; i++) {
    regularityDiffs.push(total[i + 1] - total[i]);
  }
  const meanReg = regularityDiffs.reduce((a, b) => a + b, 0) / regularityDiffs.length;
  const stdReg = Math.sqrt(regularityDiffs.reduce((sum, d) => sum + Math.pow(d - meanReg, 2), 0) / regularityDiffs.length);
  const regRatio = stdReg / (Math.abs(meanReg) + 1e-6);
  const regularityScore = 100 * Math.pow(Math.max(0, 1 - regRatio), 1.5);

  // Score de forme : favorise une pyramide avec léger tapering (plus de jeunes)
  const decay = 0.995; // Encore moins strict
  const ideal = total.map((_, i) => total[0] * Math.pow(decay, i));
  const mse = total.reduce((sum, t, i) => sum + Math.pow(t - ideal[i], 2), 0) / total.length;
  const varIdeal = ideal.reduce((sum, id) => sum + Math.pow(id, 2), 0) / ideal.length;
  const shapeScore = 100 * Math.pow(Math.max(0, 1 - mse / varIdeal), 0.3);

  // Score final : combinaison pondérée, arrondi entier, borné 10-100 pour moins de harshness
  const finalScore = Math.round(shapeScore * 0.5 + symmetryScore * 0.25 + regularityScore * 0.25);
  stabilityScore.value = Math.max(10, Math.min(100, finalScore));
}, { immediate: true, deep: true });

// Chargement des fichiers CSV au montage
async function loadCSVs() {
  const files = [
    { url: '/data/pyramid.csv', target: pyramid },
    { url: '/data/mortality.csv', target: mortality },
    { url: '/data/fertility.csv', target: fertility },
    { url: '/data/migration.csv', target: migration },
    { url: '/data/pop_historique.csv', target: historicalData }
  ];

  const promises = files.map(async ({ url, target }) => {
    const response = await fetch(url);
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        transform: (value, header) => {
          if (header === 'age' || header === 'year') return value;
          if (header === 'female' || header === 'male') {
            return value.includes('%') ? parseFloat(value.replace('%', '')) / 100 : parseFloat(value);
          }
          return parseFloat(value) || parseInt(value) || value;
        },
        complete: (result) => {
          target.value = result.data;
          resolve();
        },
        error: (err) => {
          console.error(`Erreur de chargement ${url}:`, err);
          reject(err);
        }
      });
    });
  });

  await Promise.all(promises);

  // Calcul du TFR initial après chargement des données de fécondité
  if (fertility.value) {
    initialTFR.value = fertility.value.reduce((sum, row) => sum + parseFloat(row.rate) / 100, 0);
  }

  // Set initial pyramid for 2024
  if (pyramid.value) {
    allPyramids.value = {
      2024: {
        popF: pyramid.value.map(row => row.females),
        popM: pyramid.value.map(row => row.males)
      }
    };
  }
}

// Fonction pour calculer l'année de stabilisation (première année où toutes les variations suivantes jusqu'à 2100 sont < 0.1%/an)
function computeStabilizationYear(data) {
  for (let i = 1; i < data.length; i++) {
    let isStable = true;
    for (let j = i; j < data.length; j++) {
      const prevPop = data[j-1].totalPop;
      const currPop = data[j].totalPop;
      const growthRate = Math.abs((currPop - prevPop) / prevPop);
      if (growthRate >= 0.001) { // 0.1%
        isStable = false;
        break;
      }
    }
    if (isStable) {
      return data[i].year;
    }
  }
  return null; // Pas de stabilisation trouvée
}

// Fonction de projection cohort-component, modifiée pour stocker les pyramides
// Note: Logique sound – augmentation initiale due à momentum démographique (cohortes jeunes/large, births > deaths courts termes malgré TFR<2 et mig=0 après 2027).
// À long terme, déclin attendu avec mortalité âge-spécifique croissante (de mortality.csv).
function projectPopulation(startYear = 2024, endYear = 2100) {
  if (!pyramid.value || !mortality.value || !fertility.value || !migration.value) return [];

  // Initialiser les tableaux de population
  let popF = pyramid.value.map(row => parseInt(row.females));
  let popM = pyramid.value.map(row => parseInt(row.males));
  const mortalityF = mortality.value.map(row => parseFloat(row.female));
  const mortalityM = mortality.value.map(row => parseFloat(row.male));
  const initialASFR = fertility.value.map(row => parseFloat(row.rate) / 100); // Conversion en par femme
  const initialTFR = initialASFR.reduce((a, b) => a + b, 0);
  const migrationF = migration.value.map(row => parseFloat(row.female));
  const migrationM = migration.value.map(row => parseFloat(row.male));

  const results = [];
  const allPyrs = {};
  const changeStart = 2027; // Année dans la boucle pour projection 2028+

  // Stocker la pyramide initiale pour startYear
  allPyrs[startYear] = { popF: [...popF], popM: [...popM] };

  for (let year = startYear; year < endYear; year++) {
    // Ajuster la fécondité en fonction des paramètres
    let asfr = initialASFR;
    if (year >= changeStart) {
      let scale = 1;
      const targetScale = fertilityParams.value.targetTFR / initialTFR;
      const yearsToTarget = fertilityParams.value.targetTFRYear - changeStart;

      if (yearsToTarget > 0) {
        const currentOffset = year - changeStart;
        if (currentOffset < yearsToTarget) {
          scale = 1 + (currentOffset / yearsToTarget) * (targetScale - 1);
        } else {
          scale = targetScale;
        }
      } else {
        scale = targetScale;
      }
      asfr = initialASFR.map(rate => rate * scale);
    }

    // Calculer les naissances
    const women = popF.slice(15, 51); // Âges 15-50
    const birthsTotal = women.reduce((sum, w, i) => sum + w * asfr[i], 0);
    const birthsF = birthsTotal * 0.488; // ~48.8% filles (1/2.05)
    const birthsM = birthsTotal - birthsF;

    // Calculer les décès
    const deathsF = popF.map((p, i) => p * mortalityF[i]);
    const deathsM = popM.map((p, i) => p * mortalityM[i]);
    const deathsTotal = deathsF.reduce((a, b) => a + b, 0) + deathsM.reduce((a, b) => a + b, 0);

    // Survivants (vieillissement)
    const survivorsF = popF.map((p, i) => p * (1 - mortalityF[i]));
    const survivorsM = popM.map((p, i) => p * (1 - mortalityM[i]));
    popF = [birthsF, ...survivorsF.slice(0, -1)];
    popM = [birthsM, ...survivorsM.slice(0, -1)];
    popF[popF.length - 1] += survivorsF[survivorsF.length - 1]; // Agrégat 100+
    popM[popM.length - 1] += survivorsM[survivorsM.length - 1];

    // Appliquer la migration
    const netMig = migrationEvol.value[year - startYear] || 0;
    const migF = migrationF.map(p => netMig * p);
    const migM = migrationM.map(p => netMig * p);
    popF = popF.map((p, i) => p + (migF[i] || 0));
    popM = popM.map((p, i) => p + (migM[i] || 0));

    // Stocker la pyramide pour cette année
    allPyrs[year + 1] = { popF: [...popF], popM: [...popM] };

    // Calculer le TFR
    const tfr = asfr.reduce((a, b) => a + b, 0);

    // Stocker les résultats
    const totalPop = popF.reduce((a, b) => a + b, 0) + popM.reduce((a, b) => a + b, 0);
    results.push({ year: year + 1, totalPop, births: birthsTotal, deaths: deathsTotal, netMig, tfr });
  }

  allPyramids.value = allPyrs;
  year2100Pyramid.value = allPyrs[2100] || null;
  stabilizationYear.value = computeStabilizationYear(results);
  return results;
}

// Mettre à jour la pyramide lors du changement d'année
function updatePyramid() {
  // La computed gère cela
}

// Lancer la projection lors des changements de paramètres ou clic bouton
async function runProjection() {
  if (!pyramid.value) {
    await loadCSVs();
  }
  allPyramids.value = {}; // Réinitialiser
  year2100Pyramid.value = null;
  stabilizationYear.value = null;
  selectedScale.value = "1900-2100"; // Changer l'échelle avant projection
  projectedData.value = projectPopulation(2024, yearRange.value[1]);
  selectedYear.value = 2100; // Réinitialiser le graph pyramide à 2100
}

// Chargement des données au montage
loadCSVs();
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style>