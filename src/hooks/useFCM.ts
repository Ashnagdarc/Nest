import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/lib/soundUtils';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDscTln-U_NG5hR0iC1Y0dok_WNTYOZ60E",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eden-app-notifications.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eden-app-notifications",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eden-app-notifications.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "456240180306",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:456240180306:web:f3b09f540246c622e316db",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1XDSRDW6BM"
};

export function useFCM(userId: string) {
    useEffect(() => {
        if (!userId) return;

        // Validate Firebase config
        if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
            console.warn('Firebase configuration incomplete - push notifications disabled');
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const messaging = getMessaging(app);

            // Request permission and get token
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BOFtGHupWKWiCic27nQvQIL_JYKLS2GYCRuem5UA1O-ZltB0Nlgnoq0M8kegsFo-1cPZhrfZUvqE9RIktIRtPbE';

                    getToken(messaging, { vapidKey })
                        .then((currentToken) => {
                            if (currentToken) {
                                console.log('Firebase token obtained successfully');
                                // Send token to your backend
                                fetch('/api/notifications/register-push', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId, token: currentToken }),
                                }).catch(error => {
                                    console.error('Failed to register push token:', error);
                                });
                            } else {
                                console.warn('No registration token available');
                            }
                        })
                        .catch((err) => {
                            console.error('Failed to get Firebase token:', err);
                        });
                } else {
                    console.warn('Notification permission denied');
                }
            });

            // Handle foreground messages
            onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);
                if (payload.notification) {
                    toast({
                        title: payload.notification.title,
                        description: payload.notification.body,
                    });
                    playNotificationSound('bell');
                }
            });
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }, [userId]);
} 