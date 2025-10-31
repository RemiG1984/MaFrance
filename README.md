
# Ma France - Application Vue.js

## English Overview

Ma France is a comprehensive data analysis application that provides detailed insights into various indicators across France at national, departmental, and municipal levels. The application analyzes multiple dimensions including security, immigration, islamization, de-francization, and woke ideology through an interactive web interface with map visualizations, statistical correlations, charts, and detailed breakdowns.

## Vue.js Single Page Application

Cette Single Page Application Vue.js "Ma France: état des lieux" analyse différents indicateurs pour évaluer l'état des lieux en France, au niveau national, départemental et communal.

**Fonctionnalités clés :**
- 🗺️ **Cartes interactives** avec visualisation géographique
- 📊 **Analyses statistiques** avec corrélations et graphiques
- 🔍 **Recherche avancée** par commune et département
- 🏛️ **Données politiques** et démographiques
- 🕌 **Cartographie spécialisée** (QPV, centres migrants, mosquées)
- 📈 **Tableaux de classement** départemental et communal
- 🔒 **Sécurité renforcée** avec rate limiting et validation
- 🧪 **Suite de tests complète** (99.6% de couverture)
- 🐳 **Déploiement conteneurisé** prêt pour production

## Architecture de l'application

### Structure générale
L'application est composée de deux parties principales :
- **Backend Node.js/Express** : API REST avec base de données SQLite
- **Frontend Vue.js 3** : Interface utilisateur construite avec Vite

### Pages principales
- **Accueil** (`/`) : Carte interactive, sélecteurs de localisation, et toutes les données
- **Classements** (`/classements`) : Tableaux de classements des départements et communes
- **Corrélations** (`/correlations`) : Analyse des corrélations statistiques entre métriques avec heatmap et nuages de points
- **Démographie** (`/demography`) : Analyse démographique avec graphiques d'évolution, pyramide des âges et taux de fécondité
- **Localisation** (`/localisation`) : Carte interactive des QPV, centres de migrants et mosquées avec recherche d'adresse
- **Politique** (`/politique`) : Analyse des valeurs moyennes des communes selon la famille politique du maire
- **Méthodologie** (`/methodologie`) : Explication des sources et calculs

## Technologies utilisées

### Backend
- **Node.js** avec Express 5.1.0
- **SQLite3** (5.1.7) pour la base de données
- **Sécurité** : Helmet, CORS, rate limiting, validation des entrées
- **Cache** : Service de cache persistant avec TTL
- **Monitoring** : Health checks et métriques d'application
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

