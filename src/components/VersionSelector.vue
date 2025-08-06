import { mapStores } from 'pinia'
import { useDataStore } from '../services/store.js'
import { MetricsConfig } from '../utils/metricsConfig.js'

export default {
  name: 'VersionSelector',
  computed: {
    ...mapStores(useDataStore),
    labelState() {
      return this.dataStore.labelState
    },
    currentVersionLabel() {
      return this.dataStore.getCurrentVersionLabel()
    },
    versionOptions() {
      return [
        {
          label: MetricsConfig.versionLabels?.standard || 'Version Standard',
          value: 0
        },
        {
          label: MetricsConfig.versionLabels?.alt1 || 'Version Alternative 1',
          value: 1
        },
        {
          label: MetricsConfig.versionLabels?.alt2 || 'Version Alternative 2',
          value: 2
        }
      ]
    }
  },
  methods: {
    selectVersion(index) {
      this.dataStore.setLabelState(index)
      this.updatePageTitle()
    },
    updatePageTitle() {
      const newTitle = this.dataStore.getCurrentPageTitle()
      document.title = newTitle

      // Update header h1 if exists
      const headerH1 = document.querySelector('h1')
      if (headerH1) {
        headerH1.textContent = newTitle
      }
    }
  },
  mounted() {
    // Set initial page title
    this.updatePageTitle()
    // Add a placeholder for the Twitter button in the header as per user request.
    // The actual implementation would depend on how the header is structured and managed.
    // For now, we assume a simple addition is possible.
    const headerElement = document.querySelector('header') // Assuming a header element exists
    if (headerElement) {
      const twitterButton = document.createElement('a')
      twitterButton.href = 'https://twitter.com/your_twitter_handle' // Replace with actual Twitter handle
      twitterButton.target = '_blank'
      twitterButton.innerHTML = '<img src="/path/to/twitter-icon.png" alt="Twitter" style="width: 24px; height: 24px;">' // Replace with actual path to twitter icon
      headerElement.appendChild(twitterButton)
    }
  }
}
</script>

<style scoped>
.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
</style>