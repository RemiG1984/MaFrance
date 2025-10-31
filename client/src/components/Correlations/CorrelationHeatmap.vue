<template>
  <div class="heatmap-container">
    <div class="chart-wrapper">
      <canvas :id="chartId" ref="chartCanvas" class="correlation-chart" />
    </div>

    <!-- Legend -->
    <div class="correlation-legend">
      <div class="legend-title">
        {{ isEnglish ? 'Correlation intensity' : 'Intensité des corrélations' }}
      </div>
      <div class="legend-scale">
        <div class="legend-item">
          <div class="legend-color" style="background: #b10026" />
          <span>{{ isEnglish ? 'Very strong (+0.7)' : 'Très forte (+0.7)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #e31a1c" />
          <span>{{ isEnglish ? 'Strong (+0.5)' : 'Forte (+0.5)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fd8d3c" />
          <span>{{ isEnglish ? 'Moderate (+0.3)' : 'Modérée (+0.3)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #fecc5c" />
          <span>{{ isEnglish ? 'Weak (+0.1)' : 'Faible (+0.1)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #ffffb2" />
          <span>{{ isEnglish ? 'Null (0)' : 'Nulle (0)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #c7e9b4" />
          <span>{{ isEnglish ? 'Weak (-0.1)' : 'Faible (-0.1)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #7fcdbb" />
          <span>{{ isEnglish ? 'Moderate (-0.3)' : 'Modérée (-0.3)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #41b6c4" />
          <span>{{ isEnglish ? 'Strong (-0.5)' : 'Forte (-0.5)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #2c7fb8" />
          <span>{{ isEnglish ? 'Very strong (-0.7)' : 'Très forte (-0.7)' }}</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #f0f0f0; border: 2px solid #ccc" />
          <span>{{ isEnglish ? 'Insufficient data' : 'Données insuffisantes' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
import { Chart, registerables } from 'chart.js';
import chroma from 'chroma-js';
import { watermarkPlugin } from '../../utils/chartWatermark.js';
import { useDataStore } from '../../services/store.js';
import { CHART_CONFIG, RANDOM_STRING_CONFIG, BREAKPOINTS } from '../../utils/constants.js';

// Register Chart.js components
Chart.register(...registerables, watermarkPlugin);

const createColorScale = () => {
  const colors = [
    '#2c7fb8', '#41b6c4', '#7fcdbb', '#c7e9b4',
    '#ffffb2', '#fecc5c', '#fd8d3c', '#e31a1c', '#b10026'
  ];
  return chroma.scale(colors).domain(CHART_CONFIG.CORRELATION_COLORS);
};

const getCorrelationColor = (value) => {
  const colorScale = createColorScale();
  return colorScale(value).hex();
};

const wrapLabel = (label) => {
  if (label.length <= CHART_CONFIG.LABEL_WRAP_LENGTH) {
    return label;
  }
  const words = label.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).length > CHART_CONFIG.LABEL_WRAP_LINE_LENGTH) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const createXAxisConfig = (labelsX) => ({
  type: 'linear',
  position: 'top',
  min: 0,
  max: labelsX.length * 2,
  ticks: {
    callback: (value) => {
      if (Number.isInteger(value) && value % 2 === 1) {
        const labelIndex = Math.floor(value / 2);
        if (labelIndex >= 0 && labelIndex < labelsX.length) {
          return wrapLabel(labelsX[labelIndex]);
        }
      }
      return '';
    },
    stepSize: CHART_CONFIG.STEP_SIZE,
    font: {
      size: CHART_CONFIG.TICK_FONT_SIZE,
      weight: 'bold'
    },
    maxRotation: CHART_CONFIG.MAX_ROTATION,
    minRotation: CHART_CONFIG.MAX_ROTATION,
    padding: CHART_CONFIG.TICK_PADDING,
    align: 'center'
  },
  grid: {
    display: true,
    color: (context) => {
      const val = context.tick.value;
      return Number.isInteger(val) && val % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)';
    },
    lineWidth: CHART_CONFIG.BORDER_WIDTH,
    drawOnChartArea: true,
    drawTicks: false,
    z: 1
  },
  border: {
    display: true,
    color: 'rgba(0,0,0,0.5)',
    width: CHART_CONFIG.BORDER_WIDTH
  }
});

const createYAxisConfig = (labelsY) => ({
  type: 'linear',
  min: 0,
  max: labelsY.length * 2,
  ticks: {
    callback: (value) => {
      if (Number.isInteger(value) && value % 2 === 1) {
        const actualIndex = Math.floor((labelsY.length * 2 - value) / 2);
        if (actualIndex >= 0 && actualIndex < labelsY.length) {
          const label = labelsY[actualIndex];
          if (label.length > CHART_CONFIG.LABEL_TRUNCATE_LENGTH) {
            return label.substring(0, CHART_CONFIG.LABEL_TRUNCATE_DISPLAY) + '...';
          } else {
            return label;
          }
        }
      }
      return '';
    },
    stepSize: CHART_CONFIG.STEP_SIZE,
    font: {
      size: CHART_CONFIG.TICK_FONT_SIZE,
      weight: 'bold'
    },
    padding: CHART_CONFIG.TICK_PADDING,
    align: 'center',
    maxRotation: 0,
    minRotation: 0
  },
  grid: {
    display: true,
    color: (context) => {
      const value = context.tick.value;
      return Number.isInteger(value) && value % 2 === 0 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)';
    },
    lineWidth: CHART_CONFIG.BORDER_WIDTH,
    drawOnChartArea: true,
    drawTicks: false,
    z: 1
  },
  border: {
    display: true,
    color: 'rgba(0,0,0,0.5)',
    width: CHART_CONFIG.BORDER_WIDTH
  }
});

const createHeatmapData = (matrix, labels) => {
  const data = [];

  // Labels should always be in { x: [], y: [] } format now
  const labelsX = labels?.x || [];
  const labelsY = labels?.y || [];

  if (!isValidMatrix(matrix)) {
    return data;
  }

  for (let i = 0; i < matrix.length; i++) {
    if (!Array.isArray(matrix[i])) {
      continue;
    }

    processMatrixRow(matrix, labels, labelsX, labelsY, i, data);
  }

  return data;
};

const isValidMatrix = (matrix) => matrix && Array.isArray(matrix) && matrix.length > 0;

const processMatrixRow = (matrix, labels, labelsX, labelsY, rowIndex, data) => {
  for (let j = 0; j < matrix[rowIndex].length; j++) {
    const value = matrix[rowIndex][j];
    const isInsufficientData = isInsufficientDataValue(value);
    const displayValue = isInsufficientData ? 0 : Number(value);

    data.push(createDataPoint({
      originalValue: value,
      displayValue,
      isInsufficientData,
      labelsX,
      labelsY,
      labels,
      colIndex: j,
      rowIndex,
      matrixLength: matrix.length
    }));
  }
};

const isInsufficientDataValue = (value) => value === null || value === undefined || isNaN(value);

const createDataPoint = (data) => ({
  x: data.colIndex * 2 + 1, // Place marks at 1, 3, 5, etc.
  y: (data.matrixLength - 1 - data.rowIndex) * 2 + 1, // Place marks at 1, 3, 5, etc. with inversion
  v: data.displayValue,
  originalValue: data.originalValue,
  xLabel: data.labelsX[data.colIndex] || `Metric X${data.colIndex}`,
  yLabel: data.labelsY[data.rowIndex] || `Metric Y${data.rowIndex}`,
  xMetricKey: data.labels?.xKeys?.[data.colIndex] || data.labelsX[data.colIndex],
  yMetricKey: data.labels?.yKeys?.[data.rowIndex] || data.labelsY[data.rowIndex],
  isInsufficientData: data.isInsufficientData
});

const createChartOptions = (labelsX, labelsY, _cellSize, props, emit, createTooltipLabel) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: CHART_CONFIG.ANIMATION_DURATION
  },
  interaction: {
    intersect: false,
    mode: 'point'
  },
  plugins: {
    title: {
      display: true,
      text: props.title,
      font: {
        size: CHART_CONFIG.TITLE_FONT_SIZE,
        weight: 'bold'
      },
      padding: CHART_CONFIG.PADDING
    },
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        title: () => '',
        label: (context) => createTooltipLabel(context.raw)
      },
      backgroundColor: 'rgba(0,0,0,0.8)',
      titleColor: 'white',
      bodyColor: 'white',
      borderColor: '#ccc',
      borderWidth: 1,
      padding: CHART_CONFIG.PADDING,
      displayColors: false
    }
  },
  scales: {
    x: createXAxisConfig(labelsX),
    y: createYAxisConfig(labelsY)
  },
  onHover: (_event, elements) => {
    if (elements.length > 0) {
      const element = elements[0];
      const data = element.element.$context.raw;
      emit('correlation-hover', {
        metric1: data.xLabel,
        metric2: data.yLabel,
        correlation: data.v
      });
    }
  },
  onClick: (_event, elements) => {
    if (elements.length > 0) {
      const element = elements[0];
      const data = element.element.$context.raw;
      emit('correlation-click', {
        metric1: data.xMetricKey || data.xLabel,
        metric2: data.yMetricKey || data.yLabel,
        correlation: data.originalValue !== undefined ? data.originalValue : data.v
      });
    }
  }
});

const createChartPlugins = (_cellSize) => [{
  id: 'correlationLabels',
  afterDatasetsDraw: (chart) => {
    const chartCtx = chart.ctx;
    const dataset = chart.data.datasets[0];

    chart.getDatasetMeta(0).data.forEach((element, index) => {
      const point = dataset.data[index];
      if (!point || point.isInsufficientData) {
        return;
      }

      const value = point.originalValue !== undefined ? point.originalValue : point.v;
      if (value === null || isNaN(value)) {
        return;
      }

      const { x, y } = element.getProps(['x', 'y']);

      chartCtx.save();
      chartCtx.font = `bold ${Math.max(CHART_CONFIG.FONT_SIZE_MIN, Math.min(CHART_CONFIG.FONT_SIZE_MAX, _cellSize / 4))}px Arial`;
      chartCtx.textAlign = 'center';
      chartCtx.textBaseline = 'middle';

      const absValue = Math.abs(value);
      if (absValue > CHART_CONFIG.OPACITY) {
        chartCtx.fillStyle = 'white';
      } else {
        chartCtx.fillStyle = 'black';
      }

      chartCtx.fillText(value.toFixed(2), x, y);
      chartCtx.restore();
    });
  }
}];

const getCorrelationStrength = (absCorr, isEnglish) => {
  if (absCorr >= CHART_CONFIG.CORRELATION_THRESHOLDS[3]) {
    return isEnglish ? 'very strong' : 'très forte';
  }
  if (absCorr >= CHART_CONFIG.CORRELATION_THRESHOLDS[2]) {
    return isEnglish ? 'strong' : 'forte';
  }
  if (absCorr >= CHART_CONFIG.CORRELATION_THRESHOLDS[1]) {
    return isEnglish ? 'moderate' : 'modérée';
  }
  if (absCorr >= CHART_CONFIG.CORRELATION_THRESHOLDS[0]) {
    return isEnglish ? 'weak' : 'faible';
  }
  return isEnglish ? 'very weak' : 'très faible';
};

const getCorrelationDirection = (correlation, isEnglish) => {
  if (correlation > 0) {
    return isEnglish ? 'positive' : 'positive';
  }
  if (correlation < 0) {
    return isEnglish ? 'negative' : 'négative';
  }
  return isEnglish ? 'null' : 'nulle';
};

const createInsufficientDataLabel = (point, isEnglish) => [
  `${point.xLabel} ↔ ${point.yLabel}`,
  isEnglish ? 'Insufficient data' : 'Données insuffisantes',
  isEnglish ? `Less than ${CHART_CONFIG.INSUFFICIENT_DATA_THRESHOLD} valid observations` : `Moins de ${CHART_CONFIG.INSUFFICIENT_DATA_THRESHOLD} observations valides`
];

const createCorrelationLabel = (point, isEnglish) => {
  const correlation = point.originalValue || point.v;
  const absCorr = Math.abs(correlation);
  const strength = getCorrelationStrength(absCorr, isEnglish);
  const direction = getCorrelationDirection(correlation, isEnglish);

  return [
    `${point.xLabel} ↔ ${point.yLabel}`,
    `${isEnglish ? 'Correlation:' : 'Corrélation:'} ${correlation.toFixed(3)}`,
    `${isEnglish ? 'Strength:' : 'Force:'} ${strength} (${direction})`
  ];
};

const createTooltipLabel = (point, isEnglish) => {
  if (point.isInsufficientData) {
    return createInsufficientDataLabel(point, isEnglish);
  }
  return createCorrelationLabel(point, isEnglish);
};

const createChartDataset = (heatmapData, cellSize) => [{
  label: 'Corrélations',
  data: heatmapData,
  backgroundColor: (context) => {
    const point = context.raw;
    if (point && point.isInsufficientData) {
      return '#f0f0f0';
    }
    if (point && typeof point.v === 'number') {
      return getCorrelationColor(point.v);
    }
    return '#f0f0f0';
  },
  borderColor: 'rgba(0,0,0,0.2)',
  borderWidth: 1,
  pointRadius: cellSize / 2,
  pointHoverRadius: cellSize / 2 + 2,
  pointStyle: 'rect'
}];

const getCellSize = (screenWidth, labelsX, labelsY, canvasElement) => {
  let maxCellSize = CHART_CONFIG.MAX_CELL_SIZE;
  let minCellSize = CHART_CONFIG.MIN_CELL_SIZE;

  // Adjust max/min cell size based on screen width
  if (screenWidth <= BREAKPOINTS.MOBILE) {
    maxCellSize = CHART_CONFIG.MOBILE_MAX_CELL_SIZE;
    minCellSize = CHART_CONFIG.MOBILE_MIN_CELL_SIZE;
  } else if (screenWidth <= BREAKPOINTS.TABLET) {
    maxCellSize = CHART_CONFIG.TABLET_MAX_CELL_SIZE;
    minCellSize = CHART_CONFIG.TABLET_MIN_CELL_SIZE;
  }

  const cellWidth = Math.max(minCellSize, Math.min(maxCellSize, canvasElement.clientWidth / labelsX.length));
  const cellHeight = Math.max(minCellSize, Math.min(maxCellSize, canvasElement.clientHeight / labelsY.length));
  return Math.min(cellWidth, cellHeight);
};

export default {
  name: 'CorrelationHeatmap',
  props: {
    matrix: {
      type: Array,
      required: false,
      default: () => []
    },
    labels: {
      type: [Array, Object],
      required: false,
      default: () => []
    },
    title: {
      type: String,
      default: 'Corrélations'
    }
  },
  emits: ['correlation-hover', 'correlation-click'],
  setup(props, { emit }) {
    const chartCanvas = ref(null);
    const chartId = `correlation-chart-${Date.now()}-${Math.random().toString(RANDOM_STRING_CONFIG.RADIX).substr(RANDOM_STRING_CONFIG.SUBSTR_START, RANDOM_STRING_CONFIG.SUBSTR_LENGTH)}`;
    let chartInstance = null;

    const dataStore = useDataStore();
    const isEnglish = computed(() => dataStore.labelState === 3);

    // Helper functions
    const createTooltipLabelWrapper = (point) => createTooltipLabel(point, isEnglish.value);

    const createChart = async() => {
      if (!chartCanvas.value || !props.matrix.length) {
        return;
      }

      const labelsX = props.labels?.x || [];
      const labelsY = props.labels?.y || [];

      if (labelsX.length === 0 || labelsY.length === 0) {
        return;
      }

      await nextTick();

      const ctx = chartCanvas.value.getContext('2d');
      const heatmapData = createHeatmapData(props.matrix, props.labels);
      const cellSize = getCellSize(window.innerWidth, labelsX, labelsY, chartCanvas.value);

      if (chartInstance) {
        chartInstance.destroy();
      }

      chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
          datasets: createChartDataset(heatmapData, cellSize)
        },
        plugins: createChartPlugins(cellSize),
        options: createChartOptions(labelsX, labelsY, cellSize, props, emit, createTooltipLabelWrapper)
      });
    };

    const resizeChart = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };

    const initializeChart = () => {
      createChart();
      window.addEventListener('resize', resizeChart);
    };

    const cleanupChart = () => {
      if (chartInstance) {
        chartInstance.destroy();
      }
      window.removeEventListener('resize', resizeChart);
    };

    const setupWatchers = () => {
      watch(() => [props.matrix, props.labels], () => {
        createChart();
      }, { deep: true });

      watch(() => props.title, () => {
        if (chartInstance) {
          chartInstance.options.plugins.title.text = props.title;
          chartInstance.update();
        }
      });

      watch(isEnglish, () => {
        createChart();
      });
    };

    const setupLifecycle = () => {
      onMounted(() => {
        initializeChart();
      });

      onUnmounted(() => {
        cleanupChart();
      });
    };

    // Initialize
    setupWatchers();
    setupLifecycle();

    return {
      chartCanvas,
      chartId,
      isEnglish
    };
  }
};
</script>

<style scoped>
.heatmap-container {
  width: 100%;
  position: relative;
}

.chart-wrapper {
  width: 100%;
  height: 600px;
  min-height: 400px;
  position: relative;
  margin-bottom: 20px;
  background: white;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.correlation-chart {
  width: 100% !important;
  height: 100% !important;
}

.correlation-legend {
  background: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.legend-title {
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
  color: #333;
}

.legend-scale {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.2);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 500px;
    padding: 0;
  }

  .legend-scale {
    flex-direction: column;
    align-items: center;
  }

  .legend-item {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    height: 400px;
  }
}
</style>
