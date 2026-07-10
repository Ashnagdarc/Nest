"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UsersPageHeaderProps {
    isRefreshing: boolean;
    onRefresh: () => void;
    onAddUser: () => void;
}

export function UsersPageHeader({ isRefreshing, onRefresh, onAddUser }: UsersPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage users</h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    Add accounts, update roles, and manage access.
                </p>
            </div>
            <div className="flex shrink-0 gap-2 self-start">
                <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                    Refresh
                </Button>
                <Button size="sm" onClick={onAddUser} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add user
                </Button>
            </div>
        </div>
    );
}
