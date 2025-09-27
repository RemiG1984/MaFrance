
# Ma France - Application Vue.js

## English Overview

Ma France is a comprehensive data analysis application that provides detailed insights into various indicators across France at national, departmental, and municipal levels. The application analyzes multiple dimensions including security, immigration, islamization, de-francization, and woke ideology through an interactive web interface with map visualizations, statistical correlations, charts, and detailed breakdowns.

## Vue.js Single Page Application

Cette Single Page Application Vue.js "Ma France: état des lieux" analyse différents indicateurs pour évaluer l'état des lieux en France, au niveau national, départemental et communal.

## Architecture de l'application

### Structure générale
L'application est composée de deux parties principales :
- **Backend Node.js/Express** : API REST avec base de données SQLite
- **Frontend Vue.js 3** : Interface utilisateur construite avec Vite

### Pages principales
- **Accueil** (`/`) : Carte interactive, sélecteurs de localisation, et toutes les données
- **Classements** (`/classements`) : Tableaux de classements des départements et communes
- **Corrélations** (`/correlations`) : Analyse des corrélations statistiques entre métriques avec heatmap et nuages de points
- **Localisation** (`/localisation`) : Carte interactive des QPV, centres de migrants et mosquées avec recherche d'adresse
- **Méthodologie** (`/methodologie`) : Explication des sources et calculs

## Technologies utilisées

### Backend
- **Node.js** avec Express 5.1.0
- **SQLite3** (5.1.7) pour la base de données
- **Sécurité** : Helmet, CORS, rate limiting, validation des entrées
- **Utilitaires** : Compression, dotenv, csv-parser, chroma-js

### Frontend
- **Vue.js 3** (3.5.17) avec Options API et Composition API
- **Vue Router 4** (4.5.1) pour la navigation
- **Vuetify 3** (3.5.0) pour l'interface utilisateur
- **Leaflet** (1.9.4) pour les cartes interactives
- **Chart.js** (4.5.0) pour les graphiques et visualisations de corrélations
- **Vite** (7.0.6) comme bundler
- **Pinia** (3.0.3) pour la gestion d'état
- **Chroma.js** pour les échelles de couleurs

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
│   ├── mosqueRoutes.js   # Mosquées
│   ├── nat1Routes.js     # Données nationalité NAT1
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
│   │   ├── ArticleList.vue         # Liste articles
│   │   ├── CacheManager.vue        # Gestionnaire cache
│   │   ├── CentresMigrants.vue     # Centres migrants
│   │   ├── CorrelationHeatmap.vue  # Heatmap des corrélations
│   │   ├── CrimeGraphs.vue         # Graphiques criminalité (container)
│   │   ├── ExecutiveDetails.vue    # Détails élus
│   │   ├── Graph.vue               # Graphiques criminalité (single graph)
│   │   ├── HamburgerIcon.vue       # Menu hamburger mobile
│   │   ├── LocationSelector.vue    # Sélecteurs géographiques
│   │   ├── MapComponent.vue        # Carte Leaflet
│   │   ├── NamesGraph.vue          # Graphiques prénoms de naissance
│   │   ├── QpvData.vue             # Données QPV
│   │   ├── RankingFilters.vue      # Filtres classements
│   │   ├── RankingResults.vue      # Résultats classements
│   │   ├── ScatterPlot.vue         # Nuages de points pour corrélations
│   │   ├── ScoreTable.vue          # Tableaux de scores
│   │   ├── ShareButton.vue         # Création d'url spécifiques de partage
│   │   ├── Subventions.vue         # Tableau des subventions
│   │   └── VersionSelector.vue     # Sélecteur de version
│   ├── views/            # Pages principales
│   │   ├── Home.vue          # Page d'accueil
│   │   ├── Rankings.vue      # Page classements
│   │   ├── Correlations.vue  # Page analyse des corrélations
│   │   ├── Localisation.vue  # Page carte des lieux d'intérêt
│   │   └── Methodology.vue   # Page méthodologie
│   ├── services/
│   │   ├── api.js        # Service API centralisé
│   │   └── store.js      # Store Pinia
│   ├── utils/            # Utilitaires
│   │   ├── metricsConfig.js      # Configuration métriques
│   │   ├── chartWatermark.js     # Watermark graphiques
│   │   ├── departementNames.js   # Noms département
│   │   └── utils.js              # Fonctions utilitaires
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
- `GET /api/subventions/country` - Subventions nationales

