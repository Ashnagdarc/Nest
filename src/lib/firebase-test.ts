/**
 * Firebase Connection Test Utility
 * Tests Firebase configuration and connection
 */

export function testFirebaseConnection() {
    console.log('🔥 Firebase Configuration Test');

    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDscTln-U_NG5hR0iC1Y0dok_WNTYOZ60E",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "eden-app-notifications.firebaseapp.com",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "eden-app-notifications",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "eden-app-notifications.firebasestorage.app",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "456240180306",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:456240180306:web:f3b09f540246c622e316db",
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-1XDSRDW6BM"
    };

    console.log('Project ID:', config.projectId);
    console.log('App ID:', config.appId);
    console.log('Storage Bucket:', config.storageBucket);

    // Validate required fields
    const required = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
    const isValid = required.every(key => config[key as keyof typeof config]);

    if (!isValid) {
        console.error('❌ Firebase configuration incomplete!');
        console.log('Missing fields:', required.filter(key => !config[key as keyof typeof config]));
        return false;
    }

    console.log('✅ Firebase configuration looks good!');
    return true;
}

export function logFirebaseError(error: any) {
    console.error('🚨 Firebase Error:', error);

    if (error.code === 'installations/request-failed') {
        console.log('💡 Solutions:');
        console.log('1. Check if Firebase Installations API is enabled');
        console.log('2. Verify API key has correct permissions');
        console.log('3. Ensure project configuration matches');
        console.log('4. Clear browser cache and service worker');
    }

    if (error.message?.includes('403')) {
        console.log('💡 Permission Error Solutions:');
        console.log('1. Enable Firebase Cloud Messaging API');
        console.log('2. Enable Firebase Installations API');
        console.log('3. Check API key restrictions');
    }
} 