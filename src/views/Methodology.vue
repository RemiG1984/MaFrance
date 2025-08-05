<template>
  <div class="methodology">
    <div class="bg-white p-6 rounded-lg shadow">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Méthodologie, termes utilisés et logique</h1>
      
      <div class="prose max-w-none">
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Présentation</h2>
          <p class="text-gray-600 mb-4">
            Cette application analyse différents indicateurs pour évaluer l'état des lieux en France, 
            au niveau des départements et des communes. Les données proviennent de sources officielles 
            et sont traitées selon une méthodologie rigoureuse.
          </p>
          <p class="text-gray-600 mb-4">
            Le site est en béta ouverte. Il est possible que des bugs ou erreurs soient présents. Des fonctions et données supplémentaires sont ajoutées régulièrement.
          </p>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Calcul des indices</h2>
          <p class="text-gray-600 mb-4">
            Pour chaque indice, le calcul est effectué via une matrice de pondération sur chaque donnée d'entrée (par habitant). La pondération est la même pour l'ensemble des niveaux géographiques (communes, départements, France), ce qui permet de comparer les résultats directement. La valeur des coefficients de pondération n'est pas très importante, puisque ces coefficients sont les mêmes partout.
            L'étalonage des indices est effectué de manière à ce que la moyenne nationale ait une valeur de 100. Cela permet de comparer les résultats directement entre les différents niveaux géographiques. Un département ou une commune ayant une valeur inférieure à 100 est en dessous de la moyenne nationale pour cet indice.
          </p>
          <div class="space-y-6">
            <div class="border-l-4 border-blue-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice de changement général</h3>
              <p class="text-gray-600 mb-2">
                Représente la moyenne des 5 indices précédents. Cet indice est également étalonné à 100 au niveau national.
                Moins de 100 signifie que la zone sélectionnée est en dessous de la moyenne nationale.
                Plus de 100 signifie que la zone est au-dessus de la moyenne nationale.
                Dénominations alternatives: indice d'évolution
                inclusive, indice de fragmentation nationale.
              </p>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice d'insécurité</h3>
              <p class="text-gray-600 mb-2">
                Utilise l'ensemble des données à propos d'activités
                illégales (violences, vols, vandalisme...), les
                comportements antisociaux ou le sentiment d'insécurité
                en général. Dénominations alternatives: indice de
                répression policière.
                Une pondération est appliquée à chaque donnée d'entrée.
              </p>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice d'immigration</h3>
              <p class="text-gray-600 mb-2">
                Décrit l'ensemble des données à propos de personnes ou
                de groupes dont l'origine et l'identité n'est pas
                française de souche, indépendamment de la nationalité
                administrative actuelle. Dénominations alternatives:
                indice de créolisation, indice de grand remplacement.
              </p>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice de progression de l'Islam</h3>
              <p class="text-gray-600 mb-2">
                Décrit l'ensemble des données ayant trait à la religion
                musulmane, et sa progression dans l'espace Français.
                Dénominations alternatives: indice d'enrichissement
                spirituel, indice d'islamisation.
              </p>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice d'évolution culturelle</h3>
              <p class="text-gray-600 mb-2">
                Décrit l'ensemble des données ayant trait à l'érosion
                sociétale de l'identité culturelle Française, ainsi que
                la promotion de cultures non-françaises sur le
                territoire. Sont inclus les cultures d'immigration,
                ainsi que l'américanisation de la société. Dénominations
                alternatives: indice de dépoussiérage culturel, indice
                de défrancisation.
              </p>
            </div>

            <div class="border-l-4 border-red-500 pl-4">
              <h3 class="text-lg font-medium text-gray-800 mb-2">Indice d'interventionnisme social</h3>
              <p class="text-gray-600 mb-2">
                Décrit l'ensemble des données reflétant une idéologie
                gauchiste promouvant un changement sociétal. Sont inclus
                l'immigrationnisme, le féminisme excessif, le
                socialisme, le racisme anti-blanc, le combat contre le
                'patriarcat', l'intersectionnalité, la promotion dans
                l'espace public de l'idéologie LGBTQ, la promotion de la
                diversité ou du métissage, l'idéologie de l'inclusif,
                l'idéologie de la 'discrimination positive', l'idéologie
                de la 'justice sociale', les mouvances 'antifa'...
                Dénominations alternatives: indice de progressisme,
                indice de wokisme.
              </p>
            </div>
            </div>
            </section>
            
            <section class="mb-8">
              <h2 class="text-2xl font-semibold text-gray-800 mb-4">Principales données</h2>
              <div class="space-y-6">
                <div class="border-l-4 border-blue-500 pl-4">
                  <h3 class="text-lg font-medium text-gray-800 mb-2">Données de criminalité</h3>
                  <p class="text-gray-600 mb-2">
                    Les données de criminalité sont issues de la base SSMSI
                    du Ministère de l'Intérieur, mise à jour pour 2024.
                  </p>
                  <p class="text-gray-600 mb-2">
                    Pour les petites communes, certaines données sont
                    anonymisées si moins de 5 faits ont été enregistrés
                    pendant 3 années successives. Dans ce cas, le taux moyen
                    dans le département par classe de commune est utilisé.
                    Si la valeur est à 0, c'est qu'il n'y a pas eu de faits
                    de ce type.
                  </p>
                  </div>
                  <div class="border-l-4 border-blue-500 pl-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-2">Lieux de culte musulmans</h3>
                    <p class="text-gray-600 mb-2">
                      Les données ont été récupérés de divers sites internet.
                      Il est possible que les données soient incomplètes,
                      obsolètes ou erronées.
                    </p>
                  </div>
                  <div class="border-l-4 border-blue-500 pl-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-2">Quartiers Prioritaires de la Ville</h3>
                    <p class="text-gray-600 mb-2">
                      Les données sont issues de la base publique et du site
                      internet officiel https://sig.ville.gouv.fr/ Le taux de
                      logements sociaux au sein de chaque QPV a été recalculé.
                    </p>
                  </div>
                  <div class="border-l-4 border-blue-500 pl-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-2">Prénoms de naissance</h3>
                    <p class="text-gray-600 mb-2">
                      Les données de prénoms sont issus des bases publiques
                      disponibles sur data.gouv.fr
                    </p>
                    <p class="text-gray-600 mb-2">
                      L'ensemble des prénoms de naissances a été catégorisé.
                      Il s'agit d'une approche subjective aidée par
                      intelligence artificielle.
                    </p>
                  </div>
                  <div class="border-l-4 border-blue-500 pl-4">
                    <h3 class="text-lg font-medium text-gray-800 mb-2">Catégories d'articles FdeSouche</h3>
                    <p class="text-gray-600 mb-2">
                      Les articles du site fdesouche.com ont été catégorisés
                      et localisés. Il s'agit d'une approche subjective aidée
                      par intelligence artificielle.
                    </p>
                  </div>
                </div>
              </section>
                
                  <section class="mb-8">
                    <h2 class="text-2xl font-semibold text-gray-800 mt-8 mb-4 text-left">Résumé des Sources</h2>
                    <table border="1">
                        <tr>
                            <th>Données</th>
                            <th>Description et lien</th>
                        </tr>
                        <tr>
                            <td>Criminalité</td>
                            <td>
                                <a
                                    href="https://www.data.gouv.fr/datasets/service-statistique-ministeriel-de-la-securite-interieure-base-des-series-chronologiques/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Données du Service Statistique Ministériel
                                    de la Sécurité Intérieure (SSMSI)</a
                                >
                                et
                                <a
                                    href="https://ssmsi.shinyapps.io/donneesterritoriales/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Données SSMSI cartographiées dans une app officielle</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Prénoms</td>
                            <td>
                                <a
                                    href="https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Fichier des prénoms d'état civil INSEE</a
                                >
                                et
                                <a
                                    href="https://www.data.gouv.fr/datasets/liste-de-prenoms/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Liste des prénoms INSEE</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Mosquées</td>
                            <td>
                                <a
                                    href="https://www.trouvetamosquee.fr/category/mosquees-de-france/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >www.trouvetamosquee.fr</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Logements sociaux</td>
                            <td>
                                <a
                                    href="https://www.data.gouv.fr/datasets/taux-de-logements-sociaux-dans-les-communes/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Taux de logements sociaux dans les
                                    communes</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Quartiers Prioritaires de la Ville</td>
                            <td>
                                <a href="https://sig.ville.gouv.fr/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Système d'information géographique de la
                                    politique de la ville</a
                                >
                                et
                                <a
                                    href="https://www.data.gouv.fr/datasets/quartiers-prioritaires-de-la-politique-de-la-ville-qpv/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Liste des QPV</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Responsables executifs</td>
                            <td>
                                <a
                                    href="https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1/" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >Répertoire national des élus</a
                                >
                            </td>
                        </tr>
                        <tr>
                            <td>Articles FdeSouche</td>
                            <td>
                                <a href="https://fdesouche.com" target="_blank"
                                    class="text-blue-600 hover:text-blue-800 underline"
                                    >fdesouche.com</a
                                >
                            </td>
                        </tr>
                    </table>
                  </section>
            
            
            <section class="mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-4">Limites et précautions</h2>
          <div class="bg-yellow-50 p-4 rounded-lg">
            <ul class="list-disc list-inside text-yellow-800 space-y-2">
              <li>Les données sont mises à jour selon la disponibilité des sources officielles</li>
              <li>Certains territoires peuvent avoir des données incomplètes en fonction des sources</li>
              <li>Les indices sont relatifs et doivent être interprétés dans leur contexte</li>
              <li>Cette analyse ne prétend pas être exhaustive ou définitive</li>
              <li>RGPD: Aucune donnée personnelle n'est stockée sur ce site.
                L'ensemble des données utilisées sont publiques et
                anonymisées.</li>
              <li>Auteur: GRATION, Rémi</li>
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