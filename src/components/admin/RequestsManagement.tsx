/**
 * Requests Management Component
 *
 * Administrative interface for gear request management.
 * Provides filtering, search, and view operations for requests.
 *
 * @component
 */

import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import ErrorDisplay from '@/components/ui/error-display';
import { ViewRequestModal } from './ViewRequestModal';
import { RequestActions } from './requests';
import { useRequestData } from '@/hooks/requests/use-request-data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Checked Out', label: 'Checked Out' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Completed', label: 'Completed' },
] as const;

export function RequestsManagement() {
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

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const handleViewRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setViewModalOpen(true);
    };

    const filteredRequests = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return requests;
        return requests.filter((request) => {
            const name = request.profiles?.full_name?.toLowerCase() || '';
            const email = request.profiles?.email?.toLowerCase() || '';
            return (
                name.includes(term) ||
                email.includes(term) ||
                request.id.toLowerCase().includes(term) ||
                request.status.toLowerCase().includes(term)
            );
        });
    }, [requests, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search requests…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <RequestActions onRefresh={fetchRequests} />
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={fetchRequests} />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading requests...</span>
                </div>
            ) : (
                <div className="divide-y rounded-md border">
                    {filteredRequests.length === 0 ? (
                        <p className="p-6 text-sm text-muted-foreground">No requests found.</p>
                    ) : (
                        filteredRequests.map((request) => (
                            <div
                                key={request.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4"
                            >
                                <div>
                                    <p className="font-medium">
                                        {request.profiles?.full_name || 'Unknown user'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {request.status} · {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleViewRequest(request.id)}>
                                    View
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            )}

            <ViewRequestModal
                requestId={selectedRequestId}
                open={viewModalOpen}
                onOpenChange={setViewModalOpen}
            />
        </div>
    );
}
