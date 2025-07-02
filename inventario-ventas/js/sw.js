const CACHE_NAME = 'inventario-cache-v2'; // Versiona la cache para facilitar actualizaciones
// Lista de archivos que queremos cachear para el funcionamiento offline
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    // Puedes añadir más recursos estáticos aquí si los necesitas
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre la caché especificada
            .then((cache) => {
                console.log('Service Worker: Cache abierta. Cacheando recursos...');
                return cache.addAll(urlsToCache); // Añade todos los recursos listados a la caché
            })
            .then(() => {
                console.log('Service Worker: Todos los recursos cacheado.');
                return self.skipWaiting(); // Permite que el nuevo SW tome control inmediatamente
            })
            .catch((error) => {
                console.error('Service Worker: Fallo al cachear recursos', error);
            })
    );
});

// Evento 'fetch': Se dispara cada vez que la aplicación intenta obtener un recurso.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request) // Intenta primero obtener la respuesta de la caché
            .then((response) => {
                if (response) { // Si la respuesta está en la caché, la devolvemos.
                    return response;
                }
                // Si no está en caché, intentamos obtenerla de la red.
                const fetchRequest = event.request.clone(); // Clonamos la petición porque fetch consume la original
                return fetch(fetchRequest).then((response) => {
                    // Si la respuesta de la red es válida (código 200 y tipo básico), la cacheamos.
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response; // Si no es válida, devolvemos la respuesta original sin cachear.
                    }
                    const responseToCache = response.clone(); // Clonamos la respuesta para poder cachearla y devolverla
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache); // Cachea la respuesta para futuras peticiones
                        });
                    return response; // Devolvemos la respuesta original
                });
            })
            .catch((error) => {
                console.error('Service Worker: Error en fetch', error);
                // Aquí podrías devolver una página de "offline" personalizada si la petición falla completamente.
                return Promise.resolve(); // O simplemente no hacer nada si no hay fallback.
            })
    );
});

// Evento 'activate': Se dispara cuando el Service Worker se activa.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // Mantenemos solo la caché actual
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si el nombre de la caché no está en nuestra lista blanca, la eliminamos.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Eliminando cache vieja', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Cache actualizada y lista.');
            // clients.claim() permite que el nuevo Service Worker tome control inmediatamente.
            return self.clients.claim();
        })
    );
});