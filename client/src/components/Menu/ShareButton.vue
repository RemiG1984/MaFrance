<template>
  <v-menu offset-y>
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" variant="text" class="mx-2" :title="shareButtonTitle">
        <v-icon start>mdi-share-variant</v-icon>
        <span v-if="showText">{{ isEnglish ? 'Share' : 'Partager' }}</span>
      </v-btn>
    </template>
    <v-card min-width="300">
      <v-card-title class="text-subtitle-1">
        {{ isEnglish ? 'Share this visualization' : 'Partager cette visualisation' }}
      </v-card-title>
      <v-card-text>
        <v-text-field
          v-model="shareUrl"
          :label="isEnglish ? 'Link to share' : 'Lien à partager'"
          readonly
          variant="outlined"
          density="compact"
          append-inner-icon="mdi-content-copy"
          @click:append-inner="copyToClipboard"
          hide-details
        />
        <div class="mt-3 text-caption text-medium-emphasis">
          {{ shareLocation }} - {{shareVersion }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          @click="copyToClipboard"
          color="primary"
          variant="text"
          size="small"
        >
          <v-icon start>mdi-content-copy</v-icon>
          {{ isEnglish ? 'Copy' : 'Copier' }}
        </v-btn>
        <v-btn
          @click="shareOnTwitter"
          color="primary"
          variant="text"
          size="small"
        >
          <v-icon start>mdi-twitter</v-icon>
          Twitter
        </v-btn>
        <v-btn
          @click="shareOnFacebook"
          color="primary"
          variant="text"
          size="small"
        >
          <v-icon start>mdi-facebook</v-icon>
          Facebook
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
import { mapStores } from 'pinia'
import { useDataStore } from '../../services/store.js'
import { DepartementNames } from '../../utils/departementNames.js'
import { MetricsConfig } from '../../utils/metricsConfig.js'

export default {
  name: 'ShareButton',
  props: {
    showText: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      copied: false
    }
  },
  computed: {
    ...mapStores(useDataStore),

    isEnglish() {
      return this.dataStore.labelState === 3;
    },

    shareUrl() {
      const baseUrl = window.location.origin
      const params = new URLSearchParams()

      // Add version parameter
      if (this.dataStore.labelState !== 0) {
        if (this.dataStore.labelState === 3) {
          params.set('v', 'en')
        } else {
          params.set('v', this.dataStore.labelState.toString())
        }
      }

      // Add location parameter based on current level
      if (this.dataStore.currentLevel === 'departement') {
        const deptCode = this.dataStore.getDepartementCode()
        if (deptCode) {
          params.set('c', deptCode)
        }
      } else if (this.dataStore.currentLevel === 'commune') {
        const communeCode = this.dataStore.getCommuneCode()
        if (communeCode) {
          params.set('c', communeCode)
        }
      }

      // Add selected metric if available
      const selectedMetric = this.dataStore.selectedMetric
      if (selectedMetric && selectedMetric !== 'default') {
        const compactMetric = MetricsConfig.getCompactMetric(selectedMetric)
        params.set('m', compactMetric)
      }

      const queryString = params.toString()
      return queryString ? `${baseUrl}/?${queryString}` : baseUrl
    },

    shareLocation() {
      let location = 'France'
      if (this.dataStore.currentLevel === 'departement') {
        const deptCode = this.dataStore.getDepartementCode()
        const deptName = DepartementNames[deptCode]
        location = deptName ? `${deptCode} - ${deptName}` : `Département ${deptCode}`
      } else if (this.dataStore.currentLevel === 'commune') {
        const communeName = this.dataStore.levels.commune
        const deptCode = this.dataStore.getDepartementCode()
        location = `${communeName} (${deptCode})`
      }
      return location
    },

    shareVersion() {
      return this.dataStore.getCurrentVersionLabel()
    },


    shareButtonTitle() {
      return this.isEnglish ? `Share: ${this.shareLocation}` : `Partager: ${this.shareLocation}`
    },

    shareText() {
      return this.isEnglish ? 
        `Discover data for ${this.shareLocation} on:` : 
        `Découvrez les données de ${this.shareLocation} sur:`
    }
  },

  methods: {
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.shareUrl)
        this.copied = true

        // Show a brief feedback (you could also use a snackbar here)
        setTimeout(() => {
          this.copied = false
        }, 2000)
      } catch (error) {
        console.error('Failed to copy to clipboard:', error)
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = this.shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
    },

    shareOnTwitter() {
      const text = encodeURIComponent(this.shareText)
      const url = encodeURIComponent(this.shareUrl)
      const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
      window.open(twitterUrl, '_blank', 'width=600,height=400')
    },

    shareOnFacebook() {
      const url = encodeURIComponent(this.shareUrl)
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
      window.open(facebookUrl, '_blank', 'width=600,height=400')
    }
  }
}
</script>

<style scoped>
.v-card-actions {
  padding-top: 0;
}
</style>