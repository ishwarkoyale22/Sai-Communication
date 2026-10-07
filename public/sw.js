// Sai Communication — service worker
// Goal: make the site installable and give it basic offline resilience,
// without ever serving stale product/order data. Strategy:
//  - Static, same-origin assets (JS/CSS/images/fonts) -> cache-first (they're
//    content-hashed by the build, so a stale cache entry is never wrong).
//  - Navigations (HTML pages) -> network-first, falling back to a cached
//    copy (or the cached homepage) only when fully offline.
//  - Everything else (Supabase API calls, cross-origin, non-GET, /admin) ->
//    left completely alone, straight to the network. This is a storefront
//    with live stock/orders; caching that data would show wrong information.
const CACHE_VERSION = "sai-comm-v1";
const OFFLINE_URL = "/";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|gif|ico)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts CDN, etc. — never touch
  if (url.pathname.startsWith("/admin")) return; // admin panel always fresh

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          }),
      ),
    );
  }
});
