// PaintPro Service Worker
// Strategy: network-first for the HTML (so updates show immediately when online),
// cache-first for all static assets (icons, manifest).
// Bump CACHE version only when the service worker logic itself changes — not for
// routine HTML edits (those are handled by network-first already).

const CACHE = 'paintpro-v6';

const APP_SHELL = [
  './PaintPro-ZFold.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

// Pre-cache the app shell on install so the app works offline immediately
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Remove old cache versions on activate
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', evt => {
  const { request } = evt;
  const url = new URL(request.url);

  // Let external API calls (Anthropic, ntfy, Firebase, etc.) go straight to the
  // browser's network stack — service worker interception breaks their CORS headers.
  if (url.origin !== self.location.origin) return;

  // Network-first for the main HTML file — ensures updates are picked up
  if (url.pathname.endsWith('PaintPro-ZFold.html') || url.pathname.endsWith('/')) {
    evt.respondWith(
      fetch(request)
        .then(res => {
          // Only cache good responses — a 404/500 page must never replace the
          // known-good copy of the app in the offline cache.
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./PaintPro-ZFold.html'))
    );
    return;
  }

  // Cache-first for everything else (icons, manifest, fonts)
  evt.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
