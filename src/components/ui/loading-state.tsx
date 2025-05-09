'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    className?: string;
    variant?: 'default' | 'cards' | 'table';
    count?: number;
}

export function LoadingState({
    className,
    variant = 'default',
    count = 3
}: LoadingStateProps) {
    if (variant === 'cards') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(count).fill(0).map((_, i) => (
                    <div
                        key={i}
                        className="bg-card rounded-lg p-4 space-y-3 animate-pulse"
                    >
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-8 bg-muted rounded"></div>
                            <div className="h-4 bg-muted rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className="space-y-3">
                {Array(count).fill(0).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center space-x-4 animate-pulse"
                    >
                        <div className="h-12 bg-muted rounded w-12"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded"></div>
                            <div className="h-4 bg-muted rounded w-5/6"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center justify-center p-8",
            className
        )}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
} 