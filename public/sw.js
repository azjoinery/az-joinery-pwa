/**
 * AZ Joinery — Service Worker
 *
 * Makes the PWA work properly on iOS (and improves Android/desktop too):
 *   • Caches static assets so pages load instantly after first visit
 *   • Caches Next.js JS/CSS chunks (content-hashed, immutable)
 *   • Caches Google Fonts so they survive offline
 *   • Shows a branded offline page when the network is down
 *
 * Bump CACHE_VERSION after a deploy if you need a full cache clear.
 */

const CACHE_VERSION = 1;
const CACHE_NAME = "azj-v" + CACHE_VERSION;

/** Files to cache on first install — the bare minimum for an app shell. */
var PRECACHE = [
  "/manifest.json",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/brand/icon-192.png",
  "/brand/icon-512.png",
  "/brand/logo-mark.webp",
];

/* ── Inline offline page ─────────────────────────────────────────────
   Embedded here so we don't need a separate HTML file in /public.    */
var OFFLINE_PAGE = [
  "<!DOCTYPE html>",
  '<html lang="en-AU"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  "<title>Offline — AZ Joinery</title>",
  "<style>",
  "*{margin:0;padding:0;box-sizing:border-box}",
  "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
  "background:#1A1A18;color:#fff;display:flex;align-items:center;",
  "justify-content:center;min-height:100dvh;min-height:100vh;",
  "padding:24px;text-align:center}",
  ".w{max-width:300px}",
  ".icon{width:48px;height:48px;margin:0 auto 16px;opacity:.5}",
  "h1{font-size:18px;font-weight:600;margin-bottom:6px}",
  "p{font-size:14px;opacity:.65;line-height:1.5;margin-bottom:24px}",
  "button{background:#F97316;color:#fff;border:none;border-radius:10px;",
  "padding:12px 32px;font-size:14px;font-weight:600;cursor:pointer;",
  "-webkit-tap-highlight-color:transparent}",
  "button:active{opacity:.8}",
  "</style></head><body>",
  '<div class="w">',
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">',
  '<path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  "</svg>",
  "<h1>You're offline</h1>",
  "<p>Check your Wi-Fi or mobile data and try again.</p>",
  '<button onclick="location.reload()">Retry</button>',
  "</div></body></html>",
].join("");

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

// ── Activate — clean up old cache versions ───────────────────────────
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE_NAME;
          })
          .map(function (k) {
            return caches.delete(k);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────
self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);

  // ── Cross-origin: only cache Google Fonts ──────────────────────────
  if (url.origin !== self.location.origin) {
    if (
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com"
    ) {
      event.respondWith(cacheFirst(request));
    }
    // All other cross-origin (API calls, etc.) — let the browser handle.
    return;
  }

  // ── Next.js static chunks — immutable, cache-first ─────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── Brand assets & icons — rarely change, cache-first ──────────────
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ── HTML navigation — network-first with offline fallback ──────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return (
              cached ||
              new Response(OFFLINE_PAGE, {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              })
            );
          });
        })
    );
    return;
  }

  // ── Everything else — network-first, cache for next time ───────────
  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request);
      })
  );
});

// ── Helper: cache-first strategy ─────────────────────────────────────
function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    });
  });
}
