/**
 * Console Error Interceptor for Supabase Realtime
 * 
 * This utility intercepts console.error calls and filters out
 * common Supabase Realtime messages that aren't true errors.
 * 
 * Usage:
 * import './utils/intercept-console-error';
 * 
 * Add to _app.tsx or a global utility file that loads early.
 */

// Store the original console.error function
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Patterns to identify non-error messages from Supabase Realtime
const realtimeIgnorePatterns = [
    // Messages that look like errors but are actually info messages
    /Subscribed to PostgreSQL/i,
    /postgres_changes/i,
    /maxRetries exhausted after/i,
    /reconnect attempt/i,
    /realtime-js/i,
    /connection established/i,
    // WebSocket related messages that aren't fatal
    /WebSocket connection to/i,
    /WebSocket is closed before the connection/i,
    // Specific CHANNEL_ERROR patterns
    /CHANNEL_ERROR/i,
    /Subscription error for gear_maintenance: CHANNEL_ERROR/i,
    /_onConnClose/i,
    /RealtimeClient\._triggerChanError/i,
    /RealtimeChannel\._trigger/i,
    // Additional WebSocket connection patterns
    /conn\.onclose/i,
    /WebSocket connection closed/i,
    /Failed to load resource.*403/i
];

// Replace the console.error function with our filtered version
console.error = function (...args) {
    // Check if the message contains any of our ignore patterns
    const isSupabaseRealtimeMessage = args.some(arg => {
        if (typeof arg === 'string') {
            return realtimeIgnorePatterns.some(pattern => pattern.test(arg));
        }

        // Handle Error objects
        if (arg instanceof Error && arg.message) {
            return realtimeIgnorePatterns.some(pattern => pattern.test(arg.message));
        }

        // Handle objects that might contain an error message
        if (arg && typeof arg === 'object') {
            const stringified = JSON.stringify(arg);
            return realtimeIgnorePatterns.some(pattern => pattern.test(stringified));
        }

        return false;
    });

    // Special handling for CHANNEL_ERROR - convert to warning
    const hasChannelError = args.some(arg => {
        const str = typeof arg === 'string' ? arg : (arg instanceof Error ? arg.message : JSON.stringify(arg));
        return str && str.includes('CHANNEL_ERROR');
    });

    if (hasChannelError) {
        // Log as warning instead of error for CHANNEL_ERROR using original console.warn
        originalConsoleWarn(' Supabase realtime channel error (falling back to polling):', ...args);
        return;
    }

    // If it's not a Supabase Realtime message, pass it to the original console.error
    if (!isSupabaseRealtimeMessage) {
        originalConsoleError.apply(console, args);
    }
    // Optionally log filtered messages at a lower level if needed
    // else {
    //   console.log('Filtered Realtime message:', ...args);
    // }
};

// Export placeholder to satisfy module system
export { }; 