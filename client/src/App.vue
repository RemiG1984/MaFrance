<template>
  <v-app>
    <!-- Header -->
    <v-app-bar app color="primary" dark>
      <div class="header-content-wrapper">
        <v-app-bar-title class="text-h5 font-weight-bold">
          {{ currentPageTitle }}
        </v-app-bar-title>

        <!-- Desktop Menu -->
        <div class="header-menu d-none d-md-flex">
          <v-btn
            href="https://twitter.com/intent/follow?screen_name=ou_va_ma_France"
            target="_blank"
            variant="text"
            class="mx-2 twitter-btn"
          >
            <b>𝕏</b>
            @ou_va_ma_France
          </v-btn>


          <v-btn
            href="https://ko-fi.com/remi63047"
            target="_blank"
            variant="text"
            class="mx-2 kofi-btn"
          >
            <img
              src="/images/kofi_symbol.webp"
              alt="Ko-fi"
              class="kofi-icon"
            />
          </v-btn>


          <template v-for="item in menuItems" :key="item.title">
            <!-- Regular menu item -->
            <v-btn
              v-if="!item.children"
              :to="item.path"
              variant="text"
              class="mx-2"
            >
              {{ item.title }}
            </v-btn>
            
            <!-- Dropdown menu item -->
            <v-menu v-else offset-y>
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  variant="text"
                  class="mx-2"
                  append-icon="mdi-chevron-down"
                >
                  {{ item.title }}
                </v-btn>
              </template>
              <v-list>
                <v-list-item
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                >
                  <v-list-item-title>{{ child.title }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>

        <v-spacer></v-spacer>
        <VersionSelector />
          <ShareButton :showText="false" />
        </div>

        <!-- Mobile Hamburger Menu -->
        <div class="d-flex d-md-none">
          <v-btn
            icon
            @click="mobileMenuOpen = !mobileMenuOpen"
            class="hamburger-btn"
          >
            <hamburger-icon
            color="white"
            :opened="mobileMenuOpen"
            />
          </v-btn>
        </div>
      </div>
    </v-app-bar>

    <!-- Mobile Menu Overlay -->
    <v-navigation-drawer
      v-model="mobileMenuOpen"
      temporary
      location="right"
      class="d-flex d-md-none mobile-menu"
    >
      <v-list>
        <template v-for="item in menuItems" :key="item.title">
          <!-- Regular menu item -->
          <v-list-item
            v-if="!item.children"
            :to="item.path"
            @click="mobileMenuOpen = false"
          >
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
          
          <!-- Expandable menu item -->
          <v-list-group v-else :value="item.title">
            <template v-slot:activator="{ props }">
              <v-list-item v-bind="props">
                <v-list-item-title>{{ item.title }}</v-list-item-title>
              </v-list-item>
            </template>
            <v-list-item
              v-for="child in item.children"
              :key="child.path"
              :to="child.path"
              @click="mobileMenuOpen = false"
              class="pl-8"
            >
              <v-list-item-title>{{ child.title }}</v-list-item-title>
            </v-list-item>
          </v-list-group>
        </template>

        <v-divider class="my-2"></v-divider>

        <v-list-item>
          <VersionSelector />
        </v-list-item>

        <v-list-item>
          <ShareButton :show-text="true" />
        </v-list-item>

        <v-list-item
          href="https://twitter.com/intent/follow?screen_name=ou_va_ma_France"
          target="_blank"
          class="twitter-mobile"
        >
          <v-list-item-title>@ou_va_ma_France</v-list-item-title>
        </v-list-item>

        <v-list-item
          href="https://ko-fi.com/remi63047"
          target="_blank"
          class="kofi-mobile"
        >
          <v-list-item-title>
            <img
              src="/images/kofi_symbol.webp"
              alt="Ko-fi"
              class="kofi-icon-mobile"
            />
            Offrez-moi un café
          </v-list-item-title>
        </v-list-item>

      </v-list>
    </v-navigation-drawer>
    <!-- Main Content -->
    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import VersionSelector from './components/VersionSelector.vue'
import LocationSelector from './components/LocationSelector.vue'
import ShareButton from './components/ShareButton.vue'
import HamburgerIcon from './components/HamburgerIcon.vue'
import { mapStores } from 'pinia'
import { useDataStore } from './services/store.js'

export default {
  name: 'App',
  components: {
    VersionSelector,
    LocationSelector,
    ShareButton,
    HamburgerIcon
  },
  computed: {
    ...mapStores(useDataStore),
    currentPageTitle() {
      return this.dataStore.getCurrentPageTitle()
    }
  },
  data() {
    return {
      mobileMenuOpen: false,
      menuItems: [
        { title: 'Accueil', path: '/' },
        {
          title: 'Outils',
          children: [
            { title: 'Classements', path: '/classements' },
            { title: 'Corrélations', path: '/correlations' },
            { title: 'Localisation', path: '/localisation' }
          ]
        },
        { title: 'Méthodologie', path: '/methodologie' }
      ]
    }
  },
  mounted() {
    // Handle URL parameters for shared links
    this.handleUrlParameters()
    
    // Initialize store to sync with MetricsConfig
    this.dataStore.initializeStore()
  },
  methods: {
    handleUrlParameters() {
      const urlParams = new URLSearchParams(window.location.search)
      
      // Check if there are any relevant parameters
      const hasParams = urlParams.has('v') || urlParams.has('c') || urlParams.has('m')
      
      if (hasParams) {
        const params = {}
        
        // Extract parameters
        if (urlParams.has('v')) params.v = urlParams.get('v')
        if (urlParams.has('c')) params.c = urlParams.get('c')
        if (urlParams.has('m')) params.m = urlParams.get('m')
        
        // Always override any existing pendingNavigation to ensure shared links work on repeat visits
        sessionStorage.setItem('pendingNavigation', JSON.stringify(params))
        
        // Clear URL parameters to keep URL clean
        const url = new URL(window.location)
        url.search = ''
        window.history.replaceState({}, '', url)
      }
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

.kofi-icon {
  width: 25px;
  height: 20px;
  margin-right: 8px;
}

.kofi-icon-mobile {
  width: 20px;
  height: 16px;
  margin-right: 8px;
  vertical-align: middle;
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

/* Mobile menu styles */
.hamburger-btn {
  color: white !important;
}

.mobile-menu .v-list-item {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.mobile-menu .v-list-item:last-child {
  border-bottom: none;
}

.twitter-mobile {
  background-color: #000000 !important;
  color: #ffffff !important;
  margin: 8px 16px;
  border-radius: 4px;
}

.kofi-mobile {
  margin: 8px 16px;
  border-radius: 4px;
}
</style>