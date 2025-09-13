# Ma France - Application Vue.js d'Analyse des Données Françaises

## Overview

Ma France is a comprehensive data analysis application that provides detailed insights into various indicators across France at national, departmental, and municipal levels. The application analyzes multiple dimensions including security, immigration, islamization, de-francization, and woke ideology through an interactive web interface with map visualizations, charts, and detailed statistical breakdowns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The application uses a monorepo structure with the main Node.js/Express server in the root directory and the Vue.js client in a separate `/client` subdirectory. Both frontend and backend dependencies are managed in the root `package.json` for simplified deployment on platforms like Replit.

### Backend Architecture

**Framework & Runtime**: Node.js with Express 5.1.0 serving as the primary API server

**Database**: SQLite3 (5.1.7) with a single database file (`.data/france.db`) containing all application data including geographical entities, crime statistics, demographics, articles, and specialized datasets

**API Design**: RESTful API structure with modularized routes:
- Country-level data (`/api/country/*`)
- Department-level data (`/api/departements/*`) 
- Municipality data (`/api/communes/*`)
- Article data (`/api/articles`)
- Specialized datasets (QPV, migrants, francocides, etc.)

**Security Implementation**: Multi-layered security with Helmet.js, CORS configuration, rate limiting (200 requests/15min general, 50/min for search), input validation using express-validator, and XSS protection middleware

**Performance Optimization**: 
- Server-side caching service that preloads critical data on startup
- Request deduplication and persistent client-side caching
- Gzip compression
- Database query optimization with proper indexing

**Data Import System**: Comprehensive setup scripts for importing data from CSV files into SQLite, including crime data, demographics, articles, and specialized datasets

### Frontend Architecture

**Framework**: Vue.js 3 with Composition API and Options API patterns, using Vite as the build tool and bundler

**UI Framework**: Vuetify 3 (Material Design) providing consistent component library, theming system, and responsive layout utilities

**State Management**: Pinia for centralized state management with persistent caching of API responses and user preferences

**Routing**: Vue Router 4 with history mode for clean URLs across main sections (Home, Rankings, Methodology, Memorial, Correlations)

**Visualization Libraries**:
- Leaflet for interactive maps with custom styling and data overlays
- Chart.js for statistical charts and graphs
- Chroma.js for color scale generation and data visualization

**Progressive Web App**: Service worker implementation with intelligent caching strategy, build-based cache invalidation, and offline capability for previously loaded data

### Data Architecture

**Geographic Hierarchy**: Three-tier system (Country → Department → Commune) with proper COG (Code Officiel Géographique) handling for French administrative divisions

**Metrics System**: Centralized configuration for all metrics with multiple label perspectives (neutral, inclusive, identitarian) and dynamic color scaling based on statistical ranges

**Search Implementation**: Optimized search service with fuzzy matching using Levenshtein distance algorithm for commune name searching and autocomplete functionality

**Data Validation**: Comprehensive validation middleware for French administrative codes, population ranges, search queries, and API parameters

### Performance & Scalability

**Caching Strategy**: Multi-level caching with server-side preloading, client-side persistent storage, and service worker caching with build-hash invalidation

**Database Optimization**: Proper indexing on frequently queried fields, batch processing for data imports, and connection pooling with timeout management

**Build Optimization**: Code splitting with vendor chunks, dynamic imports, asset optimization, and build hash injection for cache busting

## External Dependencies

**Core Framework Dependencies**:
- Vue.js 3 ecosystem (Vue Router, Pinia)
- Vuetify 3 for Material Design components
- Express.js with security middleware (Helmet, CORS)

**Database & Storage**:
- SQLite3 for local database storage
- No external database servers required

**Visualization & Mapping**:
- Leaflet for interactive mapping
- Chart.js for data visualization
- Chroma.js for color calculations

**Development & Build Tools**:
- Vite for frontend build process
- Node.js built-in modules for backend operations
- CSV-parser for data import processing

**Security & Validation**:
- Express-validator for input validation
- Express-rate-limit for API protection
- Built-in Node.js security practices

**No External APIs**: The application is designed to be fully self-contained without dependencies on external APIs or third-party services, making it suitable for offline deployment scenarios.