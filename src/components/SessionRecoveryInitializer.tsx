'use client';

import { useEffect } from 'react';
import { cleanCorruptedSupabaseSession } from '@/lib/supabase/storage-recovery';

/**
 * Session Recovery Initializer Component
 * 
 * Runs on app load to clean up any corrupted Supabase session data
 * before authentication is attempted. This prevents TypeErrors from
 * corrupted 'user' fields in localStorage.
 * 
 * Place this component near the root of your app (in RootLayout)
 * to ensure session cleanup happens before any Supabase operations.
 */
export function SessionRecoveryInitializer() {
  useEffect(() => {
    // Run session cleanup on component mount (app startup)
    try {
      const wasCleaned = cleanCorruptedSupabaseSession();
      if (wasCleaned) {
        console.log('[App] Corrupted Supabase session was cleaned on startup');
      }
    } catch (error) {
      console.warn('[App] Error during session recovery initialization:', error);
      // Non-critical - continue app startup
    }
  }, []);

  // This component doesn't render anything
  return null;
}
