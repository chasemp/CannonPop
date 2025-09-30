/**
 * BustAGroove PWA Service Worker
 * Implements offline-first caching strategy
 * Based on PWA lessons learned from MealPlanner
 */

const CACHE_NAME = 'bustagroove-v2025.09.26.2311';
const STATIC_CACHE_NAME = 'bustagroove-static-v1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/BustAGroove/',
  '/BustAGroove/index.html',
  '/BustAGroove/game.html',
  '/BustAGroove/manifest.json',
  '/BustAGroove/css/styles.css',
  '/BustAGroove/css/game.css',
  '/BustAGroove/js/game.js',
  '/BustAGroove/src/main.ts',
  // CDN resources
  'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js'
];

// Install event - precache essential files
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Precaching essential files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - implement cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('📦 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response for caching
            const responseToCache = response.clone();
            
            // Cache static assets
            if (isStaticAsset(request.url)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  console.log('💾 Caching new asset:', request.url);
                  cache.put(request, responseToCache);
                });
            }
            
            return response;
          })
          .catch((error) => {
            console.error('🌐 Network fetch failed:', error);
            
            // Return offline fallback for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/BustAGroove/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Message event - handle commands from main app
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_BUST') {
    // Clear all caches and reload
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('🗑️ All caches cleared for cache bust');
      self.registration.update();
    });
  }
});

// Sync event - background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-score-sync') {
    event.waitUntil(syncOfflineScores());
  }
});

// Push event - for future push notification support
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New BustAGroove update available!',
    icon: '/BustAGroove/public/icons/icon-192x192.png',
    badge: '/BustAGroove/public/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Play Now',
        icon: '/BustAGroove/public/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/BustAGroove/public/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('BustAGroove', options)
  );
});

// Helper Functions

/**
 * Check if URL is a static asset that should be cached
 */
function isStaticAsset(url) {
  const staticExtensions = ['.html', '.css', '.js', '.ts', '.json', '.png', '.jpg', '.svg', '.ico'];
  return staticExtensions.some(ext => url.includes(ext)) || url.includes('cdn.jsdelivr.net');
}

/**
 * Sync offline scores (placeholder for future implementation)
 */
async function syncOfflineScores() {
  try {
    // Get offline scores from IndexedDB
    // Send to server when online
    console.log('🔄 Syncing offline scores...');
    
    // For now, just log - will implement when we have a backend
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Score sync failed:', error);
    throw error;
  }
}

console.log('🎮 BustAGroove Service Worker loaded');
