const CACHE = "atlas-shell-v4";
const SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];
self.addEventListener("install", (event) => event.waitUntil(
  caches.open(CACHE).then(async (cache) => {
    for (const url of SHELL) {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok && response.type === "basic") await cache.put(url, response);
      } catch { /* Offline installation can complete without poisoning cache. */ }
    }
  }).then(() => self.skipWaiting()),
));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
])));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => {
    // Never persist Cloudflare error pages, redirects or partial responses.
    if (response.ok && response.type === "basic" && response.status === 200) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/") : undefined))));
});
