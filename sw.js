/**
 * SMZ Coaches V2 — Service Worker
 *
 * Cache strategy:
 * - App shell (HTML, CSS, JS) → Cache First
 * - Game data (JSON) → Network First with cache fallback
 * - Diagrams (PNG) → Cache First (images rarely change)
 * - Navigation → serve index.html from cache when offline
 *
 * Update strategy:
 * - Bump CACHE_VERSION to force all clients to update on next visit
 */

const CACHE_VERSION  = 'smz-v2-v1';
const DATA_CACHE     = 'smz-v2-data-v1';

// ── App shell — cached on install ─────────────────────────────────
const SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './css/reset.css',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/state.js',
  './js/router.js',
  './js/data.js',
  './js/app.js',
  './pages/home.js',
  './pages/library.js',
  './pages/detail.js',
  './pages/favorites.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  // Game data
  './data/index.json',
  './data/games/adventure-quest.json',
  './data/games/crystal-capture.json',
  './data/games/meteor-shower.json',
  './data/games/pirate-ship.json',
  './data/games/robo-shark.json',
  './data/games/royal-rescue.json',
  './data/games/sportnite.json',
  './data/games/super-seeker.json',
  './data/games/survivor.json',
  './data/games/troopers-vs-jedi.json',
  // Diagrams
  './diagrams/adventure-quest.png',
  './diagrams/crystal-capture.png',
  './diagrams/meteor-shower.png',
  './diagrams/pirate-ship.png',
  './diagrams/robo-shark.png',
  './diagrams/royal-rescue.png',
  './diagrams/sportnite.png',
  './diagrams/super-seeker.png',
  './diagrams/survivor.png',
  './diagrams/troopers-vs-jedi.png',
];

// ── Install: cache all shell assets ───────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== DATA_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: serve from cache with network fallback ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // JSON data files → Network First (keep data fresh)
  if (url.pathname.includes('/data/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else → Cache First (fast, works offline)
  event.respondWith(cacheFirst(request));
});

// ── Cache strategies ──────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If it's a navigation request, serve offline page
    if (request.mode === 'navigate') {
      return caches.match('./offline.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
