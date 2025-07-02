/**
 * Requests Management Component
 * 
 * Administrative interface for gear request management.
 * Provides filtering, search, and view operations for requests.
 * 
 * @component
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorDisplay from '@/components/ui/error-display';
import { ViewRequestModal } from './ViewRequestModal';
import { RequestFilters, RequestActions, RequestTable } from './requests';
import { useRequestData } from '@/hooks/requests/use-request-data';

export function RequestsManagement() {
    // Data management
    const {
        requests,
        isLoading,
        error,
        filter,
        searchTerm,
        setFilter,
        setSearchTerm,
        fetchRequests,
    } = useRequestData();

    // Modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    // Modal handlers
    const handleViewRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setViewModalOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Filter and Control Panel */}
            <div className="flex flex-wrap gap-2 justify-between">
                <RequestFilters
                    filter={filter}
                    onFilterChange={setFilter}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

                <RequestActions
                    onRefresh={fetchRequests}
                />
            </div>

            {/* Content Display */}
            {error ? (
                <ErrorDisplay
                    error={error}
                    onRetry={fetchRequests}
                />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading requests...</span>
                </div>
            ) : (
                <RequestTable
                    requests={requests}
                    onViewRequest={handleViewRequest}
                />
            )}

            {/* View Request Modal */}
            <ViewRequestModal
                requestId={selectedRequestId}
                open={viewModalOpen}
                onOpenChange={setViewModalOpen}
            />
        </div>
    );
} 