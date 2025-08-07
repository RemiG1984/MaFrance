<template>
  <v-app>
    <!-- Header -->
    <v-app-bar app color="primary" dark>
      <div class="header-content-wrapper">
        <v-app-bar-title class="text-h5 font-weight-bold">
          {{ currentPageTitle }}
        </v-app-bar-title>
       
        <div class="header-menu">
          <v-btn
            href="https://twitter.com/intent/follow?screen_name=ou_va_ma_France"
            target="_blank"
            variant="text"
            class="mx-2 twitter-btn"
            prepend-icon="mdi-close"
          >
            @ou_va_ma_France
          </v-btn>
   
          <v-btn
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            variant="text"
            class="mx-2"
          >
            {{ item.title }}
          </v-btn>
         
          <VersionSelector />
        </div>
      </div>
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

/* Style pour le bouton Twitter */
.twitter-btn {
  background-color: #000000 !important; /* Black background */
  color: #ffffff !important; /* White text for contrast */
}

/* Header layout */
.header-content-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 24px;
}

.header-menu {
  display: flex;
  align-items: center;
}

@media (min-width: 1600px) {
  .header-content-wrapper {
    max-width: 1520px;
  }
}
</style>