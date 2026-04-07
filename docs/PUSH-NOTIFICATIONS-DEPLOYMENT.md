# Push Notifications - Deployment Guide

## Overview

Nest now includes full end-to-end push notifications for users and admins across all events:

- Gear requests (created, approved, rejected)
- Check-ins (approved, rejected)
- Maintenance alerts
- Announcements
- Profile updates

Push notifications work **alongside email and in-app notifications** with per-user, per-event preference control.

---

## Architecture

```
Event Triggered (Supabase Realtime)
    ↓
Trigger Route (/api/notifications/trigger)
    ├─ In-App: Creates record in `notifications` table
    ├─ Email: Sends via Resend API
    └─ Push: Sends via Firebase Cloud Messaging (FCM)
        └─ Server-side: firebase-admin SDK (service account)
        └─ Client-side: firebase/messaging SDK (browser token registration)
```

### Technology Stack

| Component           | Technology                               | Purpose                                           |
| ------------------- | ---------------------------------------- | ------------------------------------------------- |
| Server Sending      | firebase-admin SDK                       | Batch send notifications to stored tokens via FCM |
| Client Registration | firebase/messaging SDK                   | Register browser for push notifications           |
| Token Storage       | Supabase PostgreSQL                      | Store user FCM tokens in `user_push_tokens` table |
| Service Worker      | firebase-messaging-sw.js                 | Handle background push notifications              |
| Preference Control  | Supabase `notification_preferences` JSON | Per-user, per-event channel selection             |

---

## Pre-Deployment Checklist

### ✅ Code (Already Implemented)

- [x] `src/hooks/usePushNotifications.ts` — Client token registration
- [x] `src/app/api/notifications/register-push/route.ts` — Server token upsert endpoint
- [x] `src/lib/firebaseAdmin.ts` — Firebase Admin SDK initialization
- [x] `public/firebase-messaging-sw.js` — Background notification handler
- [x] `src/app/api/notifications/trigger/route.ts` — Multi-channel sender (prefers firebase-admin)
- [x] Database migration — `user_push_tokens` table with RLS policies
- [x] All RLS policies enforced

### ✅ Environment Variables

Ensure **all** Firebase environment variables are set in your platform (Vercel, Netlify, etc.):

```bash
# Firebase Web SDK config (public keys)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# FCM VAPID Key (for push subscriptions)
NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY

# Firebase Service Account (BASE64 ENCODED for security)
FIREBASE_SERVICE_ACCOUNT_BASE64

# Legacy FCM fallback (optional, but recommended)
FCM_SERVER_KEY
```

### Database

Verify the `user_push_tokens` table exists and RLS policies are active:

```sql
SELECT * FROM information_schema.tables WHERE table_name = 'user_push_tokens';
SELECT * FROM pg_policies WHERE tablename = 'user_push_tokens';
```

Expected result: Table exists with 2 RLS policies:

1. `push_tokens_user_policy` — Users manage their own tokens
2. `push_tokens_admin_policy` — Admins can view all tokens

---

## Deployment Steps

### 1. Set Environment Variables

In your deployment platform (Vercel, Netlify, AWS, etc.):

```bash
# Get from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=<from-firebase-console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<bucket>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<measurement-id>
NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY=<vapid-key>

# Service account setup:
# 1. Download service account JSON from Firebase Console
#    (Project Settings → Service Accounts → Generate New Private Key)
# 2. Base64 encode it:
#    cat service-account.json | base64
# 3. Set as environment variable:
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-encoded-json>
```

### 2. Apply Database Migrations

If not already applied:

```bash
npm run supabase:migrate
# or via Supabase CLI:
npx supabase db push
```

This creates the `user_push_tokens` table with proper RLS.

### 3. Deploy

```bash
git add .
git commit -m "chore: cleanup push notification dev components"
git push origin main
# Let CI/CD handle deployment, or manually deploy via your platform
```

### 4. Verify in Production

