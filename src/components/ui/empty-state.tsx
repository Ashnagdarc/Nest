'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ title = 'No data', description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('text-center py-10 px-4 border rounded-lg bg-background', className)}>
            <div className="text-lg font-medium">{title}</div>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

export default EmptyState;


