// PokeSpinner service worker: offline play and faster repeat visits.
//
// - Game files (HTML/CSS/JS): network first, cached copy when offline, so
//   updates show up on the next online visit without bumping a version.
// - Sprites, item art and battle backdrops (GitHub raw): cache first. They are
//   fetched with CORS so the cache stores real (not opaque, quota-padded) responses.
// - PokéAPI data: stale-while-revalidate.
// - Fonts / icon font / libraries: stale-while-revalidate.
// Ads and Firebase traffic are never cached.

const VERSION = 'v2';
const SHELL = `ps-shell-${VERSION}`;
const ART = 'ps-art';
const API = 'ps-api';
const LIBS = 'ps-libs';
const ART_LIMIT = 2500;
const API_LIMIT = 1500;

const SHELL_FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/tailwind.css', 'css/game.css', 'css/features.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-32.png',
  'js/data-pokemon.js', 'js/data-campaign.js', 'js/state.js', 'js/profile.js', 'js/audio.js',
  'js/save.js', 'js/i18n.js', 'js/settings.js', 'js/ui.js', 'js/spinner.js', 'js/sprites.js',
  'js/learnsets.js', 'js/adventure.js', 'js/battle.js', 'js/progression.js', 'js/collection.js',
  'js/mart.js', 'js/extras.js', 'js/data-types.js', 'js/features.js', 'js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => Promise.all(SHELL_FILES.map(f => cache.add(new Request(f, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ps-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(request, { ignoreSearch: true })
      || (request.mode === 'navigate' ? await cache.match('index.html') : null);
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  let res;
  try { res = await fetch(request.url, { mode: 'cors', credentials: 'omit' }); }
  catch (e) { return fetch(request); }            // CORS refused: let the page load it normally
  if (res.ok) { cache.put(request.url, res.clone()); trim(cacheName, limit); }
  return res;
}

async function staleWhileRevalidate(event, cacheName, limit) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request).then(res => {
    if (res.ok || res.type === 'opaque') { cache.put(request, res.clone()); if (limit) trim(cacheName, limit); }
    return res;
  });
  if (hit) { event.waitUntil(refresh.catch(() => {})); return hit; }
  return refresh;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(cacheFirst(request, ART, ART_LIMIT));
  } else if (url.hostname === 'pokeapi.co') {
    event.respondWith(staleWhileRevalidate(event, API, API_LIMIT));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$|^cdnjs\.cloudflare\.com$/.test(url.hostname)
          || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    event.respondWith(staleWhileRevalidate(event, LIBS));
  }
  // Everything else (ads, Firebase APIs) goes straight to the network.
});
