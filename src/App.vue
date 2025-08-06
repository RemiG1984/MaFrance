<template>
  <v-app>
    <!-- Header -->
    <v-app-bar app color="primary" dark>
      <v-container class="d-flex align-center">
        <v-app-bar-title class="text-h5 font-weight-bold">
          {{ currentPageTitle }}
        </v-app-bar-title>
        
        <v-spacer></v-spacer>
        
        <v-btn
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          variant="text"
          class="mx-2"
        >
          {{ item.title }}
        </v-btn>
        
        <v-btn
          href="https://twitter.com/intent/tweet?text=Ma%20France%3A%20%C3%A9tat%20des%20lieux%20-%20Une%20analyse%20d%C3%A9taill%C3%A9e%20des%20indicateurs%20sociaux%20en%20France&url=https://mafranceetatdeslieux.fr"
          target="_blank"
          variant="text"
          class="mx-2"
          prepend-icon="mdi-twitter"
        >
          Twitter
        </v-btn>
        
        <VersionSelector />
      </v-container>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer app color="grey-lighten-3" class="text-center">
      <v-container>
        <span class="text-caption text-grey-darken-1">
          © 2025 Ma France - Etat des lieux.
        </span>
      </v-container>
    </v-footer>
  </v-app>
</template>
<script>
import VersionSelector from './components/VersionSelector.vue'
import { mapStores } from 'pinia'
import { useDataStore } from './services/store.js'

export default {
  name: 'App',
  components: {
    VersionSelector
  },
  computed: {
    ...mapStores(useDataStore),
    currentPageTitle() {
      return this.dataStore.getCurrentPageTitle()
    }
  },
  data() {
    return {
      menuItems: [
        { title: 'Accueil', path: '/' },
        { title: 'Classements', path: '/classements' },
        { title: 'Méthodologie', path: '/methodologie' }
      ]
    }
  }
}
</script>

<style>
/* Styles globaux */
.v-application {
  font-family: 'Roboto', sans-serif !important;
}

/* Styles pour les liens actifs */
.v-btn--active {
  background-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
