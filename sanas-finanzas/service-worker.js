const CACHE_NAME = 'sanas-finanzas-cache-v1';
const urlsToCache = [
    '/sanas-finanzas/',
    '/sanas-finanzas/index.html',
    '/sanas-finanzas/login.html',
    '/sanas-finanzas/manifest.json',
    '/sanas-finanzas/favicon.ico',
    '/sanas-finanzas/icono192.png',
    '/sanas-finanzas/icono512.png',
    '/sanas-finanzas/assets/css/style.css',
    '/sanas-finanzas/assets/js/login.js',
    '/sanas-finanzas/assets/js/app.js',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://www.gstatic.com/firebasejs/8.6.8/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.6.8/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.6.8/firebase-firestore.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});