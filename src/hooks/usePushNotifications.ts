"use client";
import { useEffect, useCallback, useMemo } from 'react';

type EnableOptions = { onMessage?: (payload: any) => void };

export function usePushNotifications() {
  // Check if push notifications are supported
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for required APIs
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    
    // Some browsers block notifications but still have the API
    const isNotificationBlocked = hasNotification && Notification.permission === 'denied';
    
    return hasServiceWorker && hasPushManager && hasNotification && !isNotificationBlocked;
  }, []);

  const enable = useCallback(async (opts: EnableOptions = {}) => {
    if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };
    if (Notification.permission === 'denied') return { success: false, error: 'Permission denied' };

    try {
      // Register a messaging-specific service worker first. Prefer `/firebase-messaging-sw.js`;
      // fall back to the app Workbox `/sw.js` if the dedicated file isn't available.
      let registered: ServiceWorkerRegistration | null = null;
      try {
        registered = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (e) {
        // If the dedicated messaging SW cannot be registered, try the Workbox SW.
        try {
          registered = await navigator.serviceWorker.register('/sw.js');
        } catch (err) {
          console.warn('[usePushNotifications] failed to register any service worker', err);
          throw err;
        }
      }

      // Wait until a service worker is active and controlling the page; this resolves
      // when the browser has an active registration (ensures PushManager.subscribe works).
      const reg = await navigator.serviceWorker.ready;

      // Lazy-load firebase messaging to avoid bundling on server
      const firebaseAppModule = await import('firebase/app');
      const firebaseMessagingModule = await import('firebase/messaging');

      const { initializeApp, getApps } = firebaseAppModule;
      const { getMessaging, getToken, onMessage } = firebaseMessagingModule;

      // Initialize firebase app if not already
      if (!getApps || !getApps().length) {
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        initializeApp(firebaseConfig);
      }

      const messaging = getMessaging();

      // Request permission if not yet granted
      if (Notification.permission !== 'granted') {
        const status = await Notification.requestPermission();
        if (status !== 'granted') return { success: false, error: 'Permission not granted' };
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY;
      const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
      if (!currentToken) return { success: false, error: 'No token returned' };

      // Send token to server
      await fetch('/api/notifications/register-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken, client_info: { ua: navigator.userAgent } })
      });

      // foreground messages
      if (opts.onMessage) {
        onMessage(messaging, opts.onMessage);
      }

      return { success: true, token: currentToken };
    } catch (err: any) {
      console.error('[usePushNotifications] error', err);
      return { success: false, error: err.message || String(err) };
    }
  }, []);

  // optional auto-enable on mount if flag set
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_PUSH === 'true') {
      enable().catch(() => {});
    }
  }, [enable]);

  return { enable, isSupported };
}
