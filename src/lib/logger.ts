// Type definitions
type LogLevel = 'error' | 'info' | 'debug';
type LogData = {
    message: string;
    context: string;
    timestamp: string;
    [key: string]: unknown;
};

// Store original console methods to avoid infinite recursion
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

// Helper function to get current timestamp
const getTimestamp = () => new Date().toISOString();

// Helper function to send logs to server
const sendToServer = async (level: LogLevel, message: string, context: string, metadata?: Record<string, unknown>) => {
    try {
        const response = await fetch('/api/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level,
                message,
                context,
                metadata: {
                    ...metadata,
                    timestamp: getTimestamp()
                }
            })
        });

        if (!response.ok) {
            originalConsoleError('Failed to send log to server:', await response.text());
        }
    } catch (error) {
        originalConsoleError('Error sending log to server:', error);
    }
};

// Helper functions for common log types
export const logError = (error: unknown, context: string, metadata?: Record<string, unknown>) => {
    // Ensure error is properly formatted
    let errorObj: Error;
    if (error instanceof Error) {
        errorObj = error;
    } else if (typeof error === 'string') {
        errorObj = new Error(error);
    } else if (error && typeof error === 'object') {
        errorObj = new Error(JSON.stringify(error));
    } else {
        errorObj = new Error('An unknown error occurred');
    }

    const logData: LogData = {
        message: errorObj.message || 'An error occurred',
        context,
        timestamp: getTimestamp(),
        stack: errorObj.stack,
        originalError: error, // Keep the original error for debugging
        ...metadata
    };

    // Log to console with better formatting using original console.error
    originalConsoleError('[Error]', logData);

    // Send to server
    sendToServer('error', logData.message, context, {
        stack: errorObj.stack,
        originalError: error,
        ...metadata
    });
};

export const logInfo = (message: string, context: string, metadata?: Record<string, unknown>) => {
    const logData: LogData = {
        message,
        context,
        timestamp: getTimestamp(),
        ...metadata
    };

    // Log to console using original console.log to avoid infinite recursion
    originalConsoleLog('[Info]', logData);

    // Send to server
    sendToServer('info', message, context, metadata);
};

export const logDebug = (message: string, context: string, metadata?: Record<string, unknown>) => {
    const logData: LogData = {
        message,
        context,
        timestamp: getTimestamp(),
        ...metadata
    };

    // Log to console using original console.debug
    originalConsoleDebug('[Debug]', logData);

    // Send to server
    sendToServer('debug', message, context, metadata);
};

// Simple console logger interface
const logger = {
    error: logError,
    info: logInfo,
    debug: logDebug
};

// Redirect vanilla console.log to our logger in production to avoid stray logs
if (process.env.NODE_ENV === 'production') {
    console.log = (...args: unknown[]) => {
        logInfo(args.join(' '), 'console');
    };
}

export default logger; 