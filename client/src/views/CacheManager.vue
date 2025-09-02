
<template>
  <v-container fluid class="pa-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold mb-4">Cache Management</h1>
      </v-col>
    </v-row>
    
    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-4">
          <v-card-title class="text-h6">
            Cache Statistics
          </v-card-title>
          
          <v-card-text>
            <div class="mb-4">
              <p>Memory Cache: {{ stats.memory }} items</p>
              <p>Persistent Cache: {{ stats.persistent }} items</p>
              <p>Total: {{ stats.total }} items</p>
            </div>
            
            <v-btn 
              color="warning" 
              @click="clearCache"
              class="mr-2"
            >
              Clear Cache
            </v-btn>
            
            <v-btn 
              color="primary" 
              @click="refreshStats"
            >
              Refresh Stats
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import api from '../services/api.js'

export default {
  name: 'CacheManager',
  data() {
    return {
      stats: {
        memory: 0,
        persistent: 0,
        total: 0
      }
    }
  },
  mounted() {
    this.refreshStats()
  },
  methods: {
    clearCache() {
      api.clearCache()
      this.refreshStats()
      this.$emit('cache-cleared')
    },
    
    refreshStats() {
      this.stats = api.getCacheStats()
    }
  }
}
</script>

<style scoped>
/* Add any additional styles if needed */
</style>
