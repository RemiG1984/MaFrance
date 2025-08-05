<template>
  <div class="rankings">
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Classements</h1>
      
      <!-- Filtres -->
      <div class="mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <select 
            v-model="selectedType" 
            class="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="departements">Départements</option>
            <option value="communes">Communes</option>
          </select>
          
          <select 
            v-model="selectedMetric" 
            class="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Toutes les métriques</option>
            <option v-for="metric in availableMetrics" :key="metric.value" :value="metric.value">
              {{ metric.label }}
            </option>
          </select>
          
          <button 
            @click="toggleOrder" 
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {{ order === 'asc' ? 'Croissant' : 'Décroissant' }}
          </button>
        </div>
      </div>

      <!-- Tableau des classements -->
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white border border-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rang
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {{ selectedType === 'departements' ? 'Département' : 'Commune' }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Détails
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in filteredRankings" :key="item.code" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ index + 1 }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ item.score }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button 
                  @click="viewDetails(item)"
                  class="text-blue-600 hover:text-blue-900"
                >
                  Voir détails
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="mt-6 flex justify-between items-center">
        <div class="text-sm text-gray-700">
          Affichage de {{ startIndex + 1 }} à {{ endIndex }} sur {{ totalItems }} résultats
        </div>
        <div class="flex space-x-2">
          <button 
            @click="previousPage"
            :disabled="currentPage === 1"
            class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Précédent
          </button>
          <button 
            @click="nextPage"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Rankings',
  data() {
    return {
      selectedType: 'departements',
      selectedMetric: '',
      order: 'desc',
      currentPage: 1,
      itemsPerPage: 20,
      rankings: [],
      availableMetrics: [
        { value: 'global', label: 'Score global' },
        { value: 'crime', label: 'Criminalité' },
        { value: 'names', label: 'Évolution des prénoms' },
        { value: 'qpv', label: 'Quartiers prioritaires' }
      ]
    }
  },
  computed: {
    filteredRankings() {
      let filtered = [...this.rankings]
      
      if (this.selectedMetric) {
        filtered = filtered.filter(item => item.metric === this.selectedMetric)
      }
      
      filtered.sort((a, b) => {
        if (this.order === 'asc') {
          return a.score - b.score
        } else {
          return b.score - a.score
        }
      })
      
      return filtered
    },
    totalItems() {
      return this.filteredRankings.length
    },
    totalPages() {
      return Math.ceil(this.totalItems / this.itemsPerPage)
    },
    startIndex() {
      return (this.currentPage - 1) * this.itemsPerPage
    },
    endIndex() {
      return Math.min(this.startIndex + this.itemsPerPage, this.totalItems)
    }
  },
  methods: {
    toggleOrder() {
      this.order = this.order === 'asc' ? 'desc' : 'asc'
    },
    previousPage() {
      if (this.currentPage > 1) {
        this.currentPage--
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++
      }
    },
    viewDetails(item) {
      // Navigation vers la page d'accueil avec l'élément sélectionné
      this.$router.push({ 
        path: '/', 
        query: { 
          type: this.selectedType, 
          code: item.code 
        } 
      })
    },
    async loadRankings() {
      // TODO: Charger les données depuis l'API
      console.log('Loading rankings for:', this.selectedType)
    }
  },
  watch: {
    selectedType() {
      this.loadRankings()
    }
  },
  mounted() {
    this.loadRankings()
  }
}
</script>

<style scoped>
.rankings {
  min-height: 100vh;
}
</style> 