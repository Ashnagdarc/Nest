import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    disabled?: boolean;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
    disabled = false,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages: number[] = [];
        const max = Math.max(1, totalPages);
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(max, currentPage + 2);
        if (currentPage <= 3) end = Math.min(max, 5);
        if (currentPage >= max - 2) start = Math.max(1, max - 4);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <nav
            className={cn("flex items-center gap-1", className)}
            aria-label="Pagination"
        >
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={disabled || currentPage === 1}
                aria-label="Previous page"
                className="h-8 w-8 p-0"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPages().map((page) => (
                <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    disabled={disabled}
                    aria-current={page === currentPage ? "page" : undefined}
                    className="h-8 min-w-8 px-2"
                >
                    {page}
                </Button>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={disabled || currentPage === totalPages}
                aria-label="Next page"
                className="h-8 w-8 p-0"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}
