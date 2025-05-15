// Server-side imports will be loaded dynamically
import { format } from 'date-fns';

// Constants for log rotation
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOG_FILES = 5;
let LOG_DIR = '';

// Initialize server-side modules
if (typeof window === 'undefined') {
    // We're on the server side
    const fs = require('fs');
    const path = require('path');
    LOG_DIR = path.join(process.cwd(), 'logs');

    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'warn' | 'debug';
    context: string;
    message: string;
    data?: any;
}

class Logger {
    private static instance: Logger;
    private currentLogFile: string = '';
    private browserLogs: LogEntry[] = [];

    private constructor() {
        if (typeof window === 'undefined') {
            this.currentLogFile = this.getLatestLogFile();
        }
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private getLatestLogFile(): string {
        if (typeof window !== 'undefined') return '';

        const path = require('path');
        const today = format(new Date(), 'yyyy-MM-dd');
        return path.join(LOG_DIR, `app-${today}.log`);
    }

    private rotateLogsIfNeeded(): void {
        if (typeof window !== 'undefined') return;

        try {
            const fs = require('fs');
            const path = require('path');
            const stats = fs.statSync(this.currentLogFile);

            if (stats.size >= MAX_LOG_SIZE) {
                // Get all log files
                const files = fs.readdirSync(LOG_DIR)
                    .filter((file: string) => file.startsWith('app-'))
                    .sort((a: string, b: string) => fs.statSync(path.join(LOG_DIR, b)).mtime.getTime() -
                        fs.statSync(path.join(LOG_DIR, a)).mtime.getTime());

                // Remove oldest files if we exceed MAX_LOG_FILES
                while (files.length >= MAX_LOG_FILES) {
                    const oldestFile = files.pop();
                    if (oldestFile) {
                        fs.unlinkSync(path.join(LOG_DIR, oldestFile));
                    }
                }

                // Create new log file with timestamp
                const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
                this.currentLogFile = path.join(LOG_DIR, `app-${timestamp}.log`);
            }
        } catch (error) {
            console.error('Error rotating logs:', error);
        }
    }

    private writeToFile(entry: LogEntry): void {
        if (typeof window !== 'undefined') {
            this.browserLogs.push(entry);
            if (this.browserLogs.length > 1000) this.browserLogs.shift();
            return;
        }

        try {
            const fs = require('fs');
            this.rotateLogsIfNeeded();
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.currentLogFile, logLine);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
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
        this.writeToFile(entry);
        if (process.env.NODE_ENV === 'development') {
            console.log('[Info]', entry);
        }
    }

    public logError(error: any, context: string, data?: any): void {
        let errorMessage: string;
        let errorData: any = { ...data };

        if (error instanceof Error) {
            errorMessage = error.message;
            errorData.stack = error.stack;
        } else if (typeof error === 'object' && Object.keys(error).length === 0) {
            errorMessage = 'Empty error object received';
            errorData.originalError = error;
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
        this.writeToFile(entry);
        if (process.env.NODE_ENV === 'development') {
            console.error('[Error]', entry);
        }
    }

    public logWarning(message: string, context: string, data?: any): void {
        const entry = this.createLogEntry('warn', message, context, data);
        this.writeToFile(entry);
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Warning]', entry);
        }
    }

    public logDebug(message: string, context: string, data?: any): void {
        if (process.env.NODE_ENV !== 'production') {
            const entry = this.createLogEntry('debug', message, context, data);
            this.writeToFile(entry);
            console.debug('[Debug]', entry);
        }
    }

    public getRecentLogs(): LogEntry[] {
        if (typeof window === 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                const content = fs.readFileSync(this.currentLogFile, 'utf-8');
                return content.split('\n')
                    .filter(Boolean)
                    .map((line: string) => JSON.parse(line));
            } catch (error) {
                console.error('Error reading log file:', error);
                return [];
            }
        }
        return this.browserLogs;
    }

    public validateTableContext(tableName: string, operation: string, data: any): void {
        this.logDebug(
            `Validating table context for ${operation}`,
            'TableValidation',
            { tableName, data }
        );
    }
}

const logger = Logger.getInstance();

export const logInfo = logger.logInfo.bind(logger);
export const logError = logger.logError.bind(logger);
export const logWarning = logger.logWarning.bind(logger);
export const logDebug = logger.logDebug.bind(logger);
export const validateTableContext = logger.validateTableContext.bind(logger);
export const getRecentLogs = logger.getRecentLogs.bind(logger); 