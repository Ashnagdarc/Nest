declare module 'web-push' {
    export interface PushSubscription {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    }

    export interface VapidKeys {
        publicKey: string;
        privateKey: string;
    }

    export function setVapidDetails(
        subject: string,
        publicKey: string,
        privateKey: string
    ): void;

    export function sendNotification(
        subscription: PushSubscription,
        payload: string | Buffer,
        options?: any
    ): Promise<any>;

    export function generateVAPIDKeys(): VapidKeys;

    const webPush: {
        setVapidDetails: typeof setVapidDetails;
        sendNotification: typeof sendNotification;
        generateVAPIDKeys: typeof generateVAPIDKeys;
    };

    export default webPush;
}
