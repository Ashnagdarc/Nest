/*
 * Custom Push Service Worker for Nest
 * Handles standard Web Push (VAPID) notifications.
 */

'use strict';

console.log('[Push SW] Active and listening for push events...');

self.addEventListener('push', function (event) {
    console.log('[Push SW] Push event received:', event);

    let payload = {};

    try {
        payload = event.data ? event.data.json() : {};
        console.log('[Push SW] Payload parsed as JSON:', payload);
    } catch (err) {
        try {
            const text = event.data?.text();
            payload = { title: 'Nest Notification', body: text };
            console.log('[Push SW] Payload fallback to text:', text);
        } catch (e) {
            payload = { title: 'Nest Notification', body: 'New notification available' };
            console.warn('[Push SW] No payload data found');
        }
    }

    const title = payload.title || 'Nest Notification';
    const options = {
        body: payload.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-128x128.png',
        data: payload.data || payload,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: 'nest-urgent',
        renotify: true,
        silent: false,
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(() => console.log('[Push SW] Notification shown successfully'))
            .catch((err) => {
                console.error('[Push SW] Failed to show notification:', err);
                return self.registration.showNotification(title, { body: options.body });
            })
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[Push SW] Notification clicked');
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/user/notifications';

    event.waitUntil((async () => {
        const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });

        if (allClients && allClients.length > 0) {
            console.log('[Push SW] Focusing existing window');
            const client = allClients[0];
            client.focus();
            if ('navigate' in client) {
                client.navigate(targetUrl);
            }
            return;
        }

        console.log('[Push SW] Opening new window at:', targetUrl);
        await clients.openWindow(targetUrl);
    })());
});
