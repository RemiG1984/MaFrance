<template>
  <div class="methodology">
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Méthodologie</h1>
      
      <div class="prose max-w-none">
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Présentation</h2>
          <p class="text-gray-600 mb-4">
            Cette application analyse différents indicateurs pour évaluer l'état des lieux en France, 
            au niveau des départements et des communes. Les données proviennent de sources officielles 
            et sont traitées selon une méthodologie rigoureuse.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Sources de données</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Criminalité</h3>
              <p class="text-gray-600 text-sm">
                Données issues du ministère de l'Intérieur, compilées par année et par territoire.
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Évolution des prénoms</h3>
              <p class="text-gray-600 text-sm">
                Analyse des prénoms donnés aux nouveau-nés, source INSEE.
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Quartiers Prioritaires (QPV)</h3>
              <p class="text-gray-600 text-sm">
                Données officielles sur les quartiers prioritaires de la politique de la ville.
              </p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Articles FdeSouche</h3>
              <p class="text-gray-600 text-sm">
                Analyse des articles publiés par FdeSouche, géolocalisés par territoire.
              </p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Calcul des scores</h2>
          
          <div class="space-y-6">
            <div class="border-l-4 border-blue-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Score global</h3>
              <p class="text-gray-600 mb-2">
                Le score global est calculé en combinant plusieurs indicateurs :
              </p>
              <ul class="list-disc list-inside text-gray-600 space-y-1">
                <li>Indice de criminalité (pondération: 40%)</li>
                <li>Évolution des prénoms (pondération: 30%)</li>
                <li>Présence de QPV (pondération: 20%)</li>
                <li>Activité FdeSouche (pondération: 10%)</li>
              </ul>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice de criminalité</h3>
              <p class="text-gray-600 mb-2">
                Calculé sur la base des délits enregistrés par habitant :
              </p>
              <ul class="list-disc list-inside text-gray-600 space-y-1">
                <li>Violences (vols, agressions, etc.)</li>
                <li>Délinquance économique</li>
                <li>Atteintes aux biens</li>
                <li>Normalisé par la population</li>
              </ul>
            </div>

            <div class="border-l-4 border-green-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Évolution des prénoms</h3>
              <p class="text-gray-600 mb-2">
                Analyse de l'évolution des prénoms donnés aux nouveau-nés :
              </p>
              <ul class="list-disc list-inside text-gray-600 space-y-1">
                <li>Proportion de prénoms traditionnels français</li>
                <li>Évolution sur 10 ans</li>
                <li>Comparaison avec la moyenne nationale</li>
              </ul>
            </div>

            <div class="border-l-4 border-yellow-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Quartiers Prioritaires</h3>
              <p class="text-gray-600 mb-2">
                Évaluation basée sur la présence de QPV :
              </p>
              <ul class="list-disc list-inside text-gray-600 space-y-1">
                <li>Nombre de QPV par territoire</li>
                <li>Population concernée</li>
                <li>Surface des QPV</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Interprétation des résultats</h2>
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-blue-800 mb-2">Échelle de scores</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="text-center">
                <div class="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1"></div>
                <span class="text-green-700 font-medium">0-33 : Faible</span>
              </div>
              <div class="text-center">
                <div class="w-4 h-4 bg-yellow-500 rounded-full mx-auto mb-1"></div>
                <span class="text-yellow-700 font-medium">34-66 : Moyen</span>
              </div>
              <div class="text-center">
                <div class="w-4 h-4 bg-red-500 rounded-full mx-auto mb-1"></div>
                <span class="text-red-700 font-medium">67-100 : Élevé</span>
              </div>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Limites et précautions</h2>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <ul class="list-disc list-inside text-yellow-800 space-y-2">
              <li>Les données sont mises à jour selon la disponibilité des sources officielles</li>
              <li>Certains territoires peuvent avoir des données incomplètes</li>
              <li>Les scores sont relatifs et doivent être interprétés dans leur contexte</li>
              <li>Cette analyse ne prétend pas être exhaustive ou définitive</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Methodology'
}
</script>

<style scoped>
.methodology {
  min-height: 100vh;
}

.prose h2 {
  @apply text-2xl font-semibold text-gray-800 mb-4;
}

.prose h3 {
  @apply text-lg font-medium text-gray-800 mb-2;
}

.prose p {
  @apply text-gray-600 mb-4;
}

.prose ul {
  @apply list-disc list-inside text-gray-600 space-y-1;
}
</style> 