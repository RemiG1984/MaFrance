
<template>
  <div class="methodology">
    <div class="content-card">
      <h1 class="main-title">{{ isEnglish ? 'Methodology, terms used and logic' : 'Méthodologie, termes utilisés et logique' }}</h1>
      
      <div class="content">
        <section class="section">
          <h2 class="section-title">{{ isEnglish ? 'Presentation' : 'Présentation' }}</h2>
          <p class="text">
            {{ isEnglish ? 
              'This application analyzes different indicators to assess the state of affairs in France, at the level of departments and municipalities. The data comes from official sources and is processed according to a rigorous methodology.' :
              'Cette application analyse différents indicateurs pour évaluer l\'état des lieux en France, au niveau des départements et des communes. Les données proviennent de sources officielles et sont traitées selon une méthodologie rigoureuse.'
            }}
          </p>
          <p class="text">
            {{ isEnglish ?
              'The site is in open beta. Bugs or errors may be present. Additional functions and data are added regularly.' :
              'Le site est en béta ouverte. Il est possible que des bugs ou erreurs soient présents. Des fonctions et données supplémentaires sont ajoutées régulièrement.'
            }}
          </p>
          <p class="text">
            {{ isEnglish ?
              'If you would like to help me, you can make a small contribution via the Ko-fi link to help me cover the site\'s operating costs: ' :
              'Si vous souhaitez m\'aider, vous pouver m\'apporter une petite contribution via le lien Ko-fi pour m\'aider à couvrir les frais de fonctionnement du site: '
            }}<a href="https://ko-fi.com/remi63047" target="_blank" class="link">ko-fi.com/remi63047</a>
          </p>
        </section>

        <section class="section">
          <h2 class="section-title">{{ isEnglish ? 'Index calculation' : 'Calcul des indices' }}</h2>
          <p class="text">
            Pour chaque indice, le calcul est effectué via une matrice de pondération sur chaque donnée d'entrée (par habitant). La pondération est la même pour l'ensemble des niveaux géographiques (communes, départements, France), ce qui permet de comparer les résultats directement. La valeur des coefficients de pondération n'est pas très importante, puisque ces coefficients sont les mêmes partout.
            L'étalonage des indices est effectué de manière à ce que la moyenne nationale ait une valeur de 100. Cela permet de comparer les résultats directement entre les différents niveaux géographiques. Un département ou une commune ayant une valeur inférieure à 100 est en dessous de la moyenne nationale pour cet indice.
          </p>
          <div class="indices-list">
            <div class="indice-card blue">
              <h3 class="indice-title">Indice de changement général</h3>
              <p class="indice-text">
                Représente la moyenne des 5 indices ci-dessous. Cet indice est également étalonné à 100 au niveau national.
                Moins de 100 signifie que la zone sélectionnée est en dessous de la moyenne nationale.
                Plus de 100 signifie que la zone est au-dessus de la moyenne nationale.
                Dénominations alternatives: indice d'évolution
                inclusive, indice de fragmentation nationale.
              </p>
            </div>

            <div class="indice-card red">
              <h3 class="indice-title">Indice d'insécurité</h3>
              <p class="indice-text">
                Utilise l'ensemble des données à propos d'activités
                illégales (violences, vols, vandalisme...), les
                comportements antisociaux ou le sentiment d'insécurité
                en général. Dénominations alternatives: indice de
                répression policière.
                Une pondération est appliquée à chaque donnée d'entrée.
              </p>
            </div>

            <div class="indice-card red">
              <h3 class="indice-title">Indice d'immigration</h3>
              <p class="indice-text">
                Décrit l'ensemble des données à propos de personnes ou
                de groupes dont l'origine et l'identité n'est pas
                française de souche, indépendamment de la nationalité
                administrative actuelle. Dénominations alternatives:
                indice de créolisation, indice de grand remplacement.
              </p>
            </div>

            <div class="indice-card red">
              <h3 class="indice-title">Indice de progression de l'Islam</h3>
              <p class="indice-text">
                Décrit l'ensemble des données ayant trait à la religion
                musulmane, et sa progression dans l'espace Français.
                Dénominations alternatives: indice d'enrichissement
                spirituel, indice d'islamisation.
              </p>
            </div>

            <div class="indice-card red">
              <h3 class="indice-title">Indice d'évolution culturelle</h3>
              <p class="indice-text">
                Décrit l'ensemble des données ayant trait à l'érosion
                sociétale de l'identité culturelle Française, ainsi que
                la promotion de cultures non-françaises sur le
                territoire. Sont inclus les cultures d'immigration,
                ainsi que l'américanisation de la société. Dénominations
                alternatives: indice de dépoussiérage culturel, indice
                de défrancisation.
              </p>
            </div>

            <div class="indice-card red">
              <h3 class="indice-title">Indice d'interventionnisme social</h3>
              <p class="indice-text">
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
            
        <section class="section">
          <h2 class="section-title">Principales données</h2>
          <div class="data-list">
            <div class="data-card">
              <h3 class="data-title">Données de criminalité</h3>
              <p class="data-text">
                Les données de criminalité sont issues de la base SSMSI
                du Ministère de l'Intérieur, mise à jour pour 2024.
              </p>
              <p class="data-text">
                Pour les petites communes, certaines données sont
                anonymisées si moins de 5 faits ont été enregistrés
                pendant 3 années successives. Dans ce cas, le taux moyen
                dans le département par classe de commune est utilisé.
                Si la valeur est à 0, c'est qu'il n'y a pas eu de faits
                de ce type.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Données de nationalité</h3>
              <p class="data-text">
                Les données de nationalité sont issues du recensement de l'INSEE de 2022.
              </p>
              <p class="data-text">
                Les valeurs au niveau national, départemental et pour les communes de plus de 50000 habitants sont directement celles fournies par l'INSEE. Pour les communes de moins de 50000 habitants, l'INSEE ne fournit que le taux d'étrangers. Les autres valeurs sont extrapolées à partir des moyennes départementales (en en ayant exclu les communes de plus de 50000 habitants). Pour les plus petites communes, les valeurs indiquées sont donc approximatives.
              </p>
              <p class="data-text">
                Ces données indiquent la nationalité administrative des populations telle que déclarée lors du recensement de l'INSEE, et non l'origine ethnique ou culturelle des individus. En cas de double nationalité, la nationalité Française est seule considérée.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Lieux de culte musulmans</h3>
              <p class="data-text">
                Les données ont été récupérés de divers sites internet.
                Il est possible que les données soient incomplètes,
                obsolètes ou erronées.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Quartiers Prioritaires de la Ville</h3>
              <p class="data-text">
                Les données sont issues de la base publique et du site
                internet officiel https://sig.ville.gouv.fr/ Le taux de
                logements sociaux au sein de chaque QPV a été recalculé.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Prénoms de naissance</h3>
              <p class="data-text">
                Les données de prénoms sont issus des bases publiques
                disponibles sur data.gouv.fr
              </p>
              <p class="data-text">
                L'ensemble des prénoms de naissances a été catégorisé.
                Il s'agit d'une approche subjective aidée par
                intelligence artificielle.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Catégories d'articles FdeSouche</h3>
              <p class="data-text">
                Les articles du site fdesouche.com ont été catégorisés
                et localisés. Il s'agit d'une approche subjective aidée
                par intelligence artificielle.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Centres d'hébergement de migrants</h3>
              <p class="data-text">
                Les données ont été récupérées en aout 2025 du site officiel de la CIMADE.
              </p>
            </div>
            <div class="data-card">
              <h3 class="data-title">Subventions publiques aux associations</h3>
              <p class="data-text">
                Les données ont été récupérées en aout 2025 des sources officielles (data.ofgl.fr et budget.gouv.fr).
                Les subventions des agglomérations et communautés de commune ont été ventilées par commune suivant la population.
                Les subventions des régions ont été ventilées par département suivant la population.
                Pour Paris, les subventions de la Mairie apparaissent en tant que département. Il n'y a donc aucune subvention au niveau des arrondissements.
              </p>
            </div>
          </div>
        </section>
                
        <section class="section">
          <h2 class="sources-title">Résumé des Sources</h2>
          <table class="sources-table">
            <tbody>
              <tr>
                  <th>Données</th>
                  <th>Description et lien</th>
              </tr>
              <tr>
                  <td>Criminalité</td>
                  <td>
                      <a href="https://www.data.gouv.fr/datasets/service-statistique-ministeriel-de-la-securite-interieure-base-des-series-chronologiques/" target="_blank" class="link">Données du Service Statistique Ministériel de la Sécurité Intérieure (SSMSI)</a>
                      et
                      <a href="https://ssmsi.shinyapps.io/donneesterritoriales/" target="_blank" class="link">Données SSMSI cartographiées dans une app officielle</a>
                  </td>
              </tr>
              <tr>
                  <td>Nationalité</td>
                  <td>
                      <a href="https://www.insee.fr/fr/statistiques/zones/8582090" target="_blank" class="link">Recensement de la population de l'INSEE en 2022</a>
                  </td>
              </tr>
              <tr>
                  <td>Prénoms</td>
                  <td>
                      <a href="https://www.insee.fr/fr/statistiques/8595130?sommaire=8595113" target="_blank" class="link">Fichier des prénoms d'état civil INSEE</a>
                      et
                      <a href="https://www.data.gouv.fr/datasets/liste-de-prenoms/" target="_blank" class="link">Liste des prénoms INSEE</a>
                  </td>
              </tr>
              <tr>
                  <td>Mosquées</td>
                  <td>
                      <a href="https://www.trouvetamosquee.fr/category/mosquees-de-france/" target="_blank" class="link">www.trouvetamosquee.fr</a>
                  </td>
              </tr>
              <tr>
                  <td>Logements sociaux</td>
                  <td>
                      <a href="https://www.data.gouv.fr/datasets/taux-de-logements-sociaux-dans-les-communes/" target="_blank" class="link">Taux de logements sociaux dans les communes</a>
                  </td>
              </tr>
              <tr>
                  <td>Quartiers Prioritaires de la Ville</td>
                  <td>
                      <a href="https://sig.ville.gouv.fr/" target="_blank" class="link">Système d'information géographique de la politique de la ville</a>
                      et
                      <a href="https://www.data.gouv.fr/datasets/quartiers-prioritaires-de-la-politique-de-la-ville-qpv/" target="_blank" class="link">Liste des QPV</a>
                  </td>
              </tr>
              <tr>
                  <td>Responsables executifs</td>
                  <td>
                      <a href="https://www.data.gouv.fr/datasets/repertoire-national-des-elus-1/" target="_blank" class="link">Répertoire national des élus</a>
                  </td>
              </tr>
              <tr>
                  <td>Articles FdeSouche</td>
                  <td>
                      <a href="https://fdesouche.com" target="_blank" class="link">fdesouche.com</a>
                  </td>
              </tr>
              <tr>
                  <td>Centres d'hébergement pour migrants</td>
                  <td>
                      <a href="https://www.lacimade.org/schemas-regionaux-daccueil-des-demandeurs-dasile-quel-etat-des-lieux-2024/" target="_blank" class="link">lacimade.org</a>
                  </td>
              </tr>
              <tr>
                  <td>Subventions publiques aux associations</td>
                  <td>
                      <a href="https://data.ofgl.fr/pages/acces-donnees-comptables-detaillees/" target="_blank" class="link">data.ofgl.fr</a> et le jaune budgétaire <a href="https://www.budget.gouv.fr/documentation/documents-budgetaires/exercice-2025/projet-loi-finances-les/jaunes-budgetaires-2025-plf-2025" target="_blank" class="link">www.budget.gouv.fr</a>
                  </td>
              </tr>
            </tbody>
          </table>
        </section>
            
        <section class="section">
          <h2 class="section-title">Limites et précautions</h2>
          <div class="warning-box">
            <ul class="warning-list">
              <li>Les données sont mises à jour selon la disponibilité des sources officielles</li>
              <li>Certains territoires peuvent avoir des données incomplètes en fonction des sources. Certaines valeurs à "zéro" doivent être prises avec du recul</li>
              <li>Les indices sont relatifs et doivent être interprétés dans leur contexte</li>
              <li>Cette analyse ne prétend pas être exhaustive ou définitive</li>
              <li>RGPD: Aucune donnée personnelle n'est stockée sur ce site. L'ensemble des données utilisées sont publiques et anonymisées.</li>
              <li>Une corrélation n'implique pas nécessairement une causalité.</li>
              <li>Auteur: Rémi G.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useDataStore } from '../services/store.js'

