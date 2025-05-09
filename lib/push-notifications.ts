import webpush from 'web-push';

const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
    subject: process.env.VAPID_SUBJECT || 'mailto:your-email@example.com'
};

webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export async function sendPushNotification(subscription: PushSubscription, message: string) {
    try {
        await webpush.sendNotification(subscription, message);
    } catch (error) {
        console.error('Error sending push notification:', error);
        throw error;
    }
}

// Type for push subscription
export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
} 