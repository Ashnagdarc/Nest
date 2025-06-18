/**
 * Error Handling Utilities - Centralized Error Management
 * 
 * A comprehensive error handling system for the Nest by Eden Oasis application
 * that provides consistent error processing, logging, and user feedback mechanisms.
 * This module centralizes error management to ensure uniform handling across
 * all application components and API interactions.
 * 
 * Core Features:
 * - Standardized error types and classifications
 * - User-friendly error message formatting
 * - Structured error logging for debugging
 * - Error boundary integration support
 * - API error response processing
 * - Client-side error tracking
 * 
 * Error Categories:
 * - Network Errors: API failures, timeouts, connectivity issues
 * - Authentication Errors: Login failures, session expiration, permission denied
 * - Validation Errors: Form validation, data integrity issues
 * - Database Errors: Query failures, constraint violations
 * - System Errors: Unexpected runtime errors, memory issues
 * 
 * Error Handling Strategy:
 * - Graceful degradation for non-critical errors
 * - User-friendly messaging for end users
 * - Detailed logging for developers and debugging
 * - Automatic retry mechanisms for transient failures
 * - Error boundary fallbacks for component crashes
 * 
 * Integration Points:
 * - Supabase API error responses
 * - React Error Boundaries
 * - Toast notification system
 * - Application logging service
 * - User feedback mechanisms
 * 
 * @fileoverview Centralized error handling and management utilities
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

/**
 * Application Error Types Enumeration
 * 
 * Defines the standard error types used throughout the application
 * for consistent error classification and handling strategies.
 * 
 * @enum {string} ErrorType
 */
export enum ErrorType {
    /** Network connectivity and API communication errors */
    NETWORK = 'NETWORK',
    /** User authentication and authorization errors */
    AUTH = 'AUTH',
    /** Data validation and integrity errors */
    VALIDATION = 'VALIDATION',
    /** Database operation and query errors */
    DATABASE = 'DATABASE',
    /** Unexpected system and runtime errors */
    SYSTEM = 'SYSTEM',
    /** User permission and access control errors */
    PERMISSION = 'PERMISSION',
    /** Resource not found errors */
    NOT_FOUND = 'NOT_FOUND',
    /** Rate limiting and quota exceeded errors */
    RATE_LIMIT = 'RATE_LIMIT'
}

/**
 * Error Severity Levels
 * 
 * Defines the severity classification for errors to determine
 * appropriate handling, logging, and user notification strategies.
 * 
 * @enum {string} ErrorSeverity
 */
export enum ErrorSeverity {
    /** Low severity - informational, doesn't block user workflow */
    LOW = 'LOW',
    /** Medium severity - impacts functionality but has workarounds */
    MEDIUM = 'MEDIUM',
    /** High severity - blocks critical functionality */
    HIGH = 'HIGH',
    /** Critical severity - system-wide failure or security issue */
    CRITICAL = 'CRITICAL'
}

/**
 * Structured Application Error Interface
 * 
 * Defines the standard structure for all application errors to ensure
 * consistent error handling and provide comprehensive error context.
 * 
 * @interface AppError
 */
export interface AppError {
    /** Unique error identifier for tracking and debugging */
    id: string
    /** Classification of the error type */
    type: ErrorType
    /** Severity level of the error */
    severity: ErrorSeverity
    /** User-friendly error message */
    message: string
    /** Technical error details for debugging */
    details?: string
    /** Original error object or stack trace */
    originalError?: Error | unknown
    /** Context where the error occurred */
    context?: string
    /** Timestamp when the error occurred */
    timestamp: Date
    /** User ID if error is user-specific */
    userId?: string
    /** Additional metadata for error analysis */
    metadata?: Record<string, unknown>
}

/**
 * Error Handler Configuration Interface
 * 
 * Defines configuration options for error handling behavior
 * including logging, user notifications, and retry mechanisms.
 * 
 * @interface ErrorHandlerConfig
 */
export interface ErrorHandlerConfig {
    /** Whether to show toast notifications to users */
    showToast?: boolean
    /** Whether to log the error to console/service */
    logError?: boolean
    /** Whether to attempt automatic retry */
    enableRetry?: boolean
    /** Maximum number of retry attempts */
    maxRetries?: number
    /** Whether to report error to monitoring service */
    reportError?: boolean
    /** Custom error message override */
    customMessage?: string
}

/**
 * Generate Unique Error ID
 * 
 * Creates a unique identifier for error tracking and correlation
 * across logs, monitoring systems, and user reports.
 * 
 * @returns {string} Unique error identifier
 */
