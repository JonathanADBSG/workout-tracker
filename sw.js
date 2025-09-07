// sw.js (Updated)

const STATIC_CACHE_NAME = 'workout-tracker-static-v1';
const DYNAMIC_CACHE_NAME = 'workout-tracker-dynamic-v1';

// List of files for the "app shell" to be cached immediately
const urlsToCache = [
  '/',
  'index.html',
  'dashboard.html',
  'script.js',
  'dashboard.js',
  'style.css',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js', // Cache the Chart.js library
  'images/banner 1min.png',
  'images/banner 2min.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Install event: caches the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event: cleans up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('workout-tracker-') &&
                 cacheName !== STATIC_CACHE_NAME &&
                 cacheName !== DYNAMIC_CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event: serves responses from cache or network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Strategy for Google Apps Script API calls (Network-first)
  if (requestUrl.origin === 'https://script.google.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the network request is successful, cache it
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request.url, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // If the network request fails (offline), serve from cache
          return caches.match(event.request);
        })
    );
  } 
  // Strategy for all other requests (Cache-first)
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return from cache or fetch from network
          return response || fetch(event.request);
        })
    );
  }
});
