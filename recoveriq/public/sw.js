// RecoverIQ service worker — conservative offline support for field agents.
// Strategy: NETWORK-FIRST for everything, so online users always get live
// data (the app is force-dynamic by design). Successful GET navigations are
// cached only as a fallback; when the network is unavailable, the last-seen
// page (or a minimal offline notice) is served.

const CACHE = 'recoveriq-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Only handle same-origin navigations / documents for offline fallback.
  const isNavigation = request.mode === 'navigate'

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isNavigation && response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (isNavigation) {
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      })
  )
})
