// Build hash will be injected during build process
const BUILD_HASH = self.BUILD_HASH || Date.now().toString();
const API_CACHE_NAME = `ma-france-api-${BUILD_HASH}`;
const IMAGE_CACHE_NAME = `ma-france-images-${BUILD_HASH}`;

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
          // Delete old cache versions - keep only current build hash caches
          if (cacheName !== API_CACHE_NAME && 
              cacheName !== IMAGE_CACHE_NAME &&
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

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle francocides images with caching
  else if (url.pathname.startsWith('/images/francocides/')) {
    event.respondWith(handleImageRequest(request));
  }
  // Let all other requests (HTML, CSS, JS) go directly to network
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

// Handle image requests - cache first with network fallback
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('Image request failed:', request.url);
    // Return a placeholder or let it fail gracefully
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
  try {
    // Clear current API cache
    const cache = await caches.open(API_CACHE_NAME);
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));

    // Also clear any old API caches that might still exist
    const allCaches = await caches.keys();
    const apiCaches = allCaches.filter(name => name.startsWith('ma-france-api-'));
    await Promise.all(apiCaches.map(name => caches.delete(name)));

    console.log('All API caches cleared');
  } catch (error) {
    console.error('Failed to clear API cache:', error);
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CHECK_UPDATES') {
    const hasUpdates = await checkForUpdates();
    event.ports[0]?.postMessage({ hasUpdates });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    await clearApiCache();
    // Also clear all caches to force complete refresh
    const allCacheNames = await caches.keys();
    await Promise.all(allCacheNames.map(name => caches.delete(name)));
    event.ports[0]?.postMessage({ cleared: true });
  }
});