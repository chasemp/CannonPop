/**
 * Service Worker - CannonPop PWA
 * Based on PWA best practices
 */

// Inline logger for service worker (no ES6 modules support)
const isDev = () => {
  return self.location.hostname === 'localhost' || 
         self.location.hostname.includes('127.0.0.1') ||
         self.registration?.scope.includes('localhost');
};

const logger = {
  log: (...args) => { if (isDev()) console.log(...args); },
  warn: (...args) => { if (isDev()) console.warn(...args); },
  error: (...args) => { console.error(...args); }, // Always log errors
  info: (emoji, ...args) => { if (isDev()) console.log(emoji, ...args); }
};

const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `cannonpop-cache-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `cannonpop-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `cannonpop-dynamic-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/game.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/libs/phaser.min.js'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  logger.info('🔧', 'Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        logger.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        logger.log('✅ Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        logger.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  logger.info('🚀', 'Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('cannonpop-') && 
                !cacheName.includes(CACHE_VERSION)) {
              logger.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        logger.log('✅ Service Worker activated successfully');
        return self.clients.claim();
      })
      .catch(error => {
        logger.error('❌ Service Worker activation failed:', error);
      })
  );
});

// Fetch Event - Cache-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          logger.log('📦 Serving from cache:', request.url);
          return cachedResponse;
        }
        
        return fetch(request)
          .then(networkResponse => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          });
      })
      .catch(error => {
        logger.error('Failed to handle request:', request.url, error);
        return new Response('Offline content not available', { status: 503 });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  logger.info('🔄', 'Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

async function syncGameData() {
  try {
    logger.log('Syncing game data...');
    // Sync game scores, achievements, etc.
    logger.log('Game data synced successfully');
  } catch (error) {
    logger.error('Game data sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  logger.info('📱', 'Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New game update available!',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [100, 50, 100]
  };
  
  event.waitUntil(
    self.registration.showNotification('CannonPop', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  logger.info('🔔', 'Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

logger.info('🔧', 'Service Worker script loaded');
