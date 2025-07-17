import React from "react";
import { Button } from "./button";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    className = "",
}) => {
    if (totalPages <= 1) return null;

    const getPages = () => {
        const pages = [];
        const max = Math.max(1, totalPages);
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(max, currentPage + 2);
        if (currentPage <= 3) end = Math.min(max, 5);
        if (currentPage >= max - 2) start = Math.max(1, max - 4);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    return (
        <nav className={`flex items-center gap-2 ${className}`} aria-label="Pagination">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
            >
                &lt;
            </Button>
            {getPages().map((page) => (
                <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                >
                    {page}
                </Button>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
            >
                &gt;
            </Button>
        </nav>
    );
}; 