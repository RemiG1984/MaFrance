
# Ma France - Application Vue.js

Cette application Vue.js est une refonte de l'application "Ma France: état des lieux" qui analyse différents indicateurs pour évaluer l'état des lieux en France, au niveau national, départemental et communal.

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
│   ├── cacheRoutes.js    # Gestion cache
│   └── otherRoutes.js    # Routes diverses
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
│   │   ├── CacheManager.vue      # Gestionnaire cache
│   │   ├── VersionSelector.vue   # Sélecteur de version
│   │   ├── RankingFilters.vue    # Filtres classements
│   │   └── RankingResults.vue    # Résultats classements
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
- `GET /api/subventions/country/france` - Subventions nationales

### Départements
- `GET /api/departements/:code/details` - Détails département
- `GET /api/departements/:code/names` - Prénoms département
- `GET /api/departements/:code/crime` - Criminalité département
- `GET /api/departements/:code/crime_history` - Historique criminalité
- `GET /api/departements/:code/names_history` - Historique prénoms
- `GET /api/departements/:code/ministre` - Élus département
- `GET /api/subventions/departement/:code` - Subventions département

### Communes
- `GET /api/communes/search?q=query` - Recherche communes
- `GET /api/communes/:code/details` - Détails commune
- `GET /api/communes/:code/crime` - Criminalité commune
- `GET /api/communes/:code/crime_history` - Historique criminalité
- `GET /api/communes/:code/ministre` - Élus commune
- `GET /api/subventions/commune/:code` - Subventions commune

### Données spécialisées
- `GET /api/rankings/departements` - Classements départements
- `GET /api/rankings/communes` - Classements communes
- `GET /api/migrants/centres` - Centres migrants
- `GET /api/qpv` - Quartiers prioritaires
- `GET /api/articles` - Articles FdeSouche avec filtres et pagination

### Cache et utilitaires
- `GET /api/cache/status` - Statut du cache
- `POST /api/cache/clear` - Vider le cache

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

### Navigation multi-niveaux
- **National** : Données France entière
- **Départemental** : Données par département
- **Communal** : Données par commune
- Transition fluide entre les niveaux

### Carte interactive
- Visualisation géographique avec Leaflet
- Sélection départements/communes
- Données contextuelles par zone

### Système de versioning
- 3 versions de labels configurables
- Commutation dynamique via `VersionSelector`
- Persistance des préférences utilisateur

### Articles et actualités
- Intégration articles FdeSouche
- Filtrage par catégorie (insécurité, immigration, islamisme, etc.)
- Pagination avec curseur
- Compteurs par catégorie

### Centres migrants et QPV
- Cartographie des centres d'accueil
- Données quartiers prioritaires de la ville
- Pagination et filtrage avancés

### Système de cache avancé
- Cache persistant côté serveur
- Cache navigateur optimisé
- Interface d'administration du cache
- Invalidation sélective

### Graphiques dynamiques
- Chart.js pour visualisations
- Graphiques criminalité évolutifs
- Histogrammes prénoms temporels
- Watermarking automatique

### Recherche et filtrage
- Recherche de communes en temps réel
- Filtres de classements avancés
- Tri multi-critères
- Résultats paginés

### Gestion d'état centralisée
- Store Pinia avec actions asynchrones
- Chargement de données optimisé
- Gestion des erreurs intégrée
- Réactivité Vue 3

## Sécurité

### Mesures implémentées
- **Helmet** : Headers sécurisés
- **Rate limiting** : Protection DoS (100/15min, 20/min pour recherche)
- **Validation** : express-validator sur tous les endpoints
- **Sanitisation** : Nettoyage entrées utilisateur
- **CORS** : Contrôle origine des requêtes
- **CSP** : Content Security Policy

### Validation des données
- Codes département/commune
- Paramètres de pagination
- Filtres de recherche
- Prévention injection SQL

## Performance

### Optimisations backend
- Compression gzip
- Cache persistant avec TTL
- Requêtes SQL indexées et optimisées
- Pagination cursor-based
- Batch processing pour imports

### Optimisations frontend
- Bundle splitting Vite (909KB minifié)
- Lazy loading composants
- Cache persistant localStorage
- Debouncing recherches
- Virtual scrolling pour grandes listes

### Monitoring
- Logs structurés avec niveaux
- Métriques de performance
- Monitoring cache hit ratio
- Alertes erreurs

## Déploiement sur Replit

### Configuration production
L'application est configurée pour Replit avec :
- Binding sur `0.0.0.0:3000`
- Build automatisé via workflows
- Service de fichiers statiques intégré
- Variables d'environnement configurées

### Workflows disponibles
- **Build and Start Vue** : Build frontend + démarrage serveur
- **Start Server** : Démarrage serveur uniquement
- **Build and Start** : Build CSS + démarrage serveur

### Structure déployée
```
public/           # Fichiers statiques générés par Vite
├── index.html    # Point d'entrée SPA
├── assets/       # CSS/JS/fonts optimisés
│   ├── index-gCHxcsa-.css (817KB)
│   └── index-DCb9g14C.js (909KB)
└── images/       # Assets statiques
```

## Base de données SQLite

### Tables principales
- `country_*` - Données nationales (scores, criminalité, prénoms)
- `departement_*` - Données départementales
- `commune_*` - Données communales
- `articles` - Articles FdeSouche avec catégorisation
- `qpv` - Quartiers prioritaires
- `migrants_centres` - Centres d'accueil migrants
- `*_subventions` - Données subventions par niveau

### Import de données
Scripts dans `setup/` pour importer :
- Scores calculés (CSV)
- Données criminalité INSEE
- Analyse prénoms par géolocalisation
- Quartiers prioritaires (QPV)
- Listes élus (maires, préfets, ministres)
- Articles FdeSouche catégorisés
- Centres migrants géolocalisés

### Commandes d'import
```bash
node setup.js  # Import complet de toutes les données
```

## Maintenance

### Logs et monitoring
- Niveaux configurables (info/debug/error)
- Logs SQL optionnels pour debug
- Monitoring erreurs API
- Métriques de performance cache

### Gestion du cache
- Endpoint `/api/cache/clear` pour reset
- Interface admin dans `CacheManager.vue`
- Monitoring utilisation mémoire
- TTL configurables par type de données

### Mise à jour des données
Les données peuvent être mises à jour en remplaçant les fichiers CSV dans `setup/` et en relançant l'import.

## Caractéristiques techniques

### Pagination avancée
- Cursor-based pagination pour les articles
- Limit configurable (défaut: 20, max: 100)
- Chargement incrémental ("Load More")
- Compteurs de catégories en temps réel

### Filtrage multi-critères
- Par département, commune, lieu
- Par catégorie d'articles
- Par type de centres migrants
- Combinaisons de filtres

### Responsive design
- Interface Vuetify adaptative
- Cartes optimisées mobile
- Tableaux avec défilement horizontal
- Navigation hamburger sur mobile

Cette application fournit une interface complète d'analyse territoriale française avec des données actualisées, une architecture moderne scalable et des fonctionnalités avancées de visualisation et d'analyse.
