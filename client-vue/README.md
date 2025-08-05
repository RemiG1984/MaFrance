# Ma France - Application Vue.js

Cette application Vue.js est une refonte de l'application "Ma France: état des lieux" qui analyse différents indicateurs pour évaluer l'état des lieux en France, au niveau des départements et des communes.

## Structure de l'application

### Pages principales
- **Accueil** (`/`) : Carte interactive, sélecteurs de localisation, et toutes les données
- **Classements** (`/classements`) : Tableaux de classements des départements et communes
- **Méthodologie** (`/methodologie`) : Explication des sources et calculs

### Composants principaux

#### Composants de navigation
- `LocationSelector.vue` : Sélecteurs de France, département et commune
- `MapComponent.vue` : Carte interactive avec Leaflet

#### Composants de données
- `ScoreTable.vue` : Affichage des scores (global, criminalité, prénoms, QPV)
- `ArticleList.vue` : Liste des articles FdeSouche associés
- `NamesGraph.vue` : Graphique d'évolution des prénoms
- `QpvData.vue` : Données des quartiers prioritaires
- `ExecutiveDetails.vue` : Détails des élus
- `CrimeGraphs.vue` : Graphiques de criminalité

### Services
- `api.js` : Service centralisé pour les appels API

## Technologies utilisées

- **Vue.js 3** (Options API, pas Composition API)
- **Vue Router 4** pour la navigation
- **Vuetify 3** pour l'interface utilisateur
- **Leaflet** pour les cartes interactives
- **Chart.js** pour les graphiques
- **Vite** comme bundler

## Installation et développement

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou pnpm

### Installation des dépendances
```bash
npm install
```

### Démarrage du serveur de développement
```bash
npm run dev
```

### Build pour la production
```bash
npm run build
```

### Prévisualisation du build
```bash
npm run preview
```

## Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine du projet :
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### Configuration Vuetify
Le fichier `src/plugins/vuetify.js` contient la configuration personnalisée pour :
- Thème clair par défaut
- Couleurs personnalisées
- Police Roboto

## Architecture des données

### Structure des localisations
```javascript
{
  type: 'france' | 'departement' | 'commune',
  code: string | null,
  name: string,
  departement?: string // pour les communes
}
```

### Structure des scores
```javascript
{
  total_score: number,
  crime_score: number,
  names_score: number,
  qpv_score: number
}
```

## API Backend

L'application s'attend à ce que le backend expose les endpoints suivants :

### Départements
- `GET /api/departements/rankings` - Classements des départements
- `GET /api/departements/:code/scores` - Scores d'un département

### Communes
- `GET /api/communes/search?q=query` - Recherche de communes
- `GET /api/communes/rankings` - Classements des communes
- `GET /api/communes/:code/scores` - Scores d'une commune

### Articles
- `GET /api/articles` - Articles FdeSouche

### Données spécialisées
- `GET /api/crime` - Données de criminalité
- `GET /api/names` - Données des prénoms
- `GET /api/qpv` - Données QPV
- `GET /api/executives` - Données des élus

### France
- `GET /api/france/scores` - Scores nationaux
- `GET /api/france/stats` - Statistiques nationales

## Développement

### Ajout d'un nouveau composant
1. Créez le fichier dans `src/components/`
2. Utilisez la structure Vue.js Options API
3. Ajoutez les props nécessaires
4. Implémentez les méthodes de chargement de données

### Ajout d'une nouvelle page
1. Créez le fichier dans `src/views/`
2. Ajoutez la route dans `src/router/index.js`
3. Mettez à jour la navigation dans `App.vue`

### Styles
- Utilisez les composants Vuetify pour l'interface utilisateur
- Ajoutez des styles personnalisés dans les balises `<style scoped>`
- Pour les styles globaux, utilisez `src/style.css`

## Déploiement

### Build de production
```bash
npm run build
```

Le dossier `dist/` contiendra les fichiers optimisés pour la production.

### Configuration du serveur
Assurez-vous que votre serveur web est configuré pour :
- Servir les fichiers statiques depuis le dossier `dist/`
- Rediriger toutes les routes vers `index.html` (pour le routing côté client)
- Configurer les en-têtes CORS si nécessaire

## Notes importantes

- L'application utilise Vue.js 3 avec l'Options API (pas Composition API)
- Tous les appels API passent par le service centralisé `api.js`
- Les graphiques utilisent Chart.js et nécessitent une initialisation manuelle
- La carte utilise Leaflet et nécessite une gestion du cycle de vie des composants
- Les données sont chargées de manière asynchrone selon la localisation sélectionnée
