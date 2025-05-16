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
    /WebSocket is closed before the connection/i
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