### Racine
```
/
├── .gitignore             # Fichiers ignorés par Git
├── LICENCE.md             # Licence du projet
├── package.json           # Dépendances et scripts backend
├── package-lock.json      # Verrouillage versions dépendances backend
├── README.md              # Documentation du projet
├── server.js              # Point d'entrée du serveur Express
├── .data/                 # Données persistantes (cache, etc.)
├── .vscode/               # Configuration VS Code
├── config/                # Configuration serveur
│   ├── db.js             # Configuration base de données SQLite
│   └── index.js          # Configuration générale
├── middleware/            # Middlewares Express
│   ├── cache.js          # Middleware cache
│   ├── errorHandler.js   # Gestion des erreurs
│   ├── security.js       # Sécurisation des entrées
│   └── validate.js       # Validation des données
├── public/                # Assets statiques servis par le serveur
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── browserconfig.xml
│   ├── classements-1200x630.png
│   ├── demography-1200x630.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── localisation-1200x630.png
│   ├── robots.txt
│   ├── site.webmanifest
│   ├── sw.js             # Service Worker
│   ├── twitter-1200x630.png
│   ├── data/             # Données publiques
│   │   ├── fertility.csv
│   │   ├── migration.csv
│   │   ├── mortality.csv
│   │   ├── pop_historique.csv
│   │   ├── pyramid.csv
│   │   └── TFR.csv
│   └── images/           # Images publiques
│       └── kofi_symbol.webp
├── routes/               # Routes API
│   ├── base/
│   │   └── BaseRoute.js  # Classe de base pour toutes les routes API (DRY pattern)
│   ├── articleRoutes.js  # Articles FdeSouche
│   ├── cacheRoutes.js    # Gestion cache
│   ├── communeRoutes.js  # Données communes (utilise BaseRoute)
│   ├── countryRoutes.js  # Données nationales (utilise BaseRoute)
│   ├── departementRoutes.js # Données départementales (utilise BaseRoute)
│   ├── migrantRoutes.js  # Centres migrants
│   ├── mosqueRoutes.js   # Mosquées
│   ├── nat1Routes.js     # Données nationalité NAT1
│   ├── otherRoutes.js    # Routes diverses
│   ├── qpvRoutes.js      # Quartiers prioritaires
│   ├── rankingRoutes.js  # Classements
│   └── subventionRoutes.js # Subventions
├── services/             # Services métier
│   ├── cacheService.js   # Service de cache persistant
│   └── searchService.js  # Service de recherche
└── setup/                # Scripts d'import des données
    ├── baseImporter.js   # Classe de base pour les imports CSV (DRY)
    ├── importArticles.js # Import articles FdeSouche
    ├── importCrimeData.js # Import données criminalité
    ├── importElus.js     # Import élus (maires, préfets, ministres)
    ├── importMigrants.js # Import centres migrants
    ├── importMosques.js  # Import mosquées
    ├── importNames.js    # Import analyse prénoms
    ├── importNat1.js     # Import données NAT1
    ├── importQPV.js      # Import quartiers prioritaires
    ├── importQpvGeoJson.js # Import géométries QPV
    ├── importScores.js   # Import scores calculés
    ├── importSubventions.js # Import subventions
    ├── importUtils.js    # Utilitaires communs pour les imports
    └── inputFiles/       # Fichiers de données d'entrée
        ├── analyse_prenom_commune.csv
        ├── analyse_prenom_departement.csv
        ├── analyse_prenom_france.csv
        ├── analyse_qpv.csv
        ├── centres_migrants.csv
        ├── commune_scores.csv
        ├── commune_subventions.csv
        ├── crime_data_commune.csv
        ├── crime_data_departement.csv
        ├── crime_data_france.csv
        ├── departement_scores.csv
        ├── departement_subventions.csv
        ├── fdesouche_analyzed.csv
        ├── france_scores.csv
        ├── france_subventions.csv
        ├── insee_NAT1_detailed_inferred.csv
        ├── maires_list.csv
        ├── ministre_interieur_list.csv
        ├── mosques_france_with_cog.csv
        ├── prefets_list.csv
        └── qpv2024_simplified.geojson
```

### Frontend
```
client/
├── index.html            # Point d'entrée HTML
├── package.json          # Dépendances et scripts frontend
├── package-lock.json     # Verrouillage versions dépendances frontend
├── vite.config.js        # Configuration Vite
└── src/
    ├── App.vue           # Composant racine Vue
    ├── main.js           # Point d'entrée JavaScript
    ├── style.css         # Styles globaux
    ├── components/       # Composants Vue réutilisables
    │   ├── Correlations/
    │   │   ├── CorrelationHeatmap.vue  # Heatmap des corrélations
    │   │   └── ScatterPlot.vue         # Nuages de points pour corrélations
    │   ├── Demography/
    │   │   ├── DemGraph.vue            # Graphiques démographiques
    │   │   ├── DemParameters.vue       # Paramètres démographiques
    │   │   └── DemPyramid.vue          # Pyramide des âges
    │   ├── Home/
    │   │   ├── ArticleList.vue         # Liste articles
    │   │   ├── CentresMigrants.vue     # Centres migrants
    │   │   ├── CrimeGraphs.vue         # Graphiques criminalité (container)
    │   │   ├── ExecutiveDetails.vue    # Détails élus
    │   │   ├── Graph.vue               # Graphiques criminalité (single graph)
    │   │   ├── LocationSelector.vue    # Sélecteurs géographiques
    │   │   ├── MapComponent.vue        # Carte Leaflet
    │   │   ├── MosqueTable.vue         # Tableau des mosquées
    │   │   ├── NamesGraph.vue          # Graphiques prénoms de naissance
    │   │   ├── QpvData.vue             # Données QPV
    │   │   ├── ScoreTable.vue          # Tableaux de scores
    │   │   ├── Subventions.vue         # Tableau des subventions
    │   │   └── VersionSelector.vue     # Sélecteur de version
    │   ├── Localisation/
    │   │   ├── DistanceInfo.vue        # Informations de distance
    │   │   ├── LocationDataBox.vue     # Boîte de données de localisation
    │   │   ├── LocationSearch.vue      # Recherche de localisation
    │   │   ├── locationStore.js        # Store de localisation
    │   │   └── MapContainer.vue        # Conteneur de carte
    │   ├── Menu/
    │   │   ├── HamburgerIcon.vue       # Menu hamburger mobile
    │   │   └── ShareButton.vue         # Création d'url spécifiques de partage
    │   └── Rankings/
    │       ├── RankingFilters.vue      # Filtres classements
    │       └── RankingResults.vue      # Résultats classements
    ├── plugins/
    │   └── vuetify.js    # Configuration Vuetify
    ├── router/
    │   └── index.js      # Configuration routes
    ├── services/
    │   ├── api.js        # Service API centralisé
    │   └── store.js      # Store Pinia
    ├── utils/            # Utilitaires
    │   ├── chartWatermark.js     # Watermark graphiques
    │   ├── departementNames.js   # Noms département
    │   ├── metricsConfig.js      # Configuration métriques
    │   └── utils.js              # Fonctions utilitaires
    └── views/            # Pages principales
        ├── Correlations.vue  # Page analyse des corrélations
        ├── Demography.vue   # Page démographie
        ├── Home.vue         # Page d'accueil
        ├── Localisation.vue # Page carte des lieux d'intérêt
        ├── Methodology.vue  # Page méthodologie
        ├── Politique.vue    # Page analyse politique
        ├── Rankings.vue     # Page classements
        └── Support.vue      # Page support
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
- `GET /api/rankings/politique` - Classements politiques par famille
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
- Node.js (version 18 ou supérieure)
- npm
- Docker & Docker Compose (pour déploiement conteneurisé)

### Installation rapide avec Docker (Recommandé)
```bash
# Cloner le repository
git clone https://github.com/RemiG1984/MaFrance.git
cd MaFrance

