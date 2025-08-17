// Build hash will be injected during build process
const BUILD_HASH = self.BUILD_HASH || Date.now().toString();
const API_CACHE_NAME = `ma-france-api-${BUILD_HASH}`;

// API routes that should be cached
const API_ROUTES = [
  '/api/country/details',
  '/api/country/names',
  '/api/country/crime',
  '/api/departements',
  '/api/communes'
];

// Install event - no static asset caching
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with build hash:', BUILD_HASH);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with build hash:', BUILD_HASH);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions - keep only current build hash API cache
          if (cacheName !== API_CACHE_NAME &&
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

// Fetch event - only handle API requests, let everything else go to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Only handle API requests - everything else goes directly to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Let all other requests (HTML, CSS, JS, images) go directly to network
});

// Handle API requests - network first with cache for performance
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
    // If no cache available, let the network error propagate
    throw error;
  }
}

// Handle background sync for when connectivity is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Refresh cached API data when online
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
      console.log('Server version checked:', serverInfo);
      return true; // Always return true to indicate check completed
    }
  } catch (error) {
    console.log('Error checking for updates:', error);
  }
  return false;
}

async function clearApiCache() {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
  console.log('API cache cleared');
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearApiCache());
  } else if (event.data && event.data.type === 'CHECK_UPDATES') {
    event.waitUntil(
      checkForUpdates().then(hasUpdate => {
        console.log('Update check completed');
      })
    );
  }
});