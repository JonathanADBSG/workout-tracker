// sw.js (Complete and Corrected)

importScripts('db.js');

// V4 - Incremented cache names to trigger a new install
const STATIC_CACHE_NAME = 'workout-tracker-static-v4';
const DYNAMIC_CACHE_NAME = 'workout-tracker-dynamic-v4';
const SCRIPT_URL_FOR_SW = "https://script.google.com/macros/s/AKfycbyEv3n2EdQ8AxmcdED-nK3PlPLAGe6ylMLukc7-plgUb_9lVyQoU_Ssz-GsUWXY2cqduA/exec";

// The full paths to the files that need to be cached
const urlsToCache = [
  '/workout-tracker/',
  '/workout-tracker/index.html',
  '/workout-tracker/dashboard.html',
  '/workout-tracker/script.js',
  '/workout-tracker/dashboard.js',
  '/workout-tracker/db.js',
  '/workout-tracker/style.css',
  '/workout-tracker/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  '/workout-tracker/images/banner 1min.png',
  '/workout-tracker/images/banner 2min.png',
  '/workout-tracker/icons/icon-192x192.png',
  '/workout-tracker/icons/icon-512x512.png'
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

  // Strategy for Google Apps Script API calls (Network-first, then cache)
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
  } 
  // Strategy for all other requests (Cache-first)
  else {
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
          // Add a check to ensure data is an array and not empty
          if (!Array.isArray(data) || data.length === 0) {
            console.log('[Service Worker] No data to sync.');
            return;
          }
          
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


