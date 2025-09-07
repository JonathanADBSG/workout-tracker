const CACHE_NAME = 'workout-tracker-v1';
// List of files to cache
const urlsToCache = [
  '/',
  'index.html',
  'dashboard.html',
  'script.js',
  'dashboard.js',
  'style.css',
  'manifest.json',
  'images/banner 1min.png',
  'images/banner 2min.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Install event: fires when the browser installs the service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: fires for every network request
self.addEventListener('fetch', event => {
  // We only want to cache GET requests for our app files, not API calls to Google
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return it
        if (response) {
          return response;
        }
        // Otherwise, fetch it from the network
        return fetch(event.request);
      })
  );
});