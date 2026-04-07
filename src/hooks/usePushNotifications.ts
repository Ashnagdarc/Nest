"use client";

import { useEffect, useCallback, useState } from 'react';

/**
 * Helper to convert VAPID string to Uint8Array - works in all browsers
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
    const [productionErrors, setProductionErrors] = useState<string[]>([]);

    // Enhanced debugging for production
    const logProductionError = useCallback((error: string, context?: string) => {
        console.error(`[Push Hook] ${context || 'Production Error'}:`, error);
        setProductionErrors(prev => [...prev, `${context}: ${error}`]);
        
        // In production, also try to notify user
        if (process.env.NODE_ENV === 'production') {
            // You could show a toast notification here
            console.warn('[Push Hook] Production push error - user may need to re-enable notifications');
        }
    }, []);

    // 1. Enhanced sync with server - handles Edge Functions
    const syncSubscription = useCallback(async (sub: PushSubscription) => {
        try {
            console.log('[Push Hook] Syncing subscription to server...');
            const res = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription: sub,
                    client_info: { 
                        ua: navigator.userAgent, 
                        synced_at: new Date().toISOString(),
                        is_production: process.env.NODE_ENV === 'production',
                        origin: window.location.origin
                    }
                }),
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server returned ${res.status}: ${errorText}`);
            }
            
            setIsRegisteredOnServer(true);
            console.log('[Push Hook] Subscription synced successfully');
        } catch (err: any) {
            logProductionError(err.message, 'Server Sync Failed');
        }
    }, [logProductionError]);

    // 2. Enhanced check subscription
    const checkSubscription = useCallback(async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            logProductionError('Push notifications not supported in this browser', 'Browser Support');
            return null;
        }

        try {
            console.log('[Push Hook] Checking for existing subscription...');
            
            // Find our specific push SW
            const registrations = await navigator.serviceWorker.getRegistrations();
            const pushReg = registrations.find(r => r.active?.scriptURL.includes('push-sw.js'));

            if (!pushReg) {
                console.log('[Push Hook] No service worker registration found');
                setIsRegisteredOnServer(false);
                setSubscription(null);
                return null;
            }

            const sub = await pushReg.pushManager.getSubscription();
            if (sub) {
                setSubscription(sub);
                console.log('[Push Hook] Found existing subscription:', sub.endpoint?.split('/').pop());

                // Verify with server
                try {
                    const res = await fetch('/api/notifications/check-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscription: sub })
                    });
                    const data = await res.json();
                    if (res.ok && data.exists) {
                        setIsRegisteredOnServer(true);
                        console.log('[Push Hook] Subscription verified on server');
                    } else {
                        console.warn('[Push Hook] Subscription exists locally but not on server - needs re-sync');
                        setIsRegisteredOnServer(false);
                        // Auto-heal in production
                        if (process.env.NODE_ENV === 'production') {
                            await syncSubscription(sub);
                        }
                    }
                } catch (e) {
                    logProductionError('Server verification failed', 'Subscription Check');
                    setIsRegisteredOnServer(false);
                }

                return sub;
            } else {
                setIsRegisteredOnServer(false);
                setSubscription(null);
                return null;
            }
        } catch (err: any) {
            logProductionError(err.message, 'Subscription Check Error');
            return null;
        }
    }, [logProductionError, syncSubscription]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
            setIsSupported(supported);
            
            if (!supported) {
                logProductionError('Push notifications not supported', 'Browser Compatibility');
                return;
            }

            if ('Notification' in window) {
                setPermission(Notification.permission);
                if (Notification.permission === 'granted') {
                    checkSubscription();
                }
            }

            // Add production-specific debugging
            if (process.env.NODE_ENV === 'production') {
                console.log('[Push Hook] Production environment detected');
                console.log('[Push Hook] Origin:', window.location.origin);
                console.log('[Push Hook] HTTPS:', window.location.protocol === 'https:');
            }
        }
    }, [checkSubscription, logProductionError]);

    const enable = useCallback(async () => {
        if (typeof window === 'undefined' || !isSupported) {
            logProductionError('Push not supported', 'Enable Failed');
            return { success: false, error: 'Push not supported' };
        }

        try {
            console.log('[Push Hook] Enabling push notifications...');

            // 1. Request permission with better error handling
            const status = await Notification.requestPermission();
            setPermission(status);
            
            if (status !== 'granted') {
                logProductionError(`Permission denied: ${status}`, 'Permission Error');
                return { success: false, error: `Permission denied: ${status}` };
            }

            console.log('[Push Hook] Permission granted:', status);

            // 2. Register service worker with production debugging
            console.log('[Push Hook] Registering service worker...');
            const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            
            console.log('[Push Hook] Service worker registered:', registration.scope);

            // 3. Get VAPID Public Key with error handling
            console.log('[Push Hook] Fetching VAPID public key...');
            const res = await fetch('/api/notifications/vapid-public-key');
            
            if (!res.ok) {
                throw new Error(`Failed to fetch VAPID key: ${res.status}`);
            }
            
            const { publicKey } = await res.json();
            if (!publicKey) {
                throw new Error('VAPID public key missing from server');
            }

            console.log('[Push Hook] VAPID key received, length:', publicKey.length);

            // 4. Subscribe with proper error handling
            console.log('[Push Hook] Subscribing to push...');
            const applicationServerKey = urlBase64ToUint8Array(publicKey);
            const newSub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            console.log('[Push Hook] Push subscription created:', newSub.endpoint?.split('/').pop());

            // 5. Save to server
            await syncSubscription(newSub);

            setSubscription(newSub);
            
            console.log('[Push Hook] Push notifications enabled successfully!');
            return { success: true, subscription: newSub };
            
        } catch (err: any) {
            const errorMessage = err.message || String(err);
            logProductionError(errorMessage, 'Enable Failed');
            
            // Provide more helpful error messages for production
            let helpfulError = errorMessage;
            if (errorMessage.includes('Failed to register a ServiceWorker')) {
                helpfulError = 'Service worker registration failed - try clearing browser cache';
            } else if (errorMessage.includes('Permission denied')) {
                helpfulError = 'Notification permission denied - please allow notifications in your browser';
            } else if (errorMessage.includes('VAPID')) {
                helpfulError = 'Server configuration error - please contact support';
            }

            return { success: false, error: helpfulError };
        }
    }, [isSupported, syncSubscription, logProductionError]);

    // Test function for production debugging
    const testProductionPush = useCallback(async () => {
        if (process.env.NODE_ENV === 'production') {
            console.log('[Push Hook] Testing production push...');
            try {
                const res = await fetch('/api/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: 'current-user', // This would need to be replaced with actual user ID
                        title: 'Production Test Push 🧪',
                        body: 'If you see this, production push notifications work!',
                        data: { test: true, timestamp: Date.now() }
                    })
                });
                const result = await res.json();
                console.log('[Push Hook] Test result:', result);
                return result;
            } catch (error) {
                logProductionError('Production test failed', 'Test Push');
                return { success: false, error };
            }
        }
    }, [logProductionError]);

    return { 
        enable, 
        isSupported, 
        permission, 
        subscription, 
        isRegisteredOnServer, 
        checkSubscription,
        testProductionPush,
        productionErrors
    };
}