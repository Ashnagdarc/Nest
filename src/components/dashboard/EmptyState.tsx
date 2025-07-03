import React, { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: ReactNode | LucideIcon;
    title: string;
    description: string;
    actionLink?: string;
    actionText?: string;
}

export function EmptyState({ icon, title, description, actionLink, actionText }: EmptyStateProps) {
    // Check if icon is a component constructor (function) and render it properly
    const renderIcon = () => {
        if (typeof icon === 'function') {
            const IconComponent = icon as LucideIcon;
            return React.createElement(IconComponent, { className: "h-12 w-12 text-muted-foreground" });
        }
        return icon;
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3">{renderIcon()}</div>
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