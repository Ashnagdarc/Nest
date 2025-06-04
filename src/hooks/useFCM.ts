import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { toast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/lib/soundUtils';

const firebaseConfig = {
    apiKey: "AIzaSyDscTln-U_NG5hR0iC1Y0dok_WNTYOZ60E",
    authDomain: "eden-app-notifications.firebaseapp.com",
    projectId: "eden-app-notifications",
    storageBucket: "eden-app-notifications.appspot.com",
    messagingSenderId: "456240180306",
    appId: "1:456240180306:web:f3b09f540246c622e316db",
    measurementId: "G-1XDSRDW6BM"
};

export function useFCM(userId: string) {
    useEffect(() => {
        if (!userId) return;
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // Request permission and get token
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                getToken(messaging, { vapidKey: 'BOFtGHupWKWiCic27nQvQIL_JYKLS2GYCRuem5UA1O-ZltB0Nlgnoq0M8kegsFo-1cPZhrfZUvqE9RIktIRtPbE' })
                    .then((currentToken) => {
                        if (currentToken) {
                            // Send token to your backend
                            fetch('/api/notifications/register-push', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId, token: currentToken }),
                            });
                        }
                    });
            }
        });

        // Handle foreground messages
        onMessage(messaging, (payload) => {
            if (payload.notification) {
                toast({
                    title: payload.notification.title,
                    description: payload.notification.body,
                });
                playNotificationSound('bell');
            }
        });
    }, [userId]);
} 