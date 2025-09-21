
# Ma France - Application Vue.js d'Analyse des Données Françaises

## Overview

Ma France is a comprehensive data analysis application that provides detailed insights into various indicators across France at national, departmental, and municipal levels. The application analyzes multiple dimensions including security, immigration, islamization, de-francization, and woke ideology through an interactive web interface with map visualizations, statistical correlations, charts, and detailed breakdowns.

## User Preferences

Preferred communication style: Simple, everyday language.

## New Features

### Statistical Correlation Analysis
- **Pearson Correlation Matrix**: Calculate and visualize correlation coefficients between all metrics
- **Interactive Heatmap**: Color-coded correlation visualization with detailed legend
- **Scatter Plots**: Interactive scatter plots to explore relationships between variables
- **Level Filtering**: Analysis at departmental or municipal levels
- **Metric Selection**: Choose which variables to include in correlation analysis
- **Real-time Updates**: Dynamic recalculation based on user selections

### Interactive Location Mapping
- **Multi-layer Map**: Visualization of Priority Urban Areas (QPV), migrant centers, and mosques
- **Address Search**: Geocoding integration for address lookup
- **Geolocation**: User position detection and nearest point calculation
- **Distance Calculation**: Automatic distance computation to nearest QPVs, centers, and mosques
- **Configurable Overlays**: Selective display of different location types
- **Detailed Information**: Expandable details for each location type

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
- Specialized datasets (QPV, migrants, mosques, etc.)
- New correlation and geolocation endpoints

**Security Implementation**: Multi-layered security with Helmet.js, CORS configuration, rate limiting (200 requests/15min general, 50/min for search), input validation using express-validator, and XSS protection middleware

**Performance Optimization**: 
- Server-side caching service that preloads critical data on startup
- Request deduplication and persistent client-side caching
- Gzip compression
- Database query optimization with proper indexing
- Cursor-based pagination for large datasets

**Data Import System**: Comprehensive setup scripts for importing data from CSV files into SQLite, including crime data, demographics, articles, specialized datasets, and geolocation data

### Frontend Architecture

**Framework**: Vue.js 3 with both Composition API and Options API patterns, using Vite as the build tool and bundler

**UI Framework**: Vuetify 3 (Material Design) providing consistent component library, theming system, and responsive layout utilities

**State Management**: Pinia for centralized state management with persistent caching of API responses and user preferences

**Routing**: Vue Router 4 with history mode for clean URLs across main sections:
- Home: Main dashboard with all data visualization
- Rankings: Comparative tables and rankings
- Correlations: Statistical analysis and correlation visualization
- Localisation: Interactive mapping of key locations
- Methodology: Data sources and calculation explanations

**Visualization Libraries**:
- Leaflet for interactive maps with custom styling and data overlays
- Chart.js for statistical charts, graphs, and correlation heatmaps
- Chroma.js for color scale generation and data visualization

**Progressive Web App**: Service worker implementation with intelligent caching strategy, build-based cache invalidation, and offline capability for previously loaded data

### Data Architecture

**Geographic Hierarchy**: Three-tier system (Country → Department → Commune) with proper COG (Code Officiel Géographique) handling for French administrative divisions

**Metrics System**: Centralized configuration for all metrics with multiple label perspectives (neutral, inclusive, identitarian) and dynamic color scaling based on statistical ranges

**Search Implementation**: Optimized search service with fuzzy matching using Levenshtein distance algorithm for commune name searching and autocomplete functionality

**Geolocation Services**: 
- Haversine distance calculations for proximity analysis
- Geocoding integration for address-to-coordinate conversion
- Spatial data handling for QPV boundaries and point locations

**Statistical Analysis**: 
- Pearson correlation coefficient calculations
- Matrix operations for multi-variable analysis
- Real-time data filtering and aggregation

**Data Validation**: Comprehensive validation middleware for French administrative codes, population ranges, search queries, coordinate validation, and API parameters

### Performance & Scalability

**Caching Strategy**: Multi-level caching with server-side preloading, client-side persistent storage, and service worker caching with build-hash invalidation

**Database Optimization**: Proper indexing on frequently queried fields, batch processing for data imports, connection pooling with timeout management, and spatial indexing for geolocation queries

**Build Optimization**: Code splitting with vendor chunks, dynamic imports, asset optimization, and build hash injection for cache busting

**Memory Management**: Efficient handling of large datasets through virtual scrolling and pagination

## External Dependencies

**Core Framework Dependencies**:
- Vue.js 3 ecosystem (Vue Router, Pinia)
- Vuetify 3 for Material Design components
- Express.js with security middleware (Helmet, CORS)

**Database & Storage**:
- SQLite3 for local database storage
- No external database servers required

**Visualization & Mapping**:
- Leaflet for interactive mapping with geolocation features
- Chart.js for data visualization and correlation analysis
- Chroma.js for color calculations and heatmap generation

**Development & Build Tools**:
- Vite for frontend build process
- Node.js built-in modules for backend operations
- CSV-parser for data import processing

**Security & Validation**:
- Express-validator for input validation
- Express-rate-limit for API protection
- Built-in Node.js security practices

**Mathematical & Statistical**:
- Built-in JavaScript Math functions for statistical calculations
- Custom implementations for correlation analysis and distance calculations

**No External APIs**: The application is designed to be fully self-contained without dependencies on external APIs or third-party services for core functionality, making it suitable for offline deployment scenarios. Geocoding features can work with external services but degrade gracefully when unavailable.

## Key Features

### Advanced Data Analysis
- **Multi-dimensional Analysis**: Comprehensive scoring across 5 key dimensions
- **Statistical Correlations**: Real-time correlation analysis between all metrics
- **Trend Analysis**: Historical data visualization and pattern recognition
- **Comparative Rankings**: Department and municipality rankings with filtering

### Interactive Mapping
- **Primary Map**: Color-coded visualization based on selected metrics
- **Location Map**: Specialized view for QPVs, migrant centers, and mosques
- **Real-time Search**: Address geocoding and proximity analysis
- **Distance Calculations**: Automatic computation of distances to points of interest

### Data Visualization
- **Dynamic Charts**: Crime trends, demographic evolution, correlation heatmaps
- **Responsive Design**: Mobile-optimized interface with adaptive layouts
- **Export Capabilities**: Share links with specific configurations
- **Version Control**: Multiple labeling systems for different perspectives

### Content Management
- **Article Integration**: Categorized news articles with filtering
- **Executive Information**: Current officials at all administrative levels
- **Financial Data**: Public subsidies and expenditure analysis
- **Demographic Tracking**: Name analysis and population composition

This application provides a comprehensive platform for territorial analysis of France with current data, modern scalable architecture, and advanced features for statistical analysis and geolocation services.
