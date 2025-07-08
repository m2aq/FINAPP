self.addEventListener('install', function(e) {
  e.waitUntil(caches.open('finanzas').then(cache => {
    return cache.addAll([
      './',
      './index.html',
      './estilos.css',
      './script.js',
      './manifest.json',
      './icono192.png',
      './icono512.png'
    ]);
  }));
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
