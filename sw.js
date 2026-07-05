// PaintPro Service Worker
// Strategy: network-first for the HTML (so updates show immediately when online),
// cache-first for all static assets (icons, manifest).
// Bump CACHE version only when the service worker logic itself changes — not for
// routine HTML edits (those are handled by network-first already).

const CACHE = 'paintpro-v8';

// Cache that briefly holds a file shared in from the Android share sheet,
// handed off to the app on the next page load. Kept separate so the app-shell
// cache version bumps don't wipe an in-flight shared file.
const SHARE_CACHE = 'paintpro-shared';

const APP_SHELL = [
  './PaintPro-ZFold.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  // HearSay shares this worker (its own worker was removed — it wiped this cache).
  // Cached so HearSay still works offline; kept last so a fetch miss here can't
  // block the core PaintPro shell from installing.
  './hearsay.html',
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
      Promise.all(keys.filter(k => k !== CACHE && k !== SHARE_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', evt => {
  const { request } = evt;
  const url = new URL(request.url);

  // Share Target — a file shared from the Android "Share" sheet POSTs here.
  // Stash it in a cache and redirect to the app, which picks it up on load.
  if (request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    evt.respondWith((async () => {
      try {
        const form = await request.formData();
        const file = form.get('shared_image');
        if (file && file.size) {
          const cache = await caches.open(SHARE_CACHE);
          await cache.put('shared-file', new Response(file, {
            headers: { 'content-type': file.type || 'image/jpeg' }
          }));
        }
      } catch (e) { /* fall through to redirect either way */ }
      // 303 forces the follow-up request to be a GET of the app itself
      return Response.redirect('./PaintPro-ZFold.html?shared=1', 303);
    })());
    return;
  }

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
