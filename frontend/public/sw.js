// CarePath service worker.
//
// Minimum-viable PWA: enables install prompt + basic navigation
// caching so the shell loads instantly on subsequent visits. We
// deliberately do NOT cache /api/* responses — staleness on a
// senior-care marketplace is worse than slow.
//
// Push-notification handling is added in Batch 4 alongside the
// push_device_tokens table.

const CACHE_NAME = "carepath-shell-v1"
const SHELL_ASSETS = ["/", "/favicon.svg", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  // Never cache API requests — facility data, search, billing all
  // need to be fresh.
  if (url.pathname.startsWith("/api/")) return
  // Only cache GET navigations and static assets.
  if (event.request.method !== "GET") return

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            // Only cache successful, same-origin, basic responses
            // (skip opaque CDN responses to keep the cache lean).
            if (res.ok && res.type === "basic") {
              const copy = res.clone()
              caches.open(CACHE_NAME).then((c) => c.put(event.request, copy))
            }
            return res
          })
          .catch(() => caches.match("/") || new Response("Offline", { status: 503 })),
    ),
  )
})
