import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ErrorDisplay from '@/components/ui/error-display';
import { ViewRequestModal } from './ViewRequestModal';

export function RequestsManagement() {
    const supabase = createClient();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requests, setRequests] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    useEffect(() => {
        fetchRequests();
    }, [filter]);

    async function fetchRequests() {
        setIsLoading(true);
        setError(null);

        try {
            // Check if table exists
            const { count, error: tableError } = await supabase
                .from('gear_requests')
                .select('*', { count: 'exact', head: true });

            if (tableError) {
                throw new Error(`Table error: ${tableError.message}`);
            }

            if (count === null) {
                setRequests([]);
                return;
            }

            // Build query based on filter
            let query = supabase
                .from('gear_requests')
                .select(`
          id,
          status,
          created_at,
          updated_at,
          due_date,
          user_id,
          gear_ids,
          profiles:user_id (
            full_name,
            email
          )
        `)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filter !== "all") {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) throw new Error(`Data fetch error: ${error.message}`);
            setRequests(data || []);
        } catch (error: any) {
            console.error("Error fetching requests:", error.message);
            setError(error.message);
            toast({
                title: "Error fetching requests",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const handleViewRequest = (requestId: string) => {
        setSelectedRequestId(requestId);
        setViewModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'new':
                return <Badge className="bg-green-500">New</Badge>;
            case 'pending':
                return <Badge className="bg-blue-500">Pending</Badge>;
            case 'approved':
                return <Badge className="bg-purple-500">Approved</Badge>;
            case 'checked_out':
                return <Badge className="bg-orange-500">Checked Out</Badge>;
            case 'overdue':
                return <Badge className="bg-red-500">Overdue</Badge>;
            case 'returned':
                return <Badge className="bg-gray-500">Returned</Badge>;
            case 'partially_returned':
                return <Badge className="bg-yellow-500">Partially Returned</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-500">Cancelled</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500">Rejected</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const filteredRequests = requests.filter(request => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            request.id?.toLowerCase().includes(searchLower) ||
            (request.profiles?.full_name || '').toLowerCase().includes(searchLower) ||
            (request.profiles?.email || '').toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 items-center">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Requests</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="checked_out">Checked Out</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="partially_returned">Partially Returned</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={() => fetchRequests()}>Refresh</Button>
            </div>

            {error ? (
                <ErrorDisplay error={error} onRetry={fetchRequests} />
            ) : isLoading ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading requests...</span>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No requests found
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.map(request => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.id?.slice(0, 8)}</TableCell>
                                    <TableCell>{request.profiles?.full_name || request.profiles?.email || 'Unknown'}</TableCell>
                                    <TableCell>{getStatusBadge(request.status || 'unknown')}</TableCell>
                                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>{request.due_date ? new Date(request.due_date).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewRequest(request.id)}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
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