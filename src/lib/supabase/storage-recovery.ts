/**
 * Supabase Storage Recovery Utility
 * 
 * Handles detection and recovery of corrupted Supabase auth session data
 * that can occur from incomplete writes, size limits, or version mismatches.
 * 
 * @module storage-recovery
 * @see https://github.com/supabase/supabase-js/issues (auth session corruption)
 */

/**
 * Validates and repairs corrupted Supabase session data in localStorage
 * 
 * The Supabase auth session should have structure:
 * ```json
 * {
 *   "access_token": "string",
 *   "user": { "id": "uuid", "email": "string", ... },
 *   "refresh_token": "string",
 *   "expires_at": number,
 *   ...
 * }
 * ```
 * 
 * Common corruptions:
 * - user field is a string instead of object
 * - session data is truncated/incomplete
 * - malformed JSON in session
 * 
 * @returns {boolean} true if session was cleaned, false if session was valid
 */
export function cleanCorruptedSupabaseSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const keys = Object.keys(window.localStorage);
    let wasCleaned = false;

    for (const key of keys) {
      // Target Supabase auth session keys: sb-{projectRef}-auth-token
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) {
        continue;
      }

      try {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) {
          continue;
        }

        // Try to parse the session
        let session: any;
        try {
          session = JSON.parse(rawValue);
        } catch (e) {
          // Completely unparseable JSON - delete it
          console.warn(
            `[Supabase Recovery] Deleting malformed session at ${key}:`,
            e instanceof Error ? e.message : String(e)
          );
          window.localStorage.removeItem(key);
          wasCleaned = true;
          continue;
        }

        // Validate session structure
        if (!isValidSupabaseSession(session)) {
          console.warn(
            `[Supabase Recovery] Detected corrupted session structure at ${key}`
          );
          logSessionIssue(session);

          // If user field is a string, this is the specific issue from the error report
          if (typeof session.user === 'string') {
            console.warn('[Supabase Recovery] Session.user is a string (should be object). Removing corrupted session.');
            window.localStorage.removeItem(key);
            wasCleaned = true;
            continue;
          }

          // Try to salvage what we can
          const repaired = repairSession(session);
          if (repaired) {
            window.localStorage.setItem(key, JSON.stringify(repaired));
            console.log('[Supabase Recovery] Session repaired');
            wasCleaned = true;
          } else {
            // Can't repair - remove it
            console.warn('[Supabase Recovery] Session too corrupted to repair. Removing.');
            window.localStorage.removeItem(key);
            wasCleaned = true;
          }
        }
      } catch (error) {
        console.warn(
          `[Supabase Recovery] Error processing session key ${key}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return wasCleaned;
  } catch (error) {
    console.warn(
      '[Supabase Recovery] Error during session cleanup:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Validates Supabase session structure
 * A valid session should have:
 * - access_token: string
 * - user: object with id and email
 * - refresh_token: string
 * - expires_at: number
 */
function isValidSupabaseSession(session: any): boolean {
  // Must be an object
  if (!session || typeof session !== 'object') {
    return false;
  }

  // access_token must be a string
  if (typeof session.access_token !== 'string') {
    return false;
  }

  // user must be an object (not a string or null)
  if (!session.user || typeof session.user !== 'object' || Array.isArray(session.user)) {
    return false;
  }

  // user.id must be a string (UUID)
  if (typeof session.user.id !== 'string') {
    return false;
  }

  // refresh_token must be a string
  if (typeof session.refresh_token !== 'string') {
    return false;
  }

  // expires_at must be a number or not present
  if (session.expires_at !== undefined && typeof session.expires_at !== 'number') {
    return false;
  }

  return true;
}

/**
 * Logs detailed information about what's wrong with the session
 * Helps with debugging without exposing sensitive data
 */
function logSessionIssue(session: any): void {
  if (!session) {
    console.warn('[Supabase Recovery] Session is null or undefined');
    return;
  }

  console.warn('[Supabase Recovery] Session structure issues:');
  console.warn(`  - Type: ${typeof session} (expected: object)`);
  console.warn(`  - access_token type: ${typeof session.access_token} (expected: string)`);
  console.warn(`  - user type: ${typeof session.user} (expected: object)`);
  
  if (session.user && typeof session.user === 'object') {
    console.warn(`    - user.id type: ${typeof session.user.id} (expected: string)`);
    console.warn(`    - user.email type: ${typeof session.user.email} (expected: string)`);
  }

  console.warn(`  - refresh_token type: ${typeof session.refresh_token} (expected: string)`);
  console.warn(`  - expires_at type: ${typeof session.expires_at} (expected: number)`);
}

/**
 * Attempts to repair a corrupted session
 * Returns null if repair is impossible
 * 
 * Repair strategies:
 * 1. If access_token and refresh_token exist but user is invalid, remove both tokens
 *    (user will need to log in again to get valid user data)
 * 2. If critical fields are missing, return null (can't repair)
 */
function repairSession(session: any): any | null {
  // Can't repair if access_token or refresh_token missing
  if (typeof session.access_token !== 'string' || typeof session.refresh_token !== 'string') {
    return null;
  }

  // If user is invalid (string, null, not an object), return null
  // User will need to re-login to get valid user object
  if (!session.user || typeof session.user !== 'object' || Array.isArray(session.user)) {
    return null;
  }

  // User object exists but might have invalid structure
  // Minimal repair: ensure user object has required id field
  if (typeof session.user.id !== 'string') {
    return null;
  }

  // Session structure looks valid
  return session;
}

/**
 * Clears all Supabase auth data from localStorage
 * Use this to force user to log in again after session corruption
 */
export function clearAllSupabaseAuth(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') && (key.endsWith('-auth-token') || key.endsWith('-auth-token-code-verifier'))) {
        window.localStorage.removeItem(key);
        console.log(`[Supabase Recovery] Cleared ${key}`);
      }
    }
  } catch (error) {
    console.warn('[Supabase Recovery] Error clearing auth data:', error);
  }
}