1. **Navigate to your app** and log in
2. **Browser will prompt** for push notification permission (first time only)
3. **Accept the permission**
4. **Check database:**
   ```sql
   SELECT user_id, token, client_info, created_at
   FROM user_push_tokens
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   Should show your token registered
5. **Trigger a test event** (e.g., create a gear request as a user)
6. **Verify notification delivery:**
   - Check in-app notification list
   - Check email inbox
   - Browser should show push notification (if tab not focused)

---

## User Preferences

Each user controls which notification channels to receive per event type:

```typescript
notification_preferences: {
  email: {
    gear_requests: true,
    gear_checkins: true,
    maintenance_alerts: true,
    announcements: true,
    profile_updates: true
  },
  in_app: {
    gear_requests: true,
    gear_checkins: true,
    maintenance_alerts: true,
    announcements: true,
    profile_updates: true
  },
  push: {
    gear_requests: true,
    gear_checkins: true,
    maintenance_alerts: true,
    announcements: true,
    profile_updates: true
  }
}
```

Users can modify these in their settings page (`/user/settings`).

---

## Troubleshooting

### Push Notifications Not Appearing

**Check 1: Service Worker Registered**

```bash
# In browser DevTools → Application → Service Workers
# Should show: /firebase-messaging-sw.js (Active and running)
```

**Check 2: Browser Permission Granted**

```bash
# In browser DevTools → Console
navigator.permissions.query({name: 'notifications'})
  .then(result => console.log(result.state))
# Should output: "granted"
```

**Check 3: Token Stored in Database**

```sql
SELECT COUNT(*) FROM user_push_tokens WHERE user_id = '<user-id>';
# Should return >= 1
```

**Check 4: Firebase Admin SDK Initialized**

```bash
# In server logs (/api/notifications/trigger)
# Should NOT show: "firebase-admin error"
# Should show successful sendMulticast responses
```

**Check 5: User Preferences**

```sql
SELECT notification_preferences
FROM profiles
WHERE id = '<user-id>';
# Ensure: push.gear_requests = true (or relevant event type)
```

### Invalid Tokens Detected

The system automatically cleans up invalid tokens:

1. When `sendMulticast()` reports token errors
2. Tokens marked as `messaging/invalid-registration-token` or similar
3. Invalid tokens are deleted from `user_push_tokens` table
4. User will be re-prompted to register on next page load

---

## Performance Notes

- **Token Registration**: Non-blocking, happens on app load (with user permission)
- **Push Sending**: Batched via `sendMulticast()` (up to 500 tokens per request)
- **Database**: Indexed on `user_id` for fast lookups
- **Fallback**: If firebase-admin unavailable, falls back to legacy FCM HTTP API

---

## Security

- ✅ **RLS-Enforced**: Users can only read/modify their own tokens
- ✅ **Service Account**: Used server-side only, never exposed to client
- ✅ **VAPID Key**: Public key only exposed to client (safe)
- ✅ **Tokens**: Encrypted at rest by Supabase, marked with expiration
- ✅ **User Control**: Users must grant browser permission + can disable in settings

---

## Rollback

If issues occur in production:

1. **Disable Push via Preferences** (Quick)
   - All users will default to not receiving push notifications
   - Email and in-app notifications continue

2. **Disable via Feature Flag** (Code Change)
   - Set `sendPush = false` in trigger route temporarily
   - Rebuild and redeploy

3. **Revert Deployment** (Nuclear)
   - Revert to previous commit: `git revert <commit-hash>`
   - Database migrations are persistent (no rollback needed)

---

## Monitoring

Add these queries to your monitoring dashboard:

```sql
-- Token registration rate (last 24h)
SELECT DATE(created_at), COUNT(*)
FROM user_push_tokens
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- Stale tokens (not used in 30 days)
SELECT COUNT(*)
FROM user_push_tokens
WHERE updated_at < NOW() - INTERVAL '30 days';

-- Users with push enabled
SELECT COUNT(DISTINCT user_id)
FROM user_push_tokens
WHERE expires_at IS NULL OR expires_at > NOW();
```

---

## Support

For issues or questions:

1. Check logs in `/src/app/api/notifications/trigger/route.ts` (verbose logging)
2. Verify Firebase project has Messaging enabled
3. Ensure service account has correct permissions
4. Review browser console for `usePushNotifications` errors
5. Check Supabase RLS logs for policy violations
