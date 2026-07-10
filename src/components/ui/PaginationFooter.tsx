"use client";

import type { ReactNode } from "react";
import { Pagination } from "@/components/ui/Pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatPageSummary, getPageRange, getTotalPages } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface PaginationFooterProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    pageSizeOptions?: readonly number[];
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeLabel?: string;
    summary?: ReactNode;
    itemLabel?: string;
    disabled?: boolean;
    className?: string;
    /** Hide page controls when there is only one page (default: true). */
    hideWhenSinglePage?: boolean;
}

export function PaginationFooter({
    page,
    pageSize,
    total,
    onPageChange,
    pageSizeOptions,
    onPageSizeChange,
    pageSizeLabel = "Per page",
    summary,
    itemLabel = "item",
    disabled = false,
    className,
    hideWhenSinglePage = true,
}: PaginationFooterProps) {
    const { totalPages } = getPageRange(page, pageSize, total);
    const showPageControls = !hideWhenSinglePage || totalPages > 1;
    const hasControls = showPageControls || Boolean(onPageSizeChange && pageSizeOptions?.length);

    if (total === 0 && !summary) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex flex-col gap-3 rounded-lg bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between",
                className
            )}
        >
            <p className="text-sm text-muted-foreground">
                {summary ?? formatPageSummary(page, pageSize, total, itemLabel)}
            </p>

            {hasControls && (
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-end">
                    {onPageSizeChange && pageSizeOptions && pageSizeOptions.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="whitespace-nowrap">{pageSizeLabel}</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={(value) => onPageSizeChange(Number(value))}
                                disabled={disabled}
                            >
                                <SelectTrigger className="h-8 w-[72px] bg-background" aria-label={pageSizeLabel}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {showPageControls && (
                        <Pagination
                            currentPage={page}
                            totalPages={getTotalPages(total, pageSize)}
                            onPageChange={onPageChange}
                            disabled={disabled}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
