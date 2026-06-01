/*
  Legacy service worker cleanup shim.
  Keeps /sw.js available for clients that already registered it,
  then unregisters and clears caches so fresh deployments can load.
*/

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      await self.clients.claim();

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        client.postMessage({ type: 'LEGACY_SW_CLEANED' });
      }
    })(),
  );
});

self.addEventListener('fetch', () => {
  // No runtime caching. Allow network to handle requests directly.
});