const generateErrorId = (): string => {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create Structured Application Error
 * 
 * Factory function for creating standardized AppError objects with
 * consistent structure and automatic metadata population.
 * 
 * @param {Partial<AppError>} errorData - Error information to include
 * @returns {AppError} Structured error object
 * 
 * @example
 * ```typescript
 * // Create a network error
 * const networkError = createAppError({
 *   type: ErrorType.NETWORK,
 *   severity: ErrorSeverity.HIGH,
 *   message: "Failed to connect to server",
 *   context: "user-login",
 *   originalError: fetchError
 * })
 * 
 * // Create a validation error
 * const validationError = createAppError({
 *   type: ErrorType.VALIDATION,
 *   severity: ErrorSeverity.MEDIUM,
 *   message: "Email address is required",
 *   context: "profile-update"
 * })
 * ```
 */
export const createAppError = (errorData: Partial<AppError>): AppError => {
    return {
        id: generateErrorId(),
        type: errorData.type || ErrorType.SYSTEM,
        severity: errorData.severity || ErrorSeverity.MEDIUM,
        message: errorData.message || 'An unexpected error occurred',
        details: errorData.details,
        originalError: errorData.originalError,
        context: errorData.context,
        timestamp: new Date(),
        userId: errorData.userId,
        metadata: errorData.metadata
    }
}

/**
 * Get User-Friendly Error Message
 * 
 * Converts technical error details into user-friendly messages
 * that provide helpful information without exposing system internals.
 * 
 * @param {ErrorType} errorType - Type of error that occurred
 * @param {string} [customMessage] - Custom message override
 * @returns {string} User-friendly error message
 * 
 * @example
 * ```typescript
 * // Get default network error message
 * const message = getUserFriendlyMessage(ErrorType.NETWORK)
 * // Returns: "Connection error. Please check your internet and try again."
 * 
 * // Get custom message
 * const customMessage = getUserFriendlyMessage(
 *   ErrorType.AUTH, 
 *   "Please log in to access this feature"
 * )
 * ```
 */
export const getUserFriendlyMessage = (
    errorType: ErrorType,
    customMessage?: string
): string => {
    if (customMessage) return customMessage

    const messages: Record<ErrorType, string> = {
        [ErrorType.NETWORK]: 'Connection error. Please check your internet and try again.',
        [ErrorType.AUTH]: 'Authentication failed. Please log in and try again.',
        [ErrorType.VALIDATION]: 'Please check your input and try again.',
        [ErrorType.DATABASE]: 'Data operation failed. Please try again later.',
        [ErrorType.SYSTEM]: 'An unexpected error occurred. Please try again.',
        [ErrorType.PERMISSION]: 'You don\'t have permission to perform this action.',
        [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
        [ErrorType.RATE_LIMIT]: 'Too many requests. Please wait and try again.'
    }

    return messages[errorType] || messages[ErrorType.SYSTEM]
}

/**
 * Parse Supabase Error Response
 * 
 * Converts Supabase error responses into standardized AppError objects
 * with appropriate classification and user-friendly messaging.
 * 
 * @param {unknown} error - Raw Supabase error object
 * @param {string} [context] - Context where the error occurred
 * @returns {AppError} Structured application error
 * 
 * @example
 * ```typescript
 * // Parse database error
 * try {
 *   const { data, error } = await supabase.from('gears').select('*')
 *   if (error) throw error
 * } catch (err) {
 *   const appError = parseSupabaseError(err, 'gear-fetch')
 *   handleError(appError)
 * }
 * ```
 */
export const parseSupabaseError = (error: unknown, context?: string): AppError => {
    const supabaseError = error as any

    // Determine error type based on Supabase error properties
    let errorType = ErrorType.SYSTEM
    let severity = ErrorSeverity.MEDIUM

    if (supabaseError?.code) {
        // Network/connection errors
        if (supabaseError.code === 'PGRST204' || supabaseError.code === 'PGRST116') {
            errorType = ErrorType.NOT_FOUND
            severity = ErrorSeverity.LOW
        }
        // Authentication errors
        else if (supabaseError.code?.startsWith('PGRST301')) {
            errorType = ErrorType.AUTH
            severity = ErrorSeverity.HIGH
        }
        // Permission errors  
        else if (supabaseError.code?.startsWith('PGRST302')) {
            errorType = ErrorType.PERMISSION
            severity = ErrorSeverity.MEDIUM
        }
        // Database constraint violations
        else if (supabaseError.code?.startsWith('23')) {
            errorType = ErrorType.VALIDATION
            severity = ErrorSeverity.MEDIUM
        }
    }

    // Handle network errors
    if (supabaseError?.message?.includes('fetch')) {
        errorType = ErrorType.NETWORK
        severity = ErrorSeverity.HIGH
    }

    return createAppError({
        type: errorType,
        severity,
        message: getUserFriendlyMessage(errorType),
        details: supabaseError?.message || 'Unknown Supabase error',
        originalError: error instanceof Error ? error : new Error(String(error)),
        context,
        metadata: {
            supabaseCode: supabaseError?.code,
            supabaseDetails: supabaseError?.details
        }
    })
}

/**
 * Log Error Information
 * 
 * Logs error information to the console with structured formatting
 * for development debugging and production monitoring.
 * 
 * @param {AppError} error - Structured error to log
 * @param {boolean} [verbose=false] - Whether to include full error details
 * 
 * @example
 * ```typescript
 * // Basic error logging
 * logError(appError)
 * 
 * // Verbose logging for debugging
 * logError(appError, true)
 * ```
 */
export const logError = (error: AppError, verbose: boolean = false): void => {
    const logData = {
        id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
        userId: error.userId
    }

    if (verbose) {
        console.error('Application Error (Verbose):', {
            ...logData,
            details: error.details,
            originalError: error.originalError,
            metadata: error.metadata
        })
    } else {
        console.error('Application Error:', logData)
    }
}

/**
 * Global Error Handler
 * 
 * Centralized error processing function that handles logging, user
 * notifications, and appropriate error responses based on configuration.
 * 
 * @param {unknown} error - Raw error to process
 * @param {ErrorHandlerConfig} [config] - Error handling configuration
 * @param {string} [context] - Context where error occurred
 * @returns {AppError} Processed application error
 * 
 * @example
 * ```typescript
 * // Handle API error with toast notification
 * try {
 *   await apiCall()
 * } catch (err) {
 *   const processedError = handleError(err, {
 *     showToast: true,
 *     logError: true,
 *     context: 'api-call'
 *   })
 * }
 * 
 * // Handle error with custom message
 * const error = handleError(validationError, {
 *   customMessage: "Please fill in all required fields",
 *   showToast: true
 * })
 * ```
 */
export const handleError = (
    error: unknown,
    config: ErrorHandlerConfig = {},
    context?: string
): AppError => {
    // Create or parse error into standard format
    let appError: AppError

    if (error && typeof error === 'object' && 'type' in error) {
        // Already an AppError
        appError = error as AppError
    } else if (error && typeof error === 'object' && 'code' in error) {
        // Supabase error
        appError = parseSupabaseError(error, context)
    } else {
        // Generic error
        appError = createAppError({
            type: ErrorType.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            message: getUserFriendlyMessage(ErrorType.SYSTEM, config.customMessage),
            originalError: error instanceof Error ? error : new Error(String(error)),
            context
        })
    }

    // Apply configuration defaults
    const {
        showToast = true,
        logError: shouldLog = true,
        enableRetry = false,
        maxRetries = 3,
        reportError = false
    } = config

    // Log error if configured
    if (shouldLog) {
        logError(appError, process.env.NODE_ENV === 'development')
    }

    // Show user notification if configured
    if (showToast && typeof window !== 'undefined') {
        // Dynamic import to avoid SSR issues
        import('@/hooks/use-toast').then(({ toast }) => {
            toast({
                title: 'Error',
                description: config.customMessage || appError.message,
                variant: 'destructive'
            })
        }).catch(() => {
            // Fallback to console if toast fails
            console.error('Toast notification failed for error:', appError.message)
        })
    }

    // TODO: Implement retry mechanism if enabled
    // TODO: Implement error reporting service integration

    return appError
}

export interface ErrorWithMessage {
    message: string;
    code?: string;
    details?: string;
}

export function isPostgrestError(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        'message' in error &&
        'details' in error
    );
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (isPostgrestError(error)) {
        return `Database Error: ${error.message} (${error.code})`;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unexpected error occurred';
}

export function handleSupabaseError(error: unknown): ErrorWithMessage {
    if (isPostgrestError(error)) {
        return {
            message: error.message,
            code: error.code,
            details: error.details
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            code: 'UNKNOWN_ERROR'
        };
    }

    return {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
    };
}

export function createErrorLogger(context: string) {
    return (error: unknown, action?: string) => {
        const errorDetails = handleSupabaseError(error);
        console.error(
            `[${context}]${action ? ` - ${action}` : ''}\n`,
            'Error:', errorDetails.message,
            '\nCode:', errorDetails.code,
            errorDetails.details ? `\nDetails: ${errorDetails.details}` : ''
        );
        return errorDetails;
    };
}

// Usage example:
// const logError = createErrorLogger('UserDashboard');
// try {
//   // ... code that might throw
// } catch (error) {
//   const errorDetails = logError(error, 'fetching user stats');
//   toast({
//     title: 'Error',
//     description: errorDetails.message,
//     variant: 'destructive'
//   });
// } 