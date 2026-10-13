// Minimal service worker: just enough for "Add to Home Screen" installability.
// Intentionally does not cache anything -- this app is dynamic/API-driven and
// we don't want stale cached data between sessions.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // no-op: let every request go to the network as normal
});
