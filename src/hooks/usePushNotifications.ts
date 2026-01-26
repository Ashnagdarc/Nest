"use client";

import { useEffect, useCallback, useState } from 'react';

/**
 * Helper to convert VAPID string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isRegisteredOnServer, setIsRegisteredOnServer] = useState(false);

  // 1. Sync with server
  const syncSubscription = useCallback(async (sub: PushSubscription) => {
    try {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          client_info: { ua: navigator.userAgent, synced_at: new Date().toISOString() }
        }),
      });
      if (res.ok) setIsRegisteredOnServer(true);
    } catch (err) {
      console.error('[Push Hook] Sync error:', err);
    }
  }, []);

  // 2. Check local and server status
  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

    try {
      // First, find our specific push SW
      const registrations = await navigator.serviceWorker.getRegistrations();
      const pushReg = registrations.find(r => r.active?.scriptURL.includes('push-sw.js'));

      if (pushReg) {
        const sub = await pushReg.pushManager.getSubscription();
        if (sub) {
          setSubscription(sub);
          // Check if server actually has this token
          const checkRes = await fetch('/api/notifications/test-push', { method: 'POST' });
          const data = await checkRes.json();
          setIsRegisteredOnServer(data.success === true);

          if (!data.success) {
            // Browser has it, server doesn't. Sync now.
            await syncSubscription(sub);
          }
          return sub;
        }
      }
      setIsRegisteredOnServer(false);
      setSubscription(null);
      return null;
    } catch (err) {
      console.error('[Push Hook] Error checking subscription:', err);
      return null;
    }
  }, [syncSubscription]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      if ('Notification' in window) {
        setPermission(Notification.permission);
        if (Notification.permission === 'granted') {
          checkSubscription();
        }
      }
    }
  }, [checkSubscription]);

  const enable = useCallback(async () => {
    if (typeof window === 'undefined' || !isSupported) {
      return { success: false, error: 'Push not supported' };
    }

    try {
      // 1. Request permission
      const status = await Notification.requestPermission();
      setPermission(status);
      if (status !== 'granted') return { success: false, error: 'Permission denied' };

      // 2. Clear old service workers to avoid "ghosting"
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (!reg.active?.scriptURL.includes('push-sw.js')) {
          console.log('[Push Hook] Cleaning old service worker:', reg.active?.scriptURL);
          // await reg.unregister(); // Keep this optional for now
        }
      }

      // 3. Register our specific Push Service Worker
      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 4. Get VAPID Public Key
      const res = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('VAPID public key missing from server');

      // 5. Subscribe with proper Key format (Uint8Array)
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 6. Save to server
      await syncSubscription(newSub);

      setSubscription(newSub);
      return { success: true, subscription: newSub };
    } catch (err: any) {
      console.error('[Push Hook] Error enabling push:', err);
      return { success: false, error: err.message || String(err) };
    }
  }, [isSupported, syncSubscription]);

  return { enable, isSupported, permission, subscription, isRegisteredOnServer, checkSubscription };
}
