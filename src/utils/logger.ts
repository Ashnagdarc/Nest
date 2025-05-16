// Simplified logger implementation that doesn't write to files
// but maintains the same API for compatibility

interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'warn' | 'debug';
    context: string;
    message: string;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private browserLogs: LogEntry[] = [];

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private createLogEntry(level: LogEntry['level'], message: string, context: string, data?: any): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            context,
            message,
            data
        };
    }

    public logInfo(message: string, context: string, data?: any): void {
        const entry = this.createLogEntry('info', message, context, data);
        this.browserLogs.push(entry);
        if (process.env.NODE_ENV === 'development') {
            console.log('[Info]', message, entry);
        }
    }

    public logError(error: any, context: string, data?: any): void {
        let errorMessage: string;
        let errorData: any = { ...data };

        if (error instanceof Error) {
            errorMessage = error.message;
            errorData.stack = error.stack;
        } else if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
            errorMessage = 'Empty error object received';
            errorData = {
                ...errorData,
                emptyError: true,
                errorType: error === null ? 'null' : error === undefined ? 'undefined' : 'emptyObject'
            };
        } else {
            errorMessage = String(error);
            if (typeof error === 'object') {
                errorData = {
                    ...errorData,
                    ...error,
                    originalError: error
                };
            }
        }

        const entry = this.createLogEntry('error', errorMessage, context, errorData);
        this.browserLogs.push(entry);
        if (process.env.NODE_ENV === 'development') {
            console.error('[Error]', errorMessage, entry);
        }
    }

    public logWarning(message: string, context: string, data?: any): void {
        const entry = this.createLogEntry('warn', message, context, data);
        this.browserLogs.push(entry);
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Warning]', message, entry);
        }
    }

    public logDebug(message: string, context: string, data?: any): void {
        if (process.env.NODE_ENV !== 'production') {
            const entry = this.createLogEntry('debug', message, context, data);
            this.browserLogs.push(entry);
            console.debug('[Debug]', message, entry);
        }
    }

    public getRecentLogs(): LogEntry[] {
        return this.browserLogs.slice(-100);
    }

    public validateTableContext(tableName: string, operation: string, data: any): void {
        this.logDebug(
            `Validating table context for ${operation}`,
            'TableValidation',
            { tableName, data }
        );
    }

    // Clean logs regularly to avoid memory leaks
    public cleanOldLogs(): void {
        if (this.browserLogs.length > 1000) {
            this.browserLogs = this.browserLogs.slice(-500);
        }
    }
}

const loggerInstance = Logger.getInstance();

// Clean logs periodically
if (typeof window !== 'undefined') {
    setInterval(() => {
        loggerInstance.cleanOldLogs();
    }, 60000); // Clean every minute
}

export const logInfo = loggerInstance.logInfo.bind(loggerInstance);
export const logError = loggerInstance.logError.bind(loggerInstance);
export const logWarning = loggerInstance.logWarning.bind(loggerInstance);
export const logDebug = loggerInstance.logDebug.bind(loggerInstance);
export const validateTableContext = loggerInstance.validateTableContext.bind(loggerInstance);
export const getRecentLogs = loggerInstance.getRecentLogs.bind(loggerInstance);

// Modern logger interface that's easier to use
export const logger = {
    info: (message: string, metadata?: any) => {
        logInfo(message, metadata?.context || 'App', metadata);
    },
    error: (message: string | Error | null | undefined, metadata?: any) => {
        const context = metadata?.context || 'App';

        if (message instanceof Error) {
            logError(message, context, metadata);
        } else if (message === null || message === undefined) {
            // Handle null/undefined errors
            logError(new Error("Null or undefined error received"), context, {
                ...metadata,
                errorType: message === null ? 'null' : 'undefined'
            });
        } else if (typeof message === 'object' && Object.keys(message).length === 0) {
            // Handle empty object errors specifically
            logError(new Error("Empty error object received"), context, {
                ...metadata,
                errorType: 'emptyObject',
                originalError: message
            });
        } else if (typeof message === 'object') {
            // Handle non-Error objects
            try {
                const errorMessage = JSON.stringify(message);
                logError(new Error(`Object error: ${errorMessage}`), context, {
                    ...metadata,
                    errorType: 'object',
                    originalError: message
                });
            } catch (e) {
                logError(new Error("Non-serializable object error"), context, {
                    ...metadata,
                    errorType: 'nonSerializableObject',
                    originalError: message
                });
            }
        } else {
            // Handle string errors
            logError(new Error(message), context, metadata);
        }
    },
    warn: (message: string, metadata?: any) => {
        logWarning(message, metadata?.context || 'App', metadata);
    },
    debug: (message: string, metadata?: any) => {
        logDebug(message, metadata?.context || 'App', metadata);
    }
}; 