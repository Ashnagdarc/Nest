import webPush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:noreply@nestbyeden.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
        VAPID_MAILTO,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
} else {
    console.warn('[WebPush] VAPID keys are missing from environment variables.');
}

/**
 * Sends a push notification to a specialized PushSubscription object.
 * @param subscription The standard browser PushSubscription JSON
 * @param payload The notification content (title, body, data, etc.)
 */
export async function sendWebPush(
    subscription: PushSubscription,
    payload: { title: string; body: string; data?: any }
) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        throw new Error('VAPID keys not configured');
    }

    try {
        const response = await webPush.sendNotification(
            subscription as any,
            JSON.stringify(payload)
        );
        return response;
    } catch (error: any) {
        // If the subscription is no longer valid (e.g., 404 or 410 Gone), the caller should handle it.
        console.error('[WebPush] error sending notification:', error.statusCode, error.message);
        throw error;
    }
}

export { webPush };
