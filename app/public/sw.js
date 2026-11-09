// Permite abrir el Portal instalado aunque no haya señal: guarda la última versión de la página.
// Los datos de la base central no se guardan acá (siempre se piden en vivo).
const CACHE = 'portal-nacional-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './logo-portal-nacional.png', './icon-192.png', './icon-512.png', './favicon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Primero internet (para tener siempre la última versión); sin señal, la copia guardada.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then(hit => hit || caches.match('./index.html')))
  )
})
