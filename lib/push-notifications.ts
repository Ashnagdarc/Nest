import webpush from 'web-push';

const vapidKeys = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT
};

// Initialize web-push only if all required keys are present
if (vapidKeys.publicKey && vapidKeys.privateKey && vapidKeys.subject) {
    webpush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey
    );
} else {
    console.warn('Push notifications are disabled: Missing VAPID keys');
}

export async function sendPushNotification(subscription: PushSubscription, message: string) {
    if (!vapidKeys.publicKey || !vapidKeys.privateKey || !vapidKeys.subject) {
        throw new Error('Push notifications are not configured: Missing VAPID keys');
    }

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