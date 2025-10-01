<template>
  <div class="bg-white p-4 rounded-lg shadow">
    <v-row class="mb-0">
      <v-col cols="auto">
        <h2 class="text-xl font-semibold">Population en France</h2>
      </v-col>
      <v-col cols="auto">
        <v-select
          v-model="internalSelectedScale"
          :items="scaleOptions"
          @update:modelValue="$emit('update:selectedScale', $event)"
          label="Échelle temporelle"
          density="compact"
          variant="outlined"
          color="primary"
          class="max-w-xs"
        ></v-select>
      </v-col>
      <v-col cols="auto">
        <v-btn
          @click="showTFR = !showTFR"
          :color="showTFR ? 'primary' : 'grey'"
          size="small"
          variant="outlined"
        >
          <v-icon>{{ showTFR ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
          TFR - Taux de Fécondité Total
        </v-btn>
      </v-col>
    </v-row>
    <div v-if="!props.historical || !props.projected || !props.yearRange" class="text-center p-4">
      Loading data...
    </div>
    <canvas ref="chartCanvas" class="h-96"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import Chart from 'chart.js/auto';
import Papa from 'papaparse';

// Props
const props = defineProps({
  historical: Array, // { year, pop }
  projected: Array, // { year, totalPop, births, deaths, netMig }
  yearRange: Array, // [startYear, endYear]
  selectedScale: String,
  targetTFR: Number,
  targetTFRYear: Number
});

// Emits
const emit = defineEmits(['update:selectedScale']);

// Scale options
const scaleOptions = [
  { title: '1-2024', value: '1-2024' },
  { title: '1000-2024', value: '1000-2024' },
  { title: '1900-2024', value: '1900-2024' },
  { title: '1900-2100', value: '1900-2100' },
  { title: '1000-2100', value: '1000-2100' }
];

// Internal state for the select
const internalSelectedScale = ref(props.selectedScale);

// Chart canvas ref and instance
const chartCanvas = ref(null);
let chartInstance = null;

// TFR data
const tfrData = ref([]);
const tfrLoaded = ref(false);

// Toggle for TFR display
const showTFR = ref(false);

// Watch for prop changes
watch(() => props.selectedScale, (newVal) => {
  internalSelectedScale.value = newVal;
});

// Lifecycle hooks
onMounted(() => {
  // Load TFR data
  fetch('/data/TFR.csv')
    .then(res => res.text())
    .then(csv => Papa.parse(csv, { header: true, dynamicTyping: true }))
    .then(results => {
      tfrData.value = results.data.filter(d => d.year && d.TFR);
      tfrLoaded.value = true;
      updateChart();
    })
    .catch(err => console.error('Error loading TFR data:', err));
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});

// Function to interpolate historical data
function interpolateHistoricalData(data, startYear, endYear) {
  if (!data || data.length === 0) return [];

  // Sort data by year
  const sortedData = data.sort((a, b) => a.year - b.year);

  // Find the maximum year in data
  const maxDataYear = Math.max(...sortedData.map(d => d.year));

  // Limit endYear to maxDataYear for historical data
  const effectiveEndYear = Math.min(endYear, maxDataYear);

  const interpolated = [];

  for (let year = startYear; year <= effectiveEndYear; year++) {
    // Find the two closest data points
    let prev = null;
    let next = null;

    for (let i = 0; i < sortedData.length; i++) {
      if (sortedData[i].year <= year) {
        prev = sortedData[i];
      }
      if (sortedData[i].year >= year) {
        next = sortedData[i];
        break;
      }
    }

    let pop;
    if (prev && next && prev.year === next.year) {
      pop = parseInt(prev.pop);
    } else if (prev && next) {
      // Interpolate
      const ratio = (year - prev.year) / (next.year - prev.year);
      pop = parseInt(prev.pop) + (parseInt(next.pop) - parseInt(prev.pop)) * ratio;
    } else if (prev) {
      pop = parseInt(prev.pop);
    } else if (next) {
      pop = parseInt(next.pop);
    } else {
      continue; // No data
    }

    interpolated.push({ x: year, y: pop / 1e6 });
  }

  return interpolated;
}

// Function to update the chart
function updateChart() {
  if (chartInstance) chartInstance.destroy();
  if (props.historical && props.projected && props.yearRange && props.historical.length > 0) {
    const historicalData = interpolateHistoricalData(props.historical, props.yearRange[0], props.yearRange[1]);
    const projectedData = (props.projected || [])
      .filter(d => d.year >= props.yearRange[0] && d.year <= props.yearRange[1])
      .map(d => ({ x: d.year, y: d.totalPop / 1e6 }));

    const tfrFiltered = tfrData.value
      .filter(d => d.year >= props.yearRange[0] && d.year <= props.yearRange[1] && d.year <= 2024)
      .map(d => ({ x: d.year, y: d.TFR }));

    const projectedTfr = (props.projected || [])
      .filter(d => d.year >= props.yearRange[0] && d.year <= props.yearRange[1] && d.year > 2024)
      .map(d => {
        let tfr;
        if (d.year === 2025) tfr = 1.56;
        else if (d.year === 2026) tfr = 1.53;
        else if (d.year === 2027) tfr = 1.5;
        else {
          // Interpolate from 1.5 in 2027 to targetTFR at targetTFRYear, then stable
          if (d.year <= props.targetTFRYear) {
            const yearsFrom2027 = d.year - 2027;
            const totalYears = props.targetTFRYear - 2027;
            const decline = (1.5 - props.targetTFR) * Math.min(yearsFrom2027 / totalYears, 1);
            tfr = 1.5 - decline;
          } else {
            tfr = props.targetTFR;
          }
        }
        return { x: d.year, y: tfr };
      });

    console.log('TFR data loaded:', tfrData.value.length, 'entries');
    console.log('Projected TFR data:', projectedTfr.length, 'entries');
    console.log('Sample projected TFR:', projectedTfr.slice(0, 5));

    const datasets = [
      {
        label: 'Population historique (M)',
        data: historicalData,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        fill: false,
        pointRadius: 1,
        borderWidth: 3
      },
      {
        label: 'Population projetée (M)',
        data: projectedData,
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        fill: false,
        pointRadius: 1,
        borderWidth: 3,
        borderDash: [5, 5]
      }
    ];

    if (showTFR.value) {
      datasets.push(
        {
          label: 'TFR historique',
          data: tfrFiltered,
          borderColor: 'green',
          backgroundColor: 'green',
          fill: false,
          pointRadius: 1,
          borderWidth: 3,
          yAxisID: 'y1'
        },
        {
          label: 'TFR projeté',
          data: projectedTfr,
          borderColor: 'orange',
          backgroundColor: 'orange',
          fill: false,
          pointRadius: 1,
          borderWidth: 3,
          borderDash: [5, 5],
          yAxisID: 'y1'
        }
      );
    }

    const data = { datasets };

    chartInstance = new Chart(chartCanvas.value.getContext('2d'), {
      type: 'line',
      data: data,
      options: chartOptions.value
    });
  }
}

watch(() => [props.historical, props.projected, props.yearRange], updateChart, { immediate: true });
watch(showTFR, updateChart);

// Chart options
const chartOptions = computed(() => {
  if (!props.yearRange) {
    return {};
  }

  return {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Year' },
        min: props.yearRange[0],
        max: props.yearRange[1],
        ticks: {
          callback: function(value) {
            return value; // Display as number
          }
        }
      },
      y: {
        title: { display: true, text: 'Population (Millions)' },
        beginAtZero: false
      },
      ...(showTFR.value ? {
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'TFR - Taux de Fécondité Total' },
          beginAtZero: false,
          grid: { drawOnChartArea: false }
        }
      } : {})
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y.toFixed(2)}M`
        }
      }
    }
  };
});
</script>

<style scoped>
.h-96 {
  height: 24rem;
}
</style>