/**
 * Request Table Component
 * 
 * Displays gear requests in a table format with actions.
 * Handles request data display and view actions.
 * 
 * @component
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from './RequestStatusBadge';

interface RequestItem {
    id: string;
    status: string;
    created_at: string;
    due_date?: string;
    profiles?: {
        full_name?: string;
        email?: string;
    };
}

interface RequestTableProps {
    requests: RequestItem[];
    onViewRequest: (requestId: string) => void;
}

export function RequestTable({ requests, onViewRequest }: RequestTableProps) {
    if (requests.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No requests found
            </div>
        );
    }

    return (
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
                    {requests.map(request => (
                        <TableRow key={request.id}>
                            <TableCell className="font-medium">
                                {request.id?.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                                {request.profiles?.full_name || request.profiles?.email || 'Unknown'}
                            </TableCell>
                            <TableCell>
                                <RequestStatusBadge status={request.status || 'unknown'} />
                            </TableCell>
                            <TableCell>
                                {new Date(request.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                                {request.due_date ? new Date(request.due_date).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onViewRequest(request.id)}
                                >
                                    View
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 