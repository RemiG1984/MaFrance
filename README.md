
# Ma France - Application Vue.js

Cette application Vue.js est une refonte de l'application "Ma France: état des lieux" qui analyse différents indicateurs pour évaluer l'état des lieux en France, au niveau des départements et des communes.

## Architecture de l'application

### Structure générale
L'application est composée de deux parties principales :
- **Backend Node.js/Express** : API REST avec base de données SQLite
- **Frontend Vue.js 3** : Interface utilisateur construite avec Vite

### Pages principales
- **Accueil** (`/`) : Carte interactive, sélecteurs de localisation, et toutes les données
- **Classements** (`/classements`) : Tableaux de classements des départements et communes
- **Méthodologie** (`/methodologie`) : Explication des sources et calculs

## Technologies utilisées

### Backend
- **Node.js** avec Express 5.1.0
- **SQLite3** (5.1.7) pour la base de données
- **Sécurité** : Helmet, CORS, rate limiting, validation des entrées
- **Utilitaires** : Compression, dotenv, csv-parser, chroma-js

### Frontend
- **Vue.js 3** (3.5.17) avec Options API
- **Vue Router 4** (4.5.1) pour la navigation
- **Vuetify 3** (3.5.0) pour l'interface utilisateur
- **Leaflet** (1.9.4) pour les cartes interactives
- **Chart.js** (4.5.0) pour les graphiques
- **Vite** (7.0.6) comme bundler
- **Pinia** (3.0.3) pour la gestion d'état

## Structure des fichiers

### Backend
```
/
├── server.js              # Point d'entrée du serveur Express
├── config/
│   ├── db.js             # Configuration base de données SQLite
│   └── index.js          # Configuration générale
├── routes/               # Routes API
│   ├── articleRoutes.js  # Articles FdeSouche
│   ├── communeRoutes.js  # Données communes
│   ├── countryRoutes.js  # Données nationales
│   ├── departementRoutes.js # Données départementales
│   ├── migrantRoutes.js  # Centres migrants
│   ├── qpvRoutes.js      # Quartiers prioritaires
│   ├── rankingRoutes.js  # Classements
│   ├── subventionRoutes.js # Subventions
│   └── cacheRoutes.js    # Gestion cache
├── services/
│   ├── cacheService.js   # Service de cache persistant
│   └── searchService.js  # Service de recherche
├── middleware/
│   ├── errorHandler.js   # Gestion des erreurs
│   ├── security.js       # Sécurisation des entrées
│   └── validate.js       # Validation des données
└── setup/                # Scripts d'import des données
```

### Frontend
```
client/
├── src/
│   ├── components/       # Composants Vue réutilisables
│   │   ├── LocationSelector.vue  # Sélecteurs géographiques
│   │   ├── MapComponent.vue      # Carte Leaflet
│   │   ├── ScoreTable.vue        # Tableaux de scores
│   │   ├── CrimeGraphs.vue       # Graphiques criminalité
│   │   ├── NamesGraph.vue        # Graphiques prénoms
│   │   ├── QpvData.vue          # Données QPV
│   │   ├── ArticleList.vue       # Liste articles
│   │   ├── ExecutiveDetails.vue  # Détails élus
│   │   ├── CentresMigrants.vue   # Centres migrants
│   │   └── CacheManager.vue      # Gestionnaire cache
│   ├── views/            # Pages principales
│   │   ├── Home.vue      # Page d'accueil
│   │   ├── Rankings.vue  # Page classements
│   │   └── Methodology.vue # Page méthodologie
│   ├── services/
│   │   ├── api.js        # Service API centralisé
│   │   └── store.js      # Store Pinia
│   ├── utils/            # Utilitaires
│   │   ├── metricsConfig.js      # Configuration métriques
│   │   ├── crime-chart-config.js # Config graphiques crime
│   │   ├── chartWatermark.js     # Watermark graphiques
│   │   └── departementNames.js   # Noms départements
│   ├── plugins/
│   │   └── vuetify.js    # Configuration Vuetify
│   └── router/
│       └── index.js      # Configuration routes
```

## API Endpoints

### Données nationales
- `GET /api/country/details?country=France` - Détails pays
- `GET /api/country/names?country=France` - Données prénoms
- `GET /api/country/crime?country=France` - Données criminalité
- `GET /api/country/crime_history?country=France` - Historique criminalité
- `GET /api/country/names_history?country=France` - Historique prénoms
- `GET /api/country/ministre?country=France` - Données ministres

### Départements
- `GET /api/departements/rankings` - Classements départements
- `GET /api/departements/:code/scores` - Scores département

### Communes
- `GET /api/communes/search?q=query` - Recherche communes
- `GET /api/communes/rankings` - Classements communes
- `GET /api/communes/:code/scores` - Scores commune

### Données spécialisées
- `GET /api/rankings/departements` - Classements avec filtres
- `GET /api/subventions/country/france` - Subventions nationales
- `GET /api/migrants/centres` - Centres migrants
- `GET /api/qpv` - Quartiers prioritaires
- `GET /api/articles` - Articles FdeSouche

## Métriques et scores

