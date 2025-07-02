/**
 * Request Actions Component
 * 
 * Action buttons for request management operations.
 * Provides refresh functionality for request data.
 * 
 * @component
 */

import { Button } from "@/components/ui/button";

interface RequestActionsProps {
    onRefresh: () => void;
}

export function RequestActions({ onRefresh }: RequestActionsProps) {
    return (
        <Button onClick={onRefresh}>
            Refresh
        </Button>
    );
} 