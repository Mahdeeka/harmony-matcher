const CACHE_NAME = 'harmony-matcher-v1';
const STATIC_CACHE = 'harmony-static-v1';
const DYNAMIC_CACHE = 'harmony-dynamic-v1';

// In development (localhost), this service worker causes more harm than good (stale assets + broken HMR).
// Self-unregister and do not intercept requests.
const IS_LOCALHOST = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
if (IS_LOCALHOST) {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      (async () => {
        try {
          await self.registration.unregister();
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch (_) {}
      })()
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('fetch', () => {
    // no-op in dev
  });

  // stop here for localhost
}

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) return;
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (IS_LOCALHOST) return;
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  if (IS_LOCALHOST) return;
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET requests
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline fallback for pages
            if (request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');

  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');

  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: [
        {
          action: 'view',
          title: 'عرض'
        },
        {
          action: 'dismiss',
          title: 'تجاهل'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Sync messages function
async function syncMessages() {
  try {
    // Get stored offline messages from IndexedDB or similar
    // For now, this is a placeholder
    console.log('Service Worker: Syncing messages...');

    // In a real implementation, you would:
    // 1. Retrieve stored messages from IndexedDB
    // 2. Send them to the server
    // 3. Clear local storage on success

  } catch (error) {
    console.error('Service Worker: Message sync failed', error);
  }
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.registration.periodicSync.register('content-sync', {
    minInterval: 24 * 60 * 60 * 1000 // 24 hours
  });
}
