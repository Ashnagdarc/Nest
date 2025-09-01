"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    lastUpdated?: string;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({ title, subtitle, lastUpdated, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 transition-all motion-normal", className)}>
            <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{title}</h1>
                {(subtitle || lastUpdated) && (
                    <p className="text-sm text-muted-foreground">
                        {subtitle ?? (lastUpdated ? `Last updated: ${lastUpdated}` : undefined)}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">{actions}</div>
            )}
        </div>
    );
}

export default PageHeader;


