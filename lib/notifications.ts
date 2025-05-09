const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export async function registerNotifications() {
    try {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker not supported');
        }

        if (!('Notification' in window)) {
            throw new Error('Notifications not supported');
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Notification permission not granted');
        }

        const registration = await navigator.serviceWorker.register('/notification-sw.js');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // Send the subscription to your backend
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return subscription;
    } catch (error) {
        console.error('Error registering notifications:', error);
        throw error;
    }
}

// Convert VAPID key to the format push subscription needs
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function unregisterNotifications() {
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                // Notify backend about unsubscription
                await fetch('/api/notifications/unsubscribe', {
                    method: 'POST',
                    body: JSON.stringify(subscription),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
    } catch (error) {
        console.error('Error unregistering notifications:', error);
        throw error;
    }
} 