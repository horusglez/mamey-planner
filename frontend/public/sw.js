// Minimal service worker: just enough for "Add to Home Screen" installability.
// Intentionally does not cache anything -- this app is dynamic/API-driven and
// we don't want stale cached data between sessions.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // no-op: let every request go to the network as normal
});

self.addEventListener('push', (event) => {
  let data = { title: '🥭 Mamey Planner', body: 'Tienes una notificación nueva.' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // non-JSON payload, keep the default
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
