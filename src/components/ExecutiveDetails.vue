<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Détails des élus
    </v-card-title>
    
    <v-card-text>
      <div v-if="loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
      </div>
      
      <div v-else-if="data && data.executives && data.executives.length > 0">
        <div class="space-y-4">
          <v-card
            v-for="executive in data.executives"
            :key="executive.id"
            variant="outlined"
            class="mb-3 executive-card"
          >
            <v-card-text>
              <div class="d-flex justify-space-between align-start mb-2">
                <h3 class="font-weight-semibold">{{ executive.nom }}</h3>
                <span class="text-caption text-grey">{{ executive.fonction }}</span>
              </div>
              
              <v-row>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center">
                    <span class="text-body-2 text-grey-darken-1">Parti:</span>
                    <span class="font-weight-medium ml-1">{{ executive.parti || 'N/A' }}</span>
                  </div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="d-flex align-center">
                    <span class="text-body-2 text-grey-darken-1">Mandat:</span>
                    <span class="font-weight-medium ml-1">{{ executive.mandat || 'N/A' }}</span>
                  </div>
                </v-col>
              </v-row>
              
              <div v-if="executive.description" class="mt-2 text-body-2 text-grey-darken-1">
                {{ executive.description }}
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <div v-else class="text-center py-8 text-grey">
        <p v-if="location.type === 'france'">
          Sélectionnez un département ou une commune pour voir les détails des élus.
        </p>
        <p v-else>
          Aucune information disponible sur les élus.
        </p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'ExecutiveDetails',
  props: {
    location: {
      type: Object,
      required: true
    },
    data: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      loading: false
    }
  },
  methods: {
    async loadData() {
      if (!this.location || this.location.type === 'france') return
      
      this.loading = true
      try {
        const response = await fetch(`/api/executives?type=${this.location.type}&code=${this.location.code}`)
        const data = await response.json()
        this.$emit('data-loaded', data)
      } catch (error) {
        console.error('Erreur chargement données élus:', error)
      } finally {
        this.loading = false
      }
    }
  },
  
  watch: {
    location: {
      handler() {
        this.loadData()
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.space-y-4 > * + * {
  margin-top: 1rem;
}

.executive-card {
  transition: box-shadow 0.2s ease-in-out;
}

.executive-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style> 