<template>
  <v-menu offset-y>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="text"
        class="mx-2"
        append-icon="mdi-chevron-down"
      >
        {{ currentVersionLabel }}
      </v-btn>
    </template>
    <v-list>
      <v-list-item
        v-for="(option, index) in versionOptions"
        :key="index"
        :class="{ 'v-list-item--active': labelState === index }"
        @click="selectVersion(index)"
      >
        <v-list-item-title>{{ option.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../../services/store.js';
import { MetricsConfig } from '../../utils/metricsConfig.js';

export default {
  name: 'VersionSelector',
  computed: {
    ...mapStores(useDataStore),
    labelState() {
      return this.dataStore.labelState;
    },
    currentVersionLabel() {
      return this.dataStore.getCurrentVersionLabel();
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
        },
        {
          label: MetricsConfig.versionLabels?.english || 'English Version',
          value: 3
        }
      ];
    }
  },
  mounted() {
    // Set initial page title
    this.updatePageTitle();
  },
  methods: {
    selectVersion(index) {
      this.dataStore.setLabelState(index);
      this.updatePageTitle();

      // Dispatch event to notify components about version change
      window.dispatchEvent(new CustomEvent('versionChanged', {
        detail: { labelState: index }
      }));
    },
    updatePageTitle() {
      const newTitle = this.dataStore.getCurrentPageTitle();
      document.title = newTitle;

      // Update header h1 only on Home page
      if (this.$route.name === 'Home') {
        const headerH1 = document.querySelector('h1');
        if (headerH1) {
          headerH1.textContent = newTitle;
        }
      }
    }
  }
};
</script>

<style scoped>
.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
</style>
