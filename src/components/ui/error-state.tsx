'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-10 px-4 border rounded-lg bg-background', className)}>
            <div className="text-destructive font-medium">{message}</div>
            {onRetry && (
                <Button variant="outline" className="mt-3" onClick={onRetry} aria-label="Retry">
                    Try Again
                </Button>
            )}
        </div>
    );
}

export default ErrorState;


