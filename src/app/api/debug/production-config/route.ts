import { NextResponse } from 'next/server';

export async function GET() {
    const envReport = {
        runtime: 'edge', // Will be 'edge' on Vercel
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
        vapidKeyPresent: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        vapidKeyLength: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.length,
        privateKeyPresent: !!process.env.VAPID_PRIVATE_KEY,
        privateKeyLength: process.env.VAPID_PRIVATE_KEY?.length,
        fcmKeyPresent: !!process.env.FCM_SERVER_KEY,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server-side',
        timestamp: new Date().toISOString()
    };

    // Test VAPID key format
    let vapidKeyValid = false;
    try {
        if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            const urlBase64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString();
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };
            
            const keyArray = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
            vapidKeyValid = keyArray.length === 65; // VAPID keys should be 65 bytes
        }
    } catch (error) {
        console.error('[Debug] VAPID key validation failed:', error);
    }

    const envReportWithValidation = {
        ...envReport,
        vapidKeyValid
    };

    return NextResponse.json({
        status: 'Production Debug Info',
        environment: envReportWithValidation,
        checklist: {
            vapidConfigured: envReport.vapidKeyPresent && envReport.privateKeyPresent,
            vapidKeyValid: vapidKeyValid,
            httpsEnabled: process.env.NEXT_PUBLIC_BASE_URL?.startsWith('https://'),
            productionReady: envReport.nodeEnv === 'production' && vapidKeyValid
        }
    });
}