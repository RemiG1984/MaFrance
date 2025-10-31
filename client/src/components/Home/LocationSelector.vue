<template>
  <v-card>
    <v-card-title class="text-h6 pb-1" style="cursor: pointer" @click="toggleCollapse">
      {{ cardTitle }}
    </v-card-title>
    <v-expand-transition v-show="!isCollapsed">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="3">
            <v-btn
              :color="location.type === 'country' ? 'primary' : 'grey'"
              variant="elevated"
              block
              @click="selectFrance"
            >
              France
            </v-btn>
          </v-col>

          <v-col cols="12" sm="4">
            <v-select
              v-model="selectedDepartement"
              :items="sortedDepartements"
              item-title="name"
              item-value="code"
              :label="departementLabel"
              variant="outlined"
              clearable
              density="compact"
              hide-details
              @update:model-value="onDepartementChange"
            />
          </v-col>

          <v-col cols="12" sm="5">
            <v-autocomplete
              v-model="selectedCommune"
              v-model:search="communeQuery"
              :items="communeSuggestions"
              item-title="displayName"
              item-value="COG"
              :label="communeLabel"
              variant="outlined"
              clearable
              :loading="loading"
              return-object
              density="compact"
              hide-details
              @update:model-value="onCommuneSelect"
              @input="onCommuneInput"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script>
import { mapStores } from 'pinia';
import { useDataStore } from '../../services/store.js';
import { DepartementNames } from '../../utils/departementNames.js';
// import api from '../services/api.js'

export default {
  name: 'LocationSelector',
  props: {
    location: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      selectedDepartement: '',
      selectedCommune: null,
      communeQuery: '',
      communeSuggestions: [],
      communesData: [],
      departementNames: DepartementNames,
      loading: false,
      isCollapsed: false
    };
  },
  computed: {
    ...mapStores(useDataStore),
    cardTitle() {
      return this.dataStore.labelState === 3
        ? 'Visualization level selection'
        : 'Sélection du niveau de visualisation';
    },
    departementLabel() {
      return this.dataStore.labelState === 3
        ? 'Choose a department'
        : 'Choisir un département';
    },
    communeLabel() {
      return this.dataStore.labelState === 3
        ? 'Search for a municipality'
        : 'Rechercher une commune';
    },
    sortedDepartements() {
      return Object.entries(this.departementNames)
        .sort(([a], [b]) => {
          const parseCode = (code) => {
            if (code === '2A') {
              return 20.1;
            }
            if (code === '2B') {
              return 20.2;
            }
            return parseInt(code, 10);
          };
          return parseCode(a) - parseCode(b);
        })
        .map(([code, name]) => ({
          code,
          name: `${code} - ${name}`
        }));
    }
  },
  mounted() {
  },
  methods: {
    selectFrance() {
      this.selectedDepartement = '';
      this.selectedCommune = null;
      this.communeQuery = '';
      this.communeSuggestions = [];
      this.dataStore.setCountry();
    },

    onDepartementChange() {
      if (this.selectedDepartement) {
        this.selectedCommune = null;
        this.communeQuery = '';
        this.communeSuggestions = [];

        // this.dataStore.currentLevel = 'departement'
        // this.dataStore.getAllDepartementData(this.selectedDepartement)
        this.dataStore.setDepartement(this.selectedDepartement);

      }
    },

    onCommuneSelect(commune) {
      if (!commune) {
        return;
      }

      const cog = commune.COG;
      const departement = commune.departement;

      this.dataStore.setCommune(cog, commune.commune, departement);
    },

    async onCommuneInput() {
      if (this.communeQuery.length < 3) {
        this.communeSuggestions = [];
        return;
      }

      this.loading = true;
      try {
        const communes = await this.dataStore.searchCommunes(this.communeQuery);

        this.communeSuggestions = communes.map(commune => ({
          displayName: `${commune.commune} (${commune.departement})`,
          commune: commune.commune,
          COG: commune.COG,
          departement: commune.departement
        }));

        this.communesData = this.communeSuggestions;
      } catch {
        this.communeSuggestions = [];
      } finally {
        this.loading = false;
      }
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
    }
  }

};
</script>

<style scoped>
/* Styles pour les suggestions de communes */
.commune-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 15rem;
  overflow-y: auto;
}
</style>
