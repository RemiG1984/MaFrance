<template>
  <v-card class="pa-4 mb-4">
    <v-card-title>Paramètres de Projection</v-card-title>
    <v-card-text>
      <v-select
        v-model="preset"
        :items="['Tendance actuelle', 'Remigration et stabilisation démographique', 'custom']"
        label="Preset"
        density="compact"
        variant="outlined"
        color="primary"
        class="mb-4 max-w-xs"
      ></v-select>
      <v-expansion-panels>
        <v-expansion-panel>
          <v-expansion-panel-title>Paramètres Détaillés</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row>
              <p class="text-body-2 text-grey-darken-2 mb-4">
        Note : Tous les changements de politique commencent en 2028, en supposant une mise en œuvre après l'élection présidentielle de 2027. 
        Les projections pour 2025-2027 utilisent des hypothèses fixes (+300k migration nette/an, fécondité constante). 
        Les projections utilisent la méthode des composantes de cohortes, tenant compte de la fécondité, mortalité et solde migratoire par age.
        Les projections n'ont qu'une valeur ludique et dépendent évidemment des paramètres subjectifs considérés.
              </p>
              <!-- Paramètres de Fécondité -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="pa-4">
                  <v-card-title class="text-h6">Paramètres de Fécondité</v-card-title>
                  <v-card-text>
                    <p class="text-body-2 text-grey-darken-2">TFR actuel (2024): {{ initialTFR.toFixed(2) }} enfants par femme</p>
                    <v-row>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="targetTFR"
                          label="TFR Cible"
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          placeholder="ex. : 2.1"
                          density="compact"
                          class="max-w-xs"
                        />
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="targetTFRYear"
                          label="Année d'Atteinte de la Cible (≥2028)"
                          type="number"
                          min="2028"
                          max="2100"
                          placeholder="ex. : 2048"
                          density="compact"
                          class="max-w-xs"
                        />
                      </v-col>
                    </v-row>
                    <p class="text-caption text-grey-darken-1 mt-2">
                      Interpolation linéaire de 2028 à l'année cible. Si l'année cible est 2028, changement immédiat en 2028.
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Paramètres de Migration -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="pa-4">
                  <v-card-title class="text-h6">Paramètres d'immigration et remigration</v-card-title>
                  <v-card-text>
                    <v-text-field
                      v-model.number="constantMigration"
                      label="Immigration annuelle nette après 2028 (k/an)"
                      type="number"
                      step="100"
                      placeholder="ex. : -300 pour -300k/an dès 2028"
                      density="compact"
                      class="max-w-xs"
                    />
                    <v-row>
                      <v-col cols="4">
                        <v-text-field
                          v-model.number="remigrationTotal"
                          label="Total Remigration (Millions)"
                          type="number"
                          step="0.1"
                          placeholder="ex. : -4 pour -4M total"
                          density="compact"
                          class="max-w-xs"
                        />
                      </v-col>
                      <v-col cols="4">
                        <v-text-field
                          v-model.number="remigrationStart"
                          label="Année de Début (≥2028)"
                          type="number"
                          min="2028"
                          max="2100"
                          density="compact"
                          class="max-w-xs"
                        />
                      </v-col>
                      <v-col cols="4">
                        <v-text-field
                          v-model.number="remigrationEnd"
                          label="Année de Fin"
                          type="number"
                          :min="remigrationStart"
                          max="2100"
                          density="compact"
                          class="max-w-xs"
                        />
                      </v-col>
                    </v-row>
                    <p class="text-caption text-grey-darken-1 mt-2">
                      Remigration répartie uniformément sur les années spécifiées, ajoutée à l'immigration annuelle.
                    </p>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      <v-btn
        @click="$emit('run')"
        color="primary"
        class="mt-4"
        block
        variant="elevated"
      >
        Lancer la Projection
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue';

// Props et emits
const { initialTFR } = defineProps({
  initialTFR: { type: Number, default: 1.87 }
});
const emit = defineEmits(['update:fertility', 'update:migration', 'run']);

// État
const targetTFR = ref(initialTFR.value);
const targetTFRYear = ref(2050);
const constantMigration = ref(0); // en k/an, défaut 0 dès 2028
const remigrationTotal = ref(0); // en M, défaut 0
const remigrationStart = ref(2028);
const remigrationEnd = ref(2032);
const migration = ref([]);

// Presets
const preset = ref('Tendance actuelle');
const presets = {
  'Politique actuelle (Macron)': {
    targetTFR: 1.5,
    targetTFRYear: 2040,
    constantMigration: 500,
    remigrationTotal: 0,
    remigrationStart: 2028,
    remigrationEnd: 2032
  },
  'Remigration et stabilisation démographique': {
    targetTFR: 2.03,
    targetTFRYear: 2048,
    constantMigration: 0,
    remigrationTotal: -6,
    remigrationStart: 2028,
    remigrationEnd: 2033
  }
};

// Fonction pour construire le tableau de migration
function buildMigrationArray() {
  const startYear = 2025;
  const endYear = 2100;
  const years = endYear - startYear + 1;
  const constantValue = (constantMigration.value || 0) * 1000; // Convertir k en personnes

  // Initialiser le tableau
  migration.value = new Array(years).fill(0).map((_, i) => {
    const y = startYear + i;
    return y <= 2027 ? 300000 : constantValue;
  });

  // Appliquer la remigration si spécifiée
  if (remigrationTotal.value < 0 && remigrationStart.value <= remigrationEnd.value) {
    const remigTotal = remigrationTotal.value * 1e6; // Total négatif en personnes
    const numYears = remigrationEnd.value - remigrationStart.value + 1;
    const remigPerYear = remigTotal / numYears;

    for (let y = remigrationStart.value; y <= remigrationEnd.value; y++) {
      const idx = y - startYear;
      if (idx >= 0 && idx < years) {
        migration.value[idx] += remigPerYear;
      }
    }
  }
}

// Surveiller les changements et reconstruire migration/emits
watch([constantMigration, remigrationTotal, remigrationStart, remigrationEnd], buildMigrationArray, { immediate: true });
watch(migration, (val) => emit('update:migration', val), { deep: true });
watch([targetTFR, targetTFRYear], () => emit('update:fertility', { targetTFR: targetTFR.value, targetTFRYear: targetTFRYear.value }), { immediate: true });

// Preset watches
watch(preset, (newPreset) => {
  if (newPreset !== 'custom' && presets[newPreset]) {
    const p = presets[newPreset];
    targetTFR.value = p.targetTFR;
    targetTFRYear.value = p.targetTFRYear;
    constantMigration.value = p.constantMigration;
    remigrationTotal.value = p.remigrationTotal;
    remigrationStart.value = p.remigrationStart;
    remigrationEnd.value = p.remigrationEnd;
  }
});

watch([targetTFR, targetTFRYear, constantMigration, remigrationTotal, remigrationStart, remigrationEnd], () => {
  let matched = false;
  for (const [name, p] of Object.entries(presets)) {
    if (targetTFR.value === p.targetTFR &&
        targetTFRYear.value === p.targetTFRYear &&
        constantMigration.value === p.constantMigration &&
        remigrationTotal.value === p.remigrationTotal &&
        remigrationStart.value === p.remigrationStart &&
        remigrationEnd.value === p.remigrationEnd) {
      preset.value = name;
      matched = true;
      break;
    }
  }
  if (!matched) {
    preset.value = 'custom';
  }
}, { immediate: true });
</script>

<style scoped>
input, select {
  transition: border-color 0.2s;
}
input:focus, select:focus {
  border-color: #3b82f6;
  outline: none;
}
</style>