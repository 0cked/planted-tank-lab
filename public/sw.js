/* eslint-env serviceworker */

const CACHE_VERSION = "v1";
const STATIC_CACHE_NAME = `ptl-static-${CACHE_VERSION}`;
const PAGE_CACHE_NAME = `ptl-pages-${CACHE_VERSION}`;
const API_CACHE_NAME = `ptl-api-${CACHE_VERSION}`;
const OFFLINE_FALLBACK_PATH = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_FALLBACK_PATH,
  "/favicon.ico",
  "/site.webmanifest",
  "/apple-touch-icon.png",
];

const STATIC_ASSET_PATTERN =
  /\.(?:js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|glb|gltf|bin|json)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(precacheStaticAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clearOutdatedCaches());
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isApiRequest(requestUrl)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isStaticAssetRequest(requestUrl)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAssetRequest(url) {
  if (url.pathname.startsWith("/_next/static/")) {
    return true;
  }

  if (url.pathname.startsWith("/_next/image")) {
    return true;
  }

  return STATIC_ASSET_PATTERN.test(url.pathname);
}

async function precacheStaticAssets() {
  const cache = await caches.open(STATIC_CACHE_NAME);

  await Promise.all(
    PRECACHE_URLS.map(async (resourcePath) => {
      try {
        await cache.add(resourcePath);
      } catch {
        // Skip failed precache resources.
      }
    }),
  );
}

async function clearOutdatedCaches() {
  const activeCaches = new Set([STATIC_CACHE_NAME, PAGE_CACHE_NAME, API_CACHE_NAME]);
  const cacheKeys = await caches.keys();

  await Promise.all(
    cacheKeys.map((cacheKey) => {
      if (activeCaches.has(cacheKey)) {
        return Promise.resolve(false);
      }

      return caches.delete(cacheKey);
    }),
  );
}

async function handleNavigationRequest(request) {
  const fallbackResponse = await caches.match(OFFLINE_FALLBACK_PATH);

  return networkFirst(request, {
    cacheName: PAGE_CACHE_NAME,
    fallbackResponse,
  });
}

async function handleApiRequest(request) {
  const response = await networkFirst(request, {
    cacheName: API_CACHE_NAME,
  });

  if (response) {
    return response;
  }

  return new Response(
    JSON.stringify({
      message: "Offline",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    await cacheResponse(cache, request, networkResponse);
    return networkResponse;
  } catch {
    return cachedResponse ?? Response.error();
  }
}

async function networkFirst(request, options) {
  const cache = await caches.open(options.cacheName);

  try {
    const networkResponse = await fetch(request);
    await cacheResponse(cache, request, networkResponse);
    return networkResponse;
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return options.fallbackResponse ?? null;
  }
}

async function cacheResponse(cache, request, response) {
  if (!response || (response.status !== 200 && response.type !== "opaque")) {
    return;
  }

  await cache.put(request, response.clone());
}
