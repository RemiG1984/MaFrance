
<template>
  <v-card class="mb-4">
    <v-card-title class="text-h6">
      Cache Management
    </v-card-title>
    
    <v-card-text>
      <div class="mb-4">
        <h4>Cache Statistics</h4>
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
