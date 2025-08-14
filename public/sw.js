// Build hash will be injected during build process
const BUILD_HASH = self.BUILD_HASH || Date.now().toString();
const CACHE_NAME = `ma-france-${BUILD_HASH}`;
const STATIC_CACHE_NAME = `ma-france-static-${BUILD_HASH}`;
const API_CACHE_NAME = `ma-france-api-${BUILD_HASH}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// API routes that should be cached
const API_ROUTES = [
  '/api/country/details',
  '/api/country/names',
  '/api/country/crime',
  '/api/departements',
  '/api/communes'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with build hash:', BUILD_HASH);
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached');
        // Store build info for comparison
        return caches.open(STATIC_CACHE_NAME).then(cache => {
          return cache.put('__build_info__', new Response(JSON.stringify({
            buildHash: BUILD_HASH,
            timestamp: Date.now()
          })));
        });
      })
      .then(() => {
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with build hash:', BUILD_HASH);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions - keep only current build hash caches
          if (cacheName !== STATIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              (cacheName.startsWith('ma-france-') || cacheName.startsWith('workbox-'))) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Old caches cleaned up for build:', BUILD_HASH);
      return self.clients.claim(); // Take control of all clients
    })
  );
});

// Fetch event - handle requests with proper cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.match(/\.(js|css)$/)) {
    // JS/CSS assets - cache first but check for updates
    event.respondWith(handleAssetRequest(request));
  } else if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    // Static assets - cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // HTML pages - network first with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests - network first
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Network failed for API request, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle asset requests (JS/CSS) - network first to get latest versions
async function handleAssetRequest(request) {
  try {
    // Always try network first for assets to get latest versions
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    console.log('Network failed for asset, trying cache:', request.url);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If no cache, return network error
  return fetch(request);
}

// Handle static requests - cache first
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests - network first
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Network failed for page, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }

    throw error;
  }
}

function isEssentialApiRoute(pathname) {
  const essentialRoutes = [
    '/api/country/details',
    '/api/country/names',
    '/api/country/crime'
  ];
  return essentialRoutes.some(route => pathname.includes(route));
}

// Handle background sync for when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Refresh critical cached data when online
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      } catch (error) {
        console.log('Failed to refresh cached request:', request.url);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Check for app updates
async function checkForUpdates() {
  try {
    // Fetch a version endpoint or check build info
    const response = await fetch('/api/version?' + Date.now());
    if (response.ok) {
      const serverInfo = await response.json();
      
      // Compare with cached build info
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match('__build_info__');
      
      if (cachedResponse) {
        const cachedInfo = await cachedResponse.json();
        
        if (serverInfo.buildHash !== cachedInfo.buildHash) {
          console.log('New version detected, updating cache...');
          // Clear old caches and force update
          await clearAllCaches();
          return true; // Update available
        }
      }
    }
  } catch (error) {
    console.log('Error checking for updates:', error);
  }
  return false; // No update needed
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data && event.data.type === 'CHECK_UPDATES') {
    event.waitUntil(
      checkForUpdates().then(hasUpdate => {
        if (hasUpdate) {
          // Notify clients about update
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({ type: 'UPDATE_AVAILABLE' });
            });
          });
        }
      })
    );
  }
});