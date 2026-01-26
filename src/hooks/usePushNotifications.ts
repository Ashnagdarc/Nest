"use client";

import { useEffect, useCallback, useState } from 'react';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const syncSubscription = useCallback(async (sub: PushSubscription) => {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          client_info: { ua: navigator.userAgent, synced_at: new Date().toISOString() }
        }),
      });
    } catch (err) {
      console.error('[Push Hook] Sync error:', err);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        // Proactively sync with server just in case DB was cleared
        await syncSubscription(sub);
      }
      return sub;
    }
    return null;
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
      if (status !== 'granted') {
        return { success: false, error: 'Permission denied' };
      }

      // 2. Register Service Worker
      // We use a dedicated push SW to avoid conflicts with Workbox/Firebase
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      await navigator.serviceWorker.ready;

      // 3. Get VAPID Public Key
      const res = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await res.json();
      if (!publicKey) throw new Error('VAPID public key missing');

      // 4. Subscribe
      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      // 5. Save to server
      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: newSub,
          client_info: { ua: navigator.userAgent }
        }),
      });

      if (!saveRes.ok) throw new Error('Failed to sync with server');

      setSubscription(newSub);
      return { success: true, subscription: newSub };
    } catch (err: any) {
      console.error('[Push Hook] Error enabling push:', err);
      return { success: false, error: err.message || String(err) };
    }
  }, [isSupported]);

  return { enable, isSupported, permission, subscription, checkSubscription };
}
