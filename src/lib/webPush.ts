import webPush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:noreply@nestbyeden.app';

// Enhanced VAPID configuration for Edge Runtime
let vapidConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    try {
        webPush.setVapidDetails(
            VAPID_MAILTO,
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
        );
        vapidConfigured = true;
        
        // Log configuration status
        console.log('[WebPush] VAPID configured successfully:', {
            environment: process.env.NODE_ENV,
            runtime: typeof window !== 'undefined' ? 'client' : 'server',
            publicKeyLength: VAPID_PUBLIC_KEY.length,
            privateKeyPresent: !!VAPID_PRIVATE_KEY
        });
    } catch (error) {
        console.error('[WebPush] VAPID configuration failed:', error);
        vapidConfigured = false;
    }
} else {
    console.error('[WebPush] VAPID keys are missing from environment variables:', {
        publicKeyPresent: !!VAPID_PUBLIC_KEY,
        privateKeyPresent: !!VAPID_PRIVATE_KEY,
        env: process.env.NODE_ENV
    });
}

export { vapidConfigured };

/**
 * Sends a push notification to a specialized PushSubscription object.
 * Enhanced version for Edge Runtime with better error handling and logging.
 * @param subscription The standard browser PushSubscription JSON
 * @param payload The notification content (title, body, data, etc.)
 */
export async function sendWebPush(
    subscription: PushSubscription,
    payload: { title: string; body: string; data?: any }
) {
    if (!vapidConfigured) {
        throw new Error('VAPID keys not configured');
    }

    try {
        const response = await webPush.sendNotification(
            subscription as any,
            JSON.stringify(payload)
        );
        
        console.log('[WebPush] Notification sent successfully:', {
            endpoint: subscription.endpoint?.split('/').pop(),
            payloadLength: JSON.stringify(payload).length,
            status: response?.statusCode || 201
        });
        
        return response;
    } catch (error: any) {
        console.error('[WebPush] error sending notification:', {
            statusCode: error.statusCode,
            message: error.message,
            endpoint: subscription.endpoint?.split('/').pop(),
            environment: process.env.NODE_ENV
        });
        
        // If the subscription is no longer valid (e.g., 404 or 410 Gone), the caller should handle it.
        throw error;
    }
}