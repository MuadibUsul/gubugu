// 谷布谷 PWA Service Worker（手写，无构建依赖）。
// 缓存策略：静态资源与目录图 cache-first；导航 network-first + 离线兜底；/api/v1 GET 走 SWR。
// 改缓存逻辑时把版本号 +1，activate 会清掉旧缓存。
const VERSION = 'gbg-v2';
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline';
const PRECACHE = [
  OFFLINE_URL,
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
  '/vendor/opencv.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/catalog-assets/') ||
    url.pathname.startsWith('/vendor/')
  );
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：优先网络，断网回退到离线页。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || Response.error()),
      ),
    );
    return;
  }

  // 不可变静态资源 / 目录图：cache-first。
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) => cached || staleWhileRevalidate(request, RUNTIME_CACHE),
        ),
    );
    return;
  }

  // 优化后的图片与只读 API：stale-while-revalidate。
  if (
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/api/v1/')
  ) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
