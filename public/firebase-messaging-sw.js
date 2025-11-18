// Minimal Firebase Messaging service worker compatibility: generic push handler.
/*
 This file is intentionally small and only handles the incoming push event and notificationclick.
 It does not load the Firebase client SDK to avoid conflicts with Workbox. The server sends
 FCM payloads which the browser will dispatch as push events; this SW shows notifications.
*/

'use strict';

self.addEventListener('push', function(event) {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    try { payload = { title: 'Notification', body: event.data?.text() } } catch(e) { payload = { title: 'Notification' }; }
  }

  const title = (payload && (payload.notification?.title || payload.title)) || 'Nest Notification';
  const body = (payload && (payload.notification?.body || payload.body)) || '';
  const data = payload.data || payload || {};

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-128x128.png',
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ includeUncontrolled: true });
    if (allClients && allClients.length > 0) {
      const client = allClients[0];
      client.focus();
      client.navigate('/user/notifications');
      return;
    }
    await clients.openWindow('/user/notifications');
  })());
});
