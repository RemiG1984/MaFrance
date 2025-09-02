<template>
  <v-row>
    <v-col 
      v-for="victim in victims" 
      :key="victim.fullName"
      cols="12" sm="6" md="4"
    >
      <v-card class="memorial-card elevation-2">
        <v-img 
          :src="victim.photoUrl" 
          height="200" 
          cover
          class="memorial-image"
        >
          <template v-slot:placeholder>
            <v-skeleton-loader type="image" />
          </template>
        </v-img>

        <v-card-title class="text-h6">
          {{ victim.fullName }} ({{ victim.age }} ans)
        </v-card-title>

        <v-card-subtitle>
          Décédé le {{ victim.date_deces }} à {{ victim.location }}
        </v-card-subtitle>

        <v-card-actions>
          <v-btn 
            v-if="victim.url_fdesouche" 
            :href="victim.url_fdesouche" 
            target="_blank" 
            variant="text" 
            color="primary"
          >
            FdeSouche
          </v-btn>
          <v-btn 
            v-if="victim.url_wikipedia" 
            :href="victim.url_wikipedia" 
            target="_blank" 
            variant="text" 
            color="primary"
          >
            Wikipedia
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col v-if="loading" cols="12">
      <v-skeleton-loader type="card@3" />
    </v-col>

    <v-col v-if="!loading && !victims.length" cols="12">
      <v-alert type="info">Aucune donnée disponible.</v-alert>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: 'MemorialGrid',
  props: {
    victims: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
};
</script>