# Configurer l'environnement
cp .env.example .env

# Démarrer avec Docker Compose
docker-compose up -d

# Vérifier que l'application fonctionne
curl http://localhost:3000/api/health
```

### Installation traditionnelle
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
- **Sécurité conteneur** : Utilisateur non-root, surface d'attaque minimale
- **Analyse de vulnérabilités** : Scan automatique avec Trivy

## Tests et Qualité

### Suite de tests
- **100+ tests** couvrant toutes les routes et services
- **99.6% de couverture** de code
- **Tests d'intégration** pour les workflows API complets
- **Tests de performance** avec benchmarking
- **Tests unitaires** pour utilitaires et middleware

### CI/CD
- **GitHub Actions** : Tests automatisés sur Node.js 18, 20, 22
- **Linting intégré** : ESLint pour code quality
- **Sécurité automatisée** : Scan de vulnérabilités hebdomadaire
- **Dépendabot** : Mises à jour automatiques des dépendances

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

## Déploiement

### Déploiement rapide avec Docker (Recommandé)
```bash
# Production avec nginx reverse proxy
docker-compose --profile production up -d

# Développement uniquement
docker-compose up -d
```

### Déploiement traditionnel sur server VPS
L'application est configurée pour production avec :
- pm2
- Nginx (directly serve the static files, forward to port :3000 internally for api requests)
- Build automatisé via script (deploy)
- Service worker activé pour cache offline

Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour les instructions détaillées.

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
Scripts dans `setup/` pour importer (architecture DRY avec BaseImporter et importUtils pour éviter la duplication de code) :
- Scores calculés (CSV depuis inputFiles/)
- Données criminalité INSEE (CSV depuis inputFiles/)
- Analyse prénoms par géolocalisation (CSV depuis inputFiles/)
- Quartiers prioritaires (QPV) avec géométries (GeoJSON depuis inputFiles/)
- Listes élus (maires, préfets, ministres) (CSV depuis inputFiles/)
- Articles FdeSouche catégorisés (CSV depuis inputFiles/)
- Centres migrants géolocalisés (CSV depuis inputFiles/)
- Mosquées avec coordonnées (CSV depuis inputFiles/)
- Données NAT1 de nationalité (CSV depuis inputFiles/)

Cette application fournit une interface complète d'analyse territoriale française avec des données actualisées, une architecture moderne scalable et des fonctionnalités avancées de visualisation, d'analyse statistique et de géolocalisation.

### GDPR and privacy compliance
Aggregated public data per GDPR Art. 89. 
No personal data is included. All building adresses are publicly available. 

## License
This project is licensed under the **MIT License**