export default {
  name: 'Methodology',
  setup() {
    const store = useDataStore()
    
    const isEnglish = computed(() => {
      return store.labelState === 3
    })
    
    return {
      isEnglish
    }
  }
}
</script>

<style scoped>
.methodology {
  min-height: 100vh;
}

.content-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.main-title {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.content {
  max-width: none;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.text {
  color: #4b5563;
  margin-bottom: 1rem;
}

.indices-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.indice-card {
  padding-left: 1rem;
  border-left: 4px solid;
}

.indice-card.blue {
  border-color: #3b82f6;
}

.indice-card.red {
  border-color: #ef4444;
}

.indice-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.indice-text {
  color: #4b5563;
  margin-bottom: 0.5rem;
}

.data-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.data-card {
  padding-left: 1rem;
  border-left: 4px solid #3b82f6;
}

.data-title {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.data-text {
  color: #4b5563;
  margin-bottom: 0.5rem;
}

.sources-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-align: left;
}

.sources-table {
  border: 1px solid #d1d5db;
  width: 100%;
  border-collapse: collapse;
}

.sources-table th,
.sources-table td {
  border: 1px solid #d1d5db;
  padding: 0.75rem;
  text-align: left;
}

.sources-table th {
  background-color: #f9fafb;
  font-weight: 600;
}

.link {
  color: #2563eb;
  text-decoration: underline;
}

.link:hover {
  color: #1d4ed8;
}

.warning-box {
  background-color: #fefce8;
  padding: 1rem;
  border-radius: 0.5rem;
}

.warning-list {
  list-style-type: disc;
  list-style-position: inside;
  color: #92400e;
}

.warning-list li {
  margin-bottom: 0.5rem;
}
</style>
