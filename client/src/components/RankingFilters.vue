
<template>
  <div class="ranking-filters">
    <button class="tweaking-toggle" @click="toggleFilters">
      Paramètres
    </button>
    
    <div class="tweaking-box" :class="{ active: showFilters }">
      <div class="population-controls">
        <div class="form-group">
          <label for="popLower">Pop min:</label>
          <select id="popLower" v-model="localFilters.popLower" @change="emitFiltersChanged">
            <option :value="null">Aucune limite</option>
            <option :value="1000">1k</option>
            <option :value="10000">10k</option>
            <option :value="100000">100k</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="popUpper">Pop max:</label>
          <select id="popUpper" v-model="localFilters.popUpper" @change="emitFiltersChanged">
            <option :value="null">Aucune limite</option>
            <option :value="1000">1k</option>
            <option :value="10000">10k</option>
            <option :value="100000">100k</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="topLimit">Nombre de résultats (Top/Bottom) :</label>
        <input 
          type="number" 
          id="topLimit" 
          v-model.number="localFilters.topLimit"
          @input="emitFiltersChanged"
          min="1" 
          max="100"
        >
      </div>
      
      <div class="button-container">
        <button @click="applyFilters" class="apply-button">
          Appliquer
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch } from 'vue'

export default {
  name: 'RankingFilters',
  emits: ['filters-changed'],
  setup(props, { emit }) {
    const showFilters = ref(false)
    const localFilters = reactive({
      popLower: null,
      popUpper: null,
      topLimit: 10
    })

    const toggleFilters = () => {
      showFilters.value = !showFilters.value
    }

    const validateFilters = () => {
      const validPopValues = [1000, 10000, 100000]
      
      if (localFilters.popLower !== null && !validPopValues.includes(localFilters.popLower)) {
        return "Valeur de population minimale invalide."
      }
      
      if (localFilters.popUpper !== null && !validPopValues.includes(localFilters.popUpper)) {
        return "Valeur de population maximale invalide."
      }
      
      if (localFilters.popLower !== null && localFilters.popUpper !== null && localFilters.popLower > localFilters.popUpper) {
        return "La population minimale ne peut pas être supérieure à la population maximale."
      }
      
      return null
    }

    const emitFiltersChanged = () => {
      const error = validateFilters()
      if (!error) {
        emit('filters-changed', { ...localFilters })
      }
    }

    const applyFilters = () => {
      emitFiltersChanged()
    }

    // Watch for changes and validate
    watch(localFilters, () => {
      const error = validateFilters()
      if (error) {
        console.warn('Filter validation error:', error)
      }
    })

    return {
      showFilters,
      localFilters,
      toggleFilters,
      emitFiltersChanged,
      applyFilters
    }
  }
}
</script>

<style scoped>
.ranking-filters {
  position: relative;
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
}

.tweaking-box.active {
  display: block;
}

.population-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
  font-size: 14px;
}

.form-group select,
.form-group input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.button-container {
  margin-top: 15px;
}

.apply-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.apply-button:hover {
  background: #218838;
}

@media (max-width: 768px) {
  .population-controls {
    flex-direction: column;
  }
  
  .form-group {
    min-width: auto;
  }
}
</style>