### Départements
- `GET /api/departements/:code/details` - Détails département
- `GET /api/departements/:code/names` - Prénoms département
- `GET /api/departements/:code/crime` - Criminalité département
- `GET /api/departements/:code/crime_history` - Historique criminalité
- `GET /api/departements/:code/names_history` - Historique prénoms
- `GET /api/departements/:code/prefet` - Préfet département
- `GET /api/subventions/departement/:code` - Subventions département

### Communes
- `GET /api/communes/search?q=query` - Recherche communes
- `GET /api/communes/:code/details` - Détails commune
- `GET /api/communes/:code/crime` - Criminalité commune
- `GET /api/communes/:code/crime_history` - Historique criminalité
- `GET /api/communes/:code/maire` - Maire commune
- `GET /api/subventions/commune/:code` - Subventions commune

### Données spécialisées
- `GET /api/rankings/departements` - Classements départements
- `GET /api/rankings/communes` - Classements communes
- `GET /api/migrants` - Centres migrants avec pagination
- `GET /api/mosques` - Mosquées avec filtrage géographique
- `GET /api/mosques/closest` - Mosquées les plus proches d'une position
- `GET /api/qpv` - Quartiers prioritaires avec pagination
- `GET /api/qpv/geojson` - Données géographiques QPV
- `GET /api/qpv/closest` - QPV les plus proches d'une position
- `GET /api/nat1/country` - Données nationalité niveau national
- `GET /api/nat1/departement` - Données nationalité niveau départemental
- `GET /api/nat1/commune` - Données nationalité niveau communal
- `GET /api/articles` - Articles FdeSouche avec filtres et pagination

### Cache et utilitaires
- `GET /api/cache/stats` - Statut du cache
- `POST /api/cache/clear` - Vider le cache
- `POST /api/cache/refresh` - Rafraîchir le cache

## Nouvelles fonctionnalités

### Analyse des corrélations
- **Matrice de corrélation** : Calcul et visualisation des coefficients de Pearson entre toutes les métriques
- **Heatmap interactive** : Visualisation colorée des corrélations avec légende détaillée
- **Nuages de points** : Graphiques de dispersion pour explorer les relations entre variables
- **Filtrage par niveau** : Analyse au niveau départemental ou communal
- **Sélection des métriques** : Choix des variables à inclure dans l'analyse

### Carte de localisation
- **Carte interactive** : Visualisation des QPV, centres de migrants et mosquées
- **Recherche d'adresse** : Géolocalisation d'adresses avec API de géocodage
- **Géolocalisation** : Détection de la position de l'utilisateur
- **Calcul de distances** : Distances aux QPV, centres et mosquées les plus proches
- **Overlays configurables** : Affichage sélectif des différents types de lieux

## Métriques et scores

### Scores calculés
- `total_score` - Score global
- `insecurite_score` - Score insécurité
- `immigration_score` - Score immigration
- `islamisation_score` - Score islamisation
- `defrancisation_score` - Score défrancisation
- `wokisme_score` - Score wokisme

### Indicateurs criminalité
- `homicides_total_p100k` - Homicides pour 100k habitants
- `violences_physiques_p1k` - Violences physiques pour 1k habitants
- `violences_sexuelles_p1k` - Violences sexuelles pour 1k habitants
- `vols_p1k` - Vols pour 1k habitants
- `destructions_p1k` - Destructions pour 1k habitants
- `stupefiants_p1k` - Stupéfiants pour 1k habitants
- `escroqueries_p1k` - Escroqueries pour 1k habitants

### Indicateurs démographiques et sociologiques
- `prenom_francais_pct` - Pourcentage prénoms français
- `musulman_pct` - Pourcentage prénoms musulmans
- `extra_europeen_pct` - Pourcentage extra-européens
- `etrangers_pct` - Pourcentage d'étrangers
- `francais_de_naissance_pct` - Pourcentage français de naissance
- `naturalises_pct` - Pourcentage naturalisés
- `europeens_pct` - Pourcentage européens
- `maghrebins_pct` - Pourcentage maghrébins
- `africains_pct` - Pourcentage africains
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

