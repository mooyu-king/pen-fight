const CACHE_NAME = "pen-fight-shell-v3-desktop-beta";
const CORE_ASSETS = ["/", "/manifest.webmanifest", "/pen-fight-logo.webp", "/pwa-icon-192.png", "/pwa-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('pen-fight-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 授权码、账号接口和游戏导航不缓存，也不以离线首页伪装成功。
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/game/desk-legends/') || ['code', 'authCallback', 'access_token', 'error'].some(key => url.searchParams.has(key))) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }).catch(async () => (await caches.match(request)) || caches.match("/")),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || /\.(?:png|webp|jpg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })),
    );
  }
});
