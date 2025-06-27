self.addEventListener("install", function(e) {
  console.log("Service Worker instalado");
});

self.addEventListener("fetch", function(e) {
  // Puedes interceptar solicitudes aquí si quieres
});