#### Mode développement avec HMR (recommandé)
```bash
# Utiliser le workflow "HMR Development" ou :
npm run dev    # Démarre Vite (port 5173) + serveur API (port 3000)
```

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

## Fonctionnalités principales

### Navigation multi-niveaux
- **National** : Données France entière
- **Départemental** : Données par département
- **Communal** : Données par commune
- Transition fluide entre les niveaux

### Cartes interactives
- **Carte principale** : Visualisation géographique avec Leaflet
- **Carte de localisation** : QPV, centres de migrants, mosquées
- Sélection départements/communes
- Données contextuelles par zone
- Géolocalisation et calcul de distances

### Système de versioning
- 3 versions de labels configurables
- Commutation dynamique via `VersionSelector`
- Persistance des préférences utilisateur

### Analyses statistiques avancées
- **Corrélations** : Calcul des coefficients de Pearson
- **Visualisations** : Heatmaps et nuages de points interactifs
- **Filtrage** : Sélection des métriques et niveaux d'analyse
- **Export** : Possibilité de partage des analyses

### Articles et actualités
- Intégration articles FdeSouche
- Filtrage par catégorie (insécurité, immigration, islamisme, etc.)
- Pagination avec curseur
- Compteurs par catégorie

### Données géolocalisées
- **QPV** : Cartographie des quartiers prioritaires
- **Centres migrants** : Localisation et capacités
- **Mosquées** : Répartition géographique
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
- Heatmaps de corrélation
- Watermarking automatique

## Sécurité

### Mesures implémentées
- **Helmet** : Headers sécurisés
- **Rate limiting** : Protection DoS (100/15min, 20/min pour recherche)
- **Validation** : express-validator sur tous les endpoints
- **Sanitisation** : Nettoyage entrées utilisateur
- **CORS** : Contrôle origine des requêtes
- **CSP** : Content Security Policy

## Performance

### Optimisations backend
- Compression gzip
- Cache persistant avec TTL
- Requêtes SQL indexées et optimisées
- Pagination cursor-based
- Batch processing pour imports

### Optimisations frontend
- Bundle splitting Vite
- Lazy loading composants
- Cache persistant localStorage
- Debouncing recherches
- Virtual scrolling pour grandes listes

## Service Worker et Cache

### Fonctionnalités du Service Worker
L'application utilise un service worker (`public/sw.js`) pour :
- **Cache offline** : Assets statiques mis en cache automatiquement
- **Détection de mises à jour** : Vérification périodique des changements
- **Rechargement automatique** : Actualisation lors de nouvelles versions
- **Cache API** : Mise en cache intelligente des réponses API

## Déploiement sur Replit

### Configuration production
L'application est configurée pour Replit avec :
- Binding sur `0.0.0.0:3000`
- Build automatisé via workflows
- Service de fichiers statiques intégré
- Variables d'environnement configurées
- Service worker activé pour cache offline

### Workflows disponibles
- **HMR Development** : Développement avec hot reload (client sur port 5173)
- **Production Build** : Build frontend + démarrage serveur production
- **Backend API** : Démarrage serveur uniquement
- **Frontend Dev Server** : Serveur de développement frontend

## Base de données SQLite

### Tables principales
- `country_*` - Données nationales (scores, criminalité, prénoms, NAT1)
- `departement_*` - Données départementales
- `commune_*` - Données communales
- `articles` - Articles FdeSouche avec catégorisation
- `qpv_data` - Quartiers prioritaires
- `qpv_coordinates` - Coordonnées géographiques QPV
- `migrant_centers` - Centres d'accueil migrants
- `mosques` - Lieux de culte musulmans
- `*_subventions` - Données subventions par niveau
- `*_nat1` - Données de nationalité INSEE NAT1

### Import de données
Scripts dans `setup/` pour importer :
- Scores calculés (CSV)
- Données criminalité INSEE
- Analyse prénoms par géolocalisation
- Quartiers prioritaires (QPV) avec géométries
- Listes élus (maires, préfets, ministres)
- Articles FdeSouche catégorisés
- Centres migrants géolocalisés
- Mosquées avec coordonnées
- Données NAT1 de nationalité

Cette application fournit une interface complète d'analyse territoriale française avec des données actualisées, une architecture moderne scalable et des fonctionnalités avancées de visualisation, d'analyse statistique et de géolocalisation.
