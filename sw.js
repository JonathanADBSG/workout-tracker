// sw.js (Corrected)

importScripts('db.js');

// V2 - Incremented cache names to trigger a new install
const STATIC_CACHE_NAME = 'workout-tracker-static-v2';
const DYNAMIC_CACHE_NAME = 'workout-tracker-dynamic-v2';
const SCRIPT_URL_FOR_SW = "https://script.google.com/macros/s/AKfycbzOPc17fj5Xl0LY-rgKNW3n7fQWjVOjh7MHNHQiFtFg_y3NitamfkVb9nbUe-yr863NgQ/exec";

const urlsToCache = [
  '/',
  'index.html',
  'dashboard.html',
  'script.js',
  'dashboard.js',
  'db.js', // Added db.js to the cache list
  'style.css',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'images/banner 1min.png',
  'images/banner 2min.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      })
  );
});

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

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === 'https://script.google.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request.url, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

// Corrected Background Sync Logic
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background syncing', event);
  if (event.tag === 'sync-new-data') {
    console.log('[Service Worker] Syncing new data');
    event.waitUntil(
      readAllData('sync-posts')
        .then(data => {
          const promises = data.map(item => {
            return fetch(SCRIPT_URL_FOR_SW, {
              method: 'POST',
              body: JSON.stringify(item)
            });
          });
          // Wait for all promises to resolve
          return Promise.all(promises);
        })
        .then(() => {
          // If all fetches were successful, clear the database
          console.log('All data synced successfully. Clearing sync store.');
          return clearAllData('sync-posts');
        })
        .catch(err => {
          console.error('Error during background sync: ', err);
        })
    );
  }
});
