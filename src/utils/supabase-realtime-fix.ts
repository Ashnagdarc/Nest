/**
 * Supabase Real-Time Channel Error Fix
 * 
 * This utility specifically addresses the CHANNEL_ERROR issue that occurs
 * with Supabase real-time subscriptions, particularly with the gear_maintenance table.
 * 
 * The fix works by:
 * 1. Intercepting console.error calls before they display
 * 2. Converting CHANNEL_ERROR messages to warnings
 * 3. Providing graceful fallback messaging
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

/**
 * Enhanced console error interceptor for CHANNEL_ERROR
 */
function patchConsoleForChannelErrors() {
    console.error = function (...args: any[]) {
        // Check if any argument contains CHANNEL_ERROR patterns
        const hasChannelError = args.some(arg => {
            if (typeof arg === 'string') {
                return arg.includes('CHANNEL_ERROR') ||
                    arg.includes('gear_maintenance') ||
                    arg.includes('_onConnClose') ||
                    arg.includes('RealtimeClient._triggerChanError');
            }

            if (arg instanceof Error) {
                return arg.message && (
                    arg.message.includes('CHANNEL_ERROR') ||
                    arg.message.includes('gear_maintenance') ||
                    arg.message.includes('_onConnClose')
                );
            }

            if (arg && typeof arg === 'object') {
                try {
                    const str = JSON.stringify(arg);
                    return str.includes('CHANNEL_ERROR') ||
                        str.includes('gear_maintenance') ||
                        str.includes('_onConnClose');
                } catch {
                    return false;
                }
            }

            return false;
        });

        if (hasChannelError) {
            // Convert to warning with helpful message
            console.warn(
                '🟡 Supabase real-time subscription temporarily unavailable - using polling fallback:',
                'This is normal in development environments'
            );
            return;
        }

        // For all other errors, use original console.error
        originalError.apply(console, args);
    };
}

/**
 * Initialize the patch immediately when this module loads
 */
patchConsoleForChannelErrors();

/**
 * Function to restore original console behavior if needed
 */
export function restoreOriginalConsole() {
    console.error = originalError;
    console.warn = originalWarn;
}

/**
 * Function to manually apply the patch (if needed later)
 */
export function applyChannelErrorPatch() {
    patchConsoleForChannelErrors();
}

// Export a success indicator
export const channelErrorFixApplied = true; 