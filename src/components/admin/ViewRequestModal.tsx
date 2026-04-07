import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/apiClient';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, User, Clock, Loader2 } from 'lucide-react';

interface ViewRequestModalProps {
    requestId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface LineItem {
    id?: string;
    name: string;
    category?: string;
    serial_number?: string | null;
    quantity: number;
    status?: string;
}

interface RequestData {
    id: string;
    status?: string;
    created_at: string;
    due_date?: string | null;
    admin_notes?: string | null;
    profiles?: { full_name?: string; email?: string };
    lineItems?: LineItem[];
    gearNames?: string[];
}

export function ViewRequestModal({ requestId, open, onOpenChange }: ViewRequestModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<RequestData | null>(null);
    const [gearItems, setGearItems] = useState<LineItem[]>([]);

    useEffect(() => {
        if (open && requestId) {
            loadRequestDetails(requestId);
        }
    }, [open, requestId]);

    async function loadRequestDetails(id: string) {
        setLoading(true);
        try {
            // Load the request from the API
            const { data: requestData, error: requestError } = await apiGet<{ data: RequestData; error: string | null }>(`/api/requests/${id}`);
            if (requestError) throw new Error(requestError);
            setRequest(requestData);

            // Load gear items if there are any
            if (Array.isArray(requestData?.lineItems) && requestData.lineItems.length > 0) {
                // Use pre-aggregated line items from API (with quantities)
                setGearItems(requestData.lineItems);
            } else {
                setGearItems([]);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to load request details';
            toast({
                title: "Error loading request",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        const s = String(status || '').toLowerCase();
        switch (s) {
            case 'new':
                return <Badge variant="outline" className="rounded-full bg-green-500/10 text-green-600 border-green-200">New</Badge>;
            case 'pending':
                return <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-600 border-blue-200">Pending</Badge>;
            case 'approved':
                return <Badge variant="outline" className="rounded-full bg-purple-500/10 text-purple-600 border-purple-200">Approved</Badge>;
            case 'checked_out':
            case 'checked out':
                return <Badge variant="outline" className="rounded-full bg-orange-500/10 text-orange-600 border-orange-200">Checked Out</Badge>;
            case 'returned':
            case 'completed':
                return <Badge variant="outline" className="rounded-full bg-slate-100 text-slate-600 border-slate-200">Returned</Badge>;
            case 'partially_returned':
                return <Badge variant="outline" className="rounded-full bg-yellow-500/10 text-yellow-600 border-yellow-200">Partially Returned</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="rounded-full bg-red-50 text-red-600 border-red-200">Cancelled</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="rounded-full px-3">Rejected</Badge>;
            case 'overdue':
                return <Badge variant="destructive" className="rounded-full px-3">Overdue</Badge>;
            default:
                return <Badge variant="outline" className="rounded-full">{status}</Badge>;
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Request Details</DialogTitle>
                    <DialogDescription>
                        {requestId?.substring(0, 8)}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : request ? (
                    <div className="grid gap-4 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Requestor:</span>
                                <span>{request.profiles?.full_name || request.profiles?.email || 'Unknown'}</span>
                            </div>
                            <div>
                                {getStatusBadge(request.status || '')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Created:</span>
                                <span>{new Date(request.created_at).toLocaleDateString()}</span>
                            </div>

                            {request.due_date && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Due Date:</span>
                                    <span>{new Date(request.due_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Purpose field removed: not present on RequestData */}

                        <Separator />

                        <div>
                            <h3 className="font-medium mb-2">Equipment Requested:</h3>
                            {gearItems.length > 0 ? (
                                <div className="space-y-2">
                                    {gearItems.map(item => (
                                        <div key={item.id || item.name} className="p-2 border rounded-md flex justify-between items-center">
                                            <div>
                                                <div className="font-medium">{item.name}{item.quantity && item.quantity > 1 ? ` x ${item.quantity}` : ''}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {item.category || 'Uncategorized'}{typeof item.serial_number !== 'undefined' ? ` • ${item.serial_number || 'No S/N'}` : ''}
                                                </div>
                                            </div>
                                            {item.status ? getStatusBadge(item.status) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : request.gearNames && request.gearNames.length > 0 ? (
                                <div className="space-y-1">
                                    {request.gearNames.map((n, idx) => (
                                        <div key={idx} className="text-sm">{n}</div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No equipment details available</div>
                            )}
                        </div>

                        {request.admin_notes && (
                            <div className="space-y-1">
                                <h3 className="font-medium">Admin Notes:</h3>
                                <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">Request not found or you do not have permission to view it.</div>
                )}

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 