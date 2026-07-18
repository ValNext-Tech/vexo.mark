// Service Worker para habilitar criterios de instalación PWA

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // En este MVP dejamos que las peticiones vayan directo a la red (network-first).
  // Esto asegura compatibilidad completa con el tiempo real de Supabase y subida de archivos.
});
