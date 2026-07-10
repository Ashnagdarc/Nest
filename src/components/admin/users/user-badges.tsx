"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function RoleBadge({ role }: { role: string | null | undefined }) {
    const normalized = String(role || 'User').toLowerCase();
    const className =
        normalized === 'admin'
            ? 'border-0 bg-purple-500/15 text-purple-700 dark:text-purple-300'
            : normalized === 'manager'
              ? 'border-0 bg-blue-500/15 text-blue-700 dark:text-blue-300'
              : 'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';

    const label = role
        ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
        : 'User';

    return (
        <Badge variant="secondary" className={cn('text-[11px] font-normal', className)}>
            {label}
        </Badge>
    );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
    const normalized = String(status || 'Active').toLowerCase();
    const className =
        normalized === 'active'
            ? 'border-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
            : normalized === 'suspended'
              ? 'border-0 bg-red-500/15 text-red-700 dark:text-red-300'
              : 'border-0 bg-muted text-muted-foreground';

    const label = status
        ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
        : 'Active';

    return (
        <Badge variant="secondary" className={cn('text-[11px] font-normal', className)}>
            {label}
        </Badge>
    );
}