### Scores calculés
- `total_score` - Score global
- `insecurite_score` - Score insécurité
- `immigration_score` - Score immigration
- `islamisation_score` - Score islamisation
- `defrancisation_score` - Score défrancisation
- `wokisme_score` - Score wokisme

### Indicateurs criminalité
- `homicides_p100k` - Homicides pour 100k habitants
- `violences_physiques_p1k` - Violences physiques pour 1k habitants
- `violences_sexuelles_p1k` - Violences sexuelles pour 1k habitants
- `vols_p1k` - Vols pour 1k habitants
- `destructions_p1k` - Destructions pour 1k habitants
- `stupefiants_p1k` - Stupéfiants pour 1k habitants
- `escroqueries_p1k` - Escroqueries pour 1k habitants

### Indicateurs démographiques
- `prenom_francais_pct` - Pourcentage prénoms français
- `extra_europeen_pct` - Pourcentage extra-européens
- `musulman_pct` - Pourcentage musulmans
- `number_of_mosques` - Nombre de mosquées
- `mosque_p100k` - Mosquées pour 100k habitants

## Installation et développement

### Prérequis
- Node.js (version 16 ou supérieure)
- npm

### Installation complète
```bash
# Installation dépendances racine (backend)
npm install

# Installation dépendances client (frontend)
cd client && npm install && cd ..
```

### Développement

#### Démarrage du serveur complet (build + serveur)
```bash
npm run build  # Build du frontend
npm start      # Démarre le serveur Express
```

#### Développement frontend uniquement
```bash
cd client
npm run dev    # Serveur de développement Vite
```

#### Build de production
```bash
npm run build        # Build frontend dans public/
npm run build-css-prod  # Build CSS Tailwind optimisé
```

## Configuration

### Variables d'environnement
Créez un fichier `.env` à la racine :
```env
NODE_ENV=development
LOG_LEVEL=info
ENABLE_SQL_LOGGING=false
VITE_API_BASE_URL=http://localhost:3000/api
```

### Configuration serveur
- **Port** : 3000 (par défaut)
- **Host** : 0.0.0.0 pour accessibilité externe
- **Rate limiting** : 100 req/15min pour API, 20 req/min pour recherche
- **Sécurité** : Helmet, CORS, validation entrées
- **Cache** : Service de cache persistant pour optimisation

### Configuration Vuetify
- Thème clair par défaut
- Couleurs personnalisées
- Police Roboto
- Icons Material Design

## Fonctionnalités principales

### Carte interactive
- Visualisation géographique avec Leaflet
- Sélection départements/communes
- Données contextuelles

### Système de cache
- Cache persistant côté serveur
- Cache navigateur optimisé
- Invalidation automatique

### Graphiques dynamiques
- Chart.js pour visualisations
- Graphiques criminalité évolutifs
- Histogrammes prénoms temporels

### Recherche et filtrage
- Recherche de communes en temps réel
- Filtres de classements avancés
- Tri multi-critères

### Gestion d'état
- Store Pinia centralisé
- Réactivité Vue 3
- Persistance localisation

## Sécurité

### Mesures implémentées
- **Helmet** : Headers sécurisés
- **Rate limiting** : Protection DoS
- **Validation** : express-validator
- **Sanitisation** : Nettoyage entrées utilisateur
- **CORS** : Contrôle origine des requêtes
- **CSP** : Content Security Policy

### Authentification
- Middleware basic auth disponible
- Protection routes sensibles
- Validation tokens

## Performance

### Optimisations backend
- Compression gzip
- Cache persistant Redis-like
- Requêtes SQL optimisées
- Pagination résultats

### Optimisations frontend
- Bundle splitting Vite
- Lazy loading composants
- Optimisation images
- Cache navigateur

## Déploiement sur Replit

### Configuration production
L'application est configurée pour Replit avec :
- Binding sur `0.0.0.0`
- Port 3000 par défaut
- Build automatisé
- Serveur de fichiers statiques

### Commandes Replit
- **Run** : Exécute `npm run build && node server.js`
- **Build** : `npm run build` (frontend)
- **Dev** : `npm run dev` (développement)

### Structure déployée
```
public/           # Fichiers statiques générés
├── index.html    # Point d'entrée SPA
├── assets/       # CSS/JS/fonts optimisés
└── ...
```

## Base de données

### Structure SQLite
- Tables scores (départements/communes)
- Données criminalité historiques
- Prénoms par année/localisation
- QPV et subventions
- Articles et élus

### Import de données
Scripts dans `setup/` pour importer :
- Scores calculés
- Données criminalité INSEE
- Analyse prénoms
- Quartiers prioritaires
- Listes élus
- Articles FdeSouche

## Maintenance

### Logs
- Niveau configurable (info/debug/error)
- Logs SQL optionnels
- Monitoring erreurs

### Mise à jour données
```bash
node setup.js  # Réimport complet données
```

### Cache management
- Endpoint `/api/cache/clear` pour vider le cache
- Interface admin intégrée
- Monitoring utilisation mémoire

Cette application fournit une interface complète d'analyse territoriale française avec des données actualisées et une architecture moderne scalable.
