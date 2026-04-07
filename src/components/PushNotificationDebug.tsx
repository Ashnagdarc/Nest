'use client';

import { useEffect, useState } from 'react';

export function PushNotificationDebug() {
  const [config, setConfig] = useState<Record<string, string | undefined> | null>(null);

  useEffect(() => {
    setConfig({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.slice(0, 20) + '...',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.slice(0, 20) + '...',
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY?.slice(0, 20) + '...',
    });
  }, []);

  if (!config) return null;

  const allPresent = Object.values(config).every(v => v && v !== 'undefined' && !v.endsWith('...undefined'));

  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded border border-slate-300 dark:border-slate-700 text-sm font-mono">
      <h3 className="font-bold mb-2">Firebase Config Status</h3>
      <div className="space-y-1">
        {Object.entries(config).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={value && !value.includes('undefined') ? 'text-green-600' : 'text-red-600'}>
              {value && !value.includes('undefined') ? '✓' : '✗'}
            </span>
            <span>{key}: {value || 'MISSING'}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700">
        <p className={allPresent ? 'text-green-600' : 'text-red-600'}>
          {allPresent ? '✓ All configs present' : '✗ Missing configs'}
        </p>
      </div>
    </div>
  );
}
