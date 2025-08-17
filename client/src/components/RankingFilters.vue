
<template>
  <div class="ranking-filters">
    <!-- Main Controls -->
    <div class="main-controls">
      <div class="form-group">
        <label for="scopeSelect">Portée :</label>
        <select id="scopeSelect" :value="selectedScope" @change="onScopeChange">
          <option value="departements">Départements</option>
          <option value="communes_dept">Communes (par département)</option>
          <option value="communes_france">Communes (France entière)</option>
        </select>
      </div>

      <div v-show="selectedScope === 'communes_dept'" class="form-group">
        <label for="departementSelect">Département :</label>
        <select id="departementSelect" :value="selectedDepartement" @change="onDepartementChange">
          <option value="">-- Tous les départements --</option>
          <option 
            v-for="dept in departments" 
            :key="dept.code" 
            :value="dept.code"
          >
            {{ dept.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="metricSelect">Métrique :</label>
        <select id="metricSelect" :value="selectedMetric" @change="onMetricChange">
          <option value="">-- Choisir une métrique --</option>
          <option 
            v-for="option in availableMetricOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Advanced Filters Toggle -->
    <button class="tweaking-toggle" @click="showFilters = !showFilters">
      Paramètres avancés
    </button>

    <div class="tweaking-box" :class="{ active: showFilters }">
      <!-- Desktop Layout: Top Limit and Population Controls on Same Line -->
      <div class="advanced-controls-row">
        <div class="form-group">
          <label for="topLimit">Nombre de résultats (Top/Bottom) :</label>
          <input 
            type="number" 
            id="topLimit" 
            :value="filters.topLimit"
            @input="onFilterChange('topLimit', $event)"
            min="1" 
            max="100"
          >
        </div>

        <div v-show="localScope.includes('communes')" class="population-controls">
          <div class="form-group">
            <label for="popLower">Population min:</label>
            <input 
              type="number" 
              id="popLower" 
              :value="localFilters.popLower || ''"
              @input="onFilterChange('popLower', $event)"
              min="0" 
              max="10000000"
              step="1000"
              placeholder="Ex: 1000"
            >
          </div>

          <div class="form-group">
            <label for="popUpper">Population max:</label>
            <input 
              type="number" 
              id="popUpper" 
              :value="localFilters.popUpper || ''"
              @input="onFilterChange('popUpper', $event)"
              min="0" 
              max="10000000"
              step="1000"
              placeholder="Ex: 50000"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useDataStore } from '../services/store.js'
import { MetricsConfig } from '../utils/metricsConfig.js'
import { DepartementNames } from '../utils/departementNames.js'

export default {
  name: 'RankingFilters',
  props: {
    selectedScope: {
      type: String,
      default: 'departements'
    },
    selectedDepartement: {
      type: String,
      default: ''
    },
    selectedMetric: {
      type: String,
      default: ''
    },
    filters: {
      type: Object,
      default: () => ({
        popLower: null,
        popUpper: null,
        topLimit: 10
      })
    }
  },
  emits: ['filters-changed', 'selection-changed'],
  setup(props, { emit }) {
    const store = useDataStore()

    // Local state to manage dropdown selections within the component
    const localScope = ref(props.selectedScope)
    const localDepartement = ref(props.selectedDepartement)
    const localMetric = ref(props.selectedMetric)
    const localFilters = ref({ ...props.filters })

    // UI state only
    const showFilters = ref(false)

    // Debounce timer for population filters
    let populationDebounceTimer = null

    // Helper function to update the current level based on scope
    const updateCurrentLevel = () => {
      // This function is implicitly used in computed properties and watchers
    }

    // Computed properties based on props and local state
    const currentLevel = computed(() => {
      return localScope.value.includes('communes') ? 'commune' : 'departement'
    })

    const availableMetricOptions = computed(() => {
      const level = currentLevel.value
      // Force reactivity to store label state changes
      const labelState = store.labelState

      // Sync MetricsConfig label state with store before getting options
      MetricsConfig.labelState = labelState

      return MetricsConfig.getAvailableMetricOptions(level)
    })

    // Validate population filters
    const validatePopulationFilters = () => {
      const { popLower, popUpper } = localFilters.value
      
      // Convert to numbers for comparison
      const lowerNum = popLower ? parseInt(popLower, 10) : null
      const upperNum = popUpper ? parseInt(popUpper, 10) : null
      
      // Validate that lower is less than upper if both are set
      if (lowerNum !== null && upperNum !== null && lowerNum >= upperNum) {
        return false
      }
      
      return true
    }

    const departments = computed(() => {
      return Object.entries(DepartementNames)
        .sort(([a], [b]) => {
          const parseCode = (code) => {
            if (code === '2A') return 20.1
            if (code === '2B') return 20.2
            return parseInt(code, 10)
          }
          return parseCode(a) - parseCode(b)
        })
        .map(([code, name]) => ({
          code,
          name: `${code} - ${name}`
        }))
    })

    // Event handlers - emit to parent
    const emitSelectionChange = (payload) => {
      emit('selection-changed', payload)
    }

    const emitFiltersChange = (payload) => {
      emit('filters-changed', payload)
    }

    const onScopeChange = (event) => {
      localScope.value = event.target.value
      emitSelectionChange({
        scope: localScope.value,
        departement: '',
        metric: '',
        level: localScope.value.includes('communes') ? 'commune' : 'departement'
      })
    }

    const onDepartementChange = (event) => {
      localDepartement.value = event.target.value
      emitSelectionChange({
        scope: localScope.value,
        departement: localDepartement.value,
        metric: localMetric.value,
        level: currentLevel.value
      })
    }

    const onMetricChange = (event) => {
      localMetric.value = event.target.value
      emitSelectionChange({
        scope: localScope.value,
        departement: localDepartement.value,
        metric: localMetric.value,
        level: currentLevel.value
      })
    }

    const onFilterChange = (filterKey, event) => {
      let value = event.target.value
      
      // Handle number inputs for population filters
      if (filterKey === 'popLower' || filterKey === 'popUpper') {
        value = value ? parseInt(value, 10) : null
        // Validate the value is positive
        if (value !== null && value < 0) {
          value = 0
        }
      } else if (event.target.type === 'number') {
        value = parseInt(value, 10)
      }

      localFilters.value = { ...localFilters.value, [filterKey]: value }

      // Handle population filters with debounce
      if (filterKey === 'popLower' || filterKey === 'popUpper') {
        // Clear existing timer
        if (populationDebounceTimer) {
          clearTimeout(populationDebounceTimer)
        }
        
        // Set new timer - emit after 800ms of no typing
        populationDebounceTimer = setTimeout(() => {
          if (validatePopulationFilters()) {
            emitFiltersChange(localFilters.value)
          }
        }, 1200)
      } else {
        // Non-population filters emit immediately
        emitFiltersChange(localFilters.value)
      }
    }

    // Watchers
    watch(() => props.selectedScope, (newScope) => {
      localScope.value = newScope
    })

    watch(() => props.selectedDepartement, (newDept) => {
      localDepartement.value = newDept
    })

    watch(() => props.selectedMetric, (newMetric) => {
      localMetric.value = newMetric
    })

    watch(() => props.filters, (newFilters) => {
      localFilters.value = { ...newFilters }
    }, { deep: true })

    // Watch for label state changes from store
    watch(() => store.labelState, () => {
      // Force re-computation of metric options when label state changes
      // This ensures dropdown labels update immediately
    })

    onMounted(() => {
      // updateCurrentLevel() // No longer needed here, currentLevel is computed

      // Listen for global label state changes from MetricsConfig
      const handleLabelChange = () => {
        // Force reactivity by triggering a re-render
        // The computed metricOptions will automatically update
      }

      window.addEventListener('metricsLabelsToggled', handleLabelChange)
    })

    onUnmounted(() => {
      // Clean up debounce timer
      if (populationDebounceTimer) {
        clearTimeout(populationDebounceTimer)
      }
      
      // Clean up event listener
      window.removeEventListener('metricsLabelsToggled', () => {})
    })

    return {
      store,
      localScope,
      localDepartement,
      localMetric,
      localFilters,
      showFilters,
      currentLevel,
      availableMetricOptions,
      departments,
      validatePopulationFilters,
      onScopeChange,
      onDepartementChange,
      onMetricChange,
      onFilterChange,
      emitSelectionChange,
      emitFiltersChange
    }
  }
}
</script>

<style scoped>
.ranking-filters {
  position: relative;
}

.main-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.tweaking-toggle {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.tweaking-toggle:hover {
  background: #0056b3;
}

.tweaking-box {
  display: none;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 20px;
  margin-top: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.tweaking-box.active {
  display: block;
  border-color: #007bff;
  box-shadow: 0 2px 12px rgba(0, 123, 255, 0.2);
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.advanced-controls-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.population-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
  font-size: 14px;
}

.form-group select,
.form-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.tweaking-box.active .form-group input,
.tweaking-box.active .form-group select {
  border-color: #b3d9ff;
}

@media (max-width: 768px) {
  .main-controls {
    flex-direction: column;
    gap: 15px;
  }

  .advanced-controls-row {
    flex-direction: column;
    gap: 15px;
  }

  .population-controls {
    flex-direction: column;
    gap: 10px;
  }

  .form-group {
    min-width: auto;
    width: 100%;
  }

  .form-group select,
  .form-group input {
    width: 100%;
    box-sizing: border-box;
  }
}

@media (max-width: 480px) {
  .tweaking-box {
    padding: 15px;
  }

  .form-group {
    margin-bottom: 10px;
  }
}
</style>
