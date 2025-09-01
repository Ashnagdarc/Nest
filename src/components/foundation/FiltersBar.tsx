"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FiltersBarProps {
    children: ReactNode;
    className?: string;
}

// A responsive, consistent container for filter inputs/actions
export function FiltersBar({ children, className }: FiltersBarProps) {
    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-border/60 bg-background transition-colors motion-normal",
                className
            )}
        >
            {children}
        </div>
    );
}

export default FiltersBar;


