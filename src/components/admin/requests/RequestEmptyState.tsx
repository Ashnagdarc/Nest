import React from "react";
import { Button } from "@/components/ui/button";

interface RequestEmptyStateProps {
    onRefresh: () => void;
    onClearFilters?: () => void;
    hasActiveFilters?: boolean;
}

const RequestEmptyState: React.FC<RequestEmptyStateProps> = ({ onRefresh, onClearFilters, hasActiveFilters }) => (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
        <span className="text-lg sm:text-2xl text-muted-foreground font-semibold">No requests found</span>
        <span className="text-xs sm:text-sm text-muted-foreground">Try adjusting your filters or search terms.</span>
        <div className="flex gap-2 mt-2">
            <Button variant="outline" onClick={onRefresh}>Refresh</Button>
            {hasActiveFilters && onClearFilters && (
                <Button variant="secondary" onClick={onClearFilters}>Clear Filters</Button>
            )}
        </div>
    </div>
);

export default RequestEmptyState; 