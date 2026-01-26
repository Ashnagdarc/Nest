/*
 * Custom Push Service Worker for Nest
 * Handles standard Web Push (VAPID) notifications.
 */

'use strict';

self.addEventListener('push', function (event) {
    let payload = {};

    try {
        payload = event.data ? event.data.json() : {};
    } catch (err) {
        // If not JSON, try text
        try {
            payload = { title: 'Notification', body: event.data?.text() };
        } catch (e) {
            payload = { title: 'Notification' };
        }
    }

    const title = payload.title || 'Nest Notification';
    const options = {
        body: payload.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-128x128.png',
        data: payload.data || payload,
        vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/user/notifications';

    event.waitUntil((async () => {
        const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });

        // If a window is already open, focus it
        if (allClients && allClients.length > 0) {
            const client = allClients[0];
            client.focus();
            if ('navigate' in client) {
                client.navigate(targetUrl);
            }
            return;
        }

        // Otherwise open a new window
        await clients.openWindow(targetUrl);
    })());
});
