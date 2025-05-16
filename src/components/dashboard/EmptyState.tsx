import { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';

interface EmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    actionLink?: string;
    actionText?: string;
}

export function EmptyState({ icon, title, description, actionLink, actionText }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="text-4xl mb-3">{icon}</div>
            <h3 className="text-lg font-medium mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
            {actionLink && actionText && (
                <Link href={actionLink}>
                    <Button variant="outline" size="sm">{actionText}</Button>
                </Link>
            )}
        </div>
    );
} 