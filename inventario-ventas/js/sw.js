console.log('Service Worker iniciado.');

const CACHE_NAME = 'test-pwa-cache-v1';
const urlsToCache = [
    '/', // La raíz servida
    'index.html',
    'style.css',
    'app.js',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Cache abierta. Cacheando recursos...');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('SW: Recursos cacheado.');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('SW: Fallo al cachear', error);
            })
    );
});

self.addEventListener('activate', (event) => {
    console.log('SW: Activado.');
    // Limpiar caches viejas si es necesario (similar a lo que teníamos antes)
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Eliminando cache vieja', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Tomar control inmediato
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Si el recurso está en caché, lo devuelve.
            // Si no, intenta obtenerlo de la red.
            return response || fetch(event.request);
        })
    );
});
