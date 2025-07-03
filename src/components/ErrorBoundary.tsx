'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary Props Interface
 */
interface ErrorBoundaryProps {
    /** Child components to protect */
    children: React.ReactNode;
    /** Optional fallback component */
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
    /** Optional error handler */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary State Interface
 */
interface ErrorBoundaryState {
    /** Whether an error has occurred */
    hasError: boolean;
    /** The error that occurred */
    error: Error | null;
    /** Additional error information */
    errorInfo: React.ErrorInfo | null;
}

/**
 * Enhanced Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI. Includes special handling for Supabase real-time errors.
 * 
 * @component
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    /**
     * Static method to update state when an error occurs
     */
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Check if this is a Supabase real-time error that should be handled gracefully
        if (error.message && (
            error.message.includes('CHANNEL_ERROR') ||
            error.message.includes('Subscription error') ||
            error.message.includes('_onConnClose') ||
            error.message.includes('RealtimeClient')
        )) {
            // For Supabase real-time errors, log as warning and don't show error boundary
            console.warn('🟡 Supabase real-time error caught by boundary (will continue normally):', error.message);
            return { hasError: false, error: null, errorInfo: null };
        }

        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    /**
     * Lifecycle method called when an error occurs
     */
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Filter out Supabase real-time errors
        if (error.message && (
            error.message.includes('CHANNEL_ERROR') ||
            error.message.includes('Subscription error') ||
            error.message.includes('_onConnClose') ||
            error.message.includes('RealtimeClient') ||
            error.message.includes('gear_maintenance')
        )) {
            console.warn('🟡 Supabase real-time error handled gracefully:', error.message);
            // Reset the error boundary state for these errors
            this.setState({ hasError: false, error: null, errorInfo: null });
            return;
        }

        // For other errors, update state and call error handler
        this.setState({ errorInfo });

        // Call the error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log the error for debugging
        console.error('Error caught by boundary:', error);
        console.error('Error info:', errorInfo);
    }

    /**
     * Reset the error boundary state
     */
    resetError = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                const FallbackComponent = this.props.fallback;
                return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="max-w-md w-full mx-auto p-6">
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <AlertTriangle className="h-12 w-12 text-destructive" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                            <p className="text-muted-foreground">
                                An unexpected error occurred. Please try refreshing the page.
                            </p>
                            <div className="space-y-2">
                                <Button onClick={this.resetError} className="w-full">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.reload()}
                                    className="w-full"
                                >
                                    Refresh Page
                                </Button>
                            </div>

                            {/* Show error details in development */}
                            {process.env.NODE_ENV === 'development' && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm font-medium">
                                        Error Details (Development)
                                    </summary>
                                    <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto">
                                        {this.state.error?.stack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
} 