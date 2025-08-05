<template>
  <v-card class="mb-4">
    <v-card-title class="text-h5">
      Scores pour {{ location.name }}
    </v-card-title>
    
    <v-card-text>
      <v-table
        v-if="scores.length > 0"
      >
        <thead>
          <tr>
            <th></th>
            <th v-for="level in scores">
              {{level.label}}
            </th>
          </tr>
        </thead>
        <template v-slot:body="{ items, headers }">
          <tbody>
            <transition-group name="fade-slide" tag="tbody" appear>
              <tr 
                v-for="item in items" 
                :key="item.id"
                :class="{ 'category-row': item.type === 'category' }"
              >
                <td v-for="header in headers" :key="header.value">
                  <div v-if="item.type === 'category'" class="category-content">
                    <v-btn 
                      icon 
                      small 
                      @click="toggleCategory(item)"
                      class="mr-2"
                    >
                      <v-icon>
                        {{ item.isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                      </v-icon>
                    </v-btn>
                    {{ item[header.value] }}
                  </div>
                  <div v-else class="child-content ml-6">
                    {{ item[header.value] }}
                  </div>
                </td>
              </tr>
            </transition-group>
          </tbody>
        </template>
      </v-table>

      <div v-else class="text-center py-8 text-grey">
        Aucune donnée disponible pour cette localisation
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { chartLabels } from '../utils/metricsConfig.js'
import { keyMapping } from '../utils/statsCalc.js'

export default {
  name: 'ScoreTable',
  props: {
    location: {
      type: Object,
      required: true
    },
    scores: {
      type: Object,
      default: null
    }
  },
  mounted() {
    console.log('chartLabels', chartLabels)
  },
  data() {
    return {
      loading: false,
    }
  },
  methods: {

  }
}
</script>
<style scoped>

</style> 