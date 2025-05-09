import { PostgrestError } from '@supabase/supabase-js';

export interface ErrorWithMessage {
    message: string;
    code?: string;
    details?: string;
}

export function isPostgrestError(error: unknown): error is PostgrestError {
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