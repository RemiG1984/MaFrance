<template>
  <div class="bg-white p-4 rounded-lg shadow">
    <v-row align="center" class="mb-4">
      <v-col cols="auto">
        <h2 class="text-xl font-semibold">Population Française</h2>
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
    </v-row>
    <div v-if="!chartData" class="text-center p-4">
      Loading data...
    </div>
    <LineChart
      v-if="chartData"
      :key="JSON.stringify(chartData)"
      :data="chartData"
      :options="chartOptions"
      class="h-96"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Line as LineChart } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

// Register Chart.js components
ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, LinearScale, zoomPlugin);

// Props
const props = defineProps({
  historical: Array, // { year, pop }
  projected: Array, // { year, totalPop, births, deaths, netMig }
  yearRange: Array, // [startYear, endYear]
  selectedScale: String
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

// Watch for prop changes
watch(() => props.selectedScale, (newVal) => {
  internalSelectedScale.value = newVal;
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

// Chart data
const chartData = ref(null);

watch(() => [props.historical, props.projected, props.yearRange], () => {
  if (!props.historical || !props.projected || !props.yearRange || props.historical.length === 0) {
    chartData.value = null;
    return;
  }

  const historicalData = interpolateHistoricalData(props.historical, props.yearRange[0], props.yearRange[1]);
  const projectedData = (props.projected || [])
    .filter(d => d.year >= props.yearRange[0] && d.year <= props.yearRange[1])
    .map(d => ({ x: d.year, y: d.totalPop / 1e6 }));

  chartData.value = {
    labels: [], // Not needed for time series, but required by vue-chartjs
    datasets: [
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
    ]
  };
}, { immediate: true });

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
      }
    },
    plugins: {
      zoom: {
        zoom: {
          wheel: { enabled: false },
          pinch: { enabled: false },
          mode: 'x'
        },
        pan: { enabled: false }
      },
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