const CACHE_NAME = 'inventario-cache-v2'; // Versiona la cache para facilitar actualizaciones. Cambia el número si modificas el SW o recursos clave.
// Lista de archivos que queremos cachear para el funcionamiento offline y carga rápida.
const urlsToCache = [
    '/', // La raíz de la aplicación
    'index.html', // El archivo principal HTML
    'css/style.css', // La hoja de estilos
    'js/app.js', // El script principal de la aplicación
    'icons/icon-192x192.png'
    'icons/icon-512x512.png'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME) // Abre la caché especificada (o la crea si no existe)
            .then((cache) => {
                console.log('Service Worker: Cache abierta. Cacheando recursos...');
                return cache.addAll(urlsToCache); // Añade todos los recursos listados a la caché
            })
            .then(() => {
                console.log('Service Worker: Todos los recursos cacheado.');
                // skipWaiting() permite que el nuevo SW tome control inmediatamente, sin esperar a que se cierren las pestañas existentes.
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Fallo al cachear recursos', error);
            })
    );
});

// Evento 'fetch': Se dispara cada vez que la aplicación intenta obtener un recurso (una petición HTTP).
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request) // Intenta primero obtener la respuesta de la caché
            .then((response) => {
                // Si la respuesta está en la caché, la devolvemos. Esto es lo que permite el funcionamiento offline.
                if (response) {
                    return response;
                }
                // Si no está en caché, intentamos obtenerla de la red.
                const fetchRequest = event.request.clone(); // Clonamos la petición porque fetch consume la original
                return fetch(fetchRequest).then((response) => {
                    // Si la respuesta de la red es válida (código 200 y es una respuesta básica), la cacheamos.
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response; // Si no es válida, devolvemos la respuesta original sin cachear.
                    }
                    // Clonamos la respuesta para poder cachearla y al mismo tiempo devolverla a la página.
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache); // Cachea la respuesta para futuras peticiones
                        });
                    return response; // Devolvemos la respuesta original a la página.
                });
            })
            .catch((error) => {
                console.error('Service Worker: Error en fetch', error);
                // Aquí podrías devolver una página de "offline" personalizada si la petición falla completamente.
                // Ejemplo: return new Response('Estamos sin conexión.', { status: 503, statusText: 'Service Unavailable' });
                return Promise.resolve(); // O simplemente no hacer nada si no hay fallback.
            })
    );
});

// Evento 'activate': Se dispara cuando el Service Worker se activa y está listo para tomar el control.
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME]; // Mantenemos solo la caché actual.
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si el nombre de la caché no está en nuestra lista blanca (es decir, es una caché antigua), la eliminamos.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Eliminando cache vieja', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Cache actualizada y lista.');
            // clients.claim() permite que el nuevo Service Worker tome control inmediatamente sobre las páginas controladas.
            return self.clients.claim();
        })
    );
});
