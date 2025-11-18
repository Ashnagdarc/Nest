import admin from 'firebase-admin';

let initialized = false;

export function initFirebaseAdmin(): boolean {
  if (initialized) return true;
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) return false;

  try {
    const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(json),
    });
    initialized = true;
    console.log('[firebaseAdmin] initialized');
    return true;
  } catch (err) {
    console.error('[firebaseAdmin] failed to initialize:', err);
    return false;
  }
}

export async function sendMulticast(tokens: string[], payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) {
  if (!initFirebaseAdmin()) throw new Error('Firebase Admin not initialized');
  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: payload.notification,
      data: payload.data,
    };
    const resp = await admin.messaging().sendMulticast(message);
    return resp;
  } catch (err) {
    console.error('[firebaseAdmin] sendMulticast error', err);
    throw err;
  }
}
