"use client";

import { Megaphone, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnnouncementsPageHeaderProps {
    title: string;
    description: string;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    onCreate?: () => void;
    createLabel?: string;
    action?: React.ReactNode;
}

export function AnnouncementsPageHeader({
    title,
    description,
    isRefreshing,
    onRefresh,
    onCreate,
    createLabel = 'New announcement',
    action,
}: AnnouncementsPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <Megaphone className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
            </div>
            <div className="flex shrink-0 gap-2 self-start">
                {onRefresh ? (
                    <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                        <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                        Refresh
                    </Button>
                ) : null}
                {action}
                {onCreate ? (
                    <Button size="sm" onClick={onCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {createLabel}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
