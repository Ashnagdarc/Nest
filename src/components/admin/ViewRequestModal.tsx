import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
import {
    Calendar, User, Clock, Info, AlertTriangle,
    Package, CheckCircle, X, Loader2
} from 'lucide-react';

interface ViewRequestModalProps {
    requestId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ViewRequestModal({ requestId, open, onOpenChange }: ViewRequestModalProps) {
    const supabase = createClient();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [request, setRequest] = useState<any>(null);
    const [gearItems, setGearItems] = useState<any[]>([]);

    useEffect(() => {
        if (open && requestId) {
            loadRequestDetails(requestId);
        }
    }, [open, requestId]);

    async function loadRequestDetails(id: string) {
        setLoading(true);
        try {
            // Load the request
            const { data: requestData, error: requestError } = await supabase
                .from('gear_requests')
                .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `)
                .eq('id', id)
                .single();

            if (requestError) throw requestError;
            setRequest(requestData);

            // Load gear items if there are any
            if (requestData?.gear_ids && requestData.gear_ids.length > 0) {
                const { data: gearData, error: gearError } = await supabase
                    .from('gears')
                    .select('*')
                    .in('id', requestData.gear_ids);

                if (gearError) throw gearError;
                setGearItems(gearData || []);
            }
        } catch (error: any) {
            toast({
                title: "Error loading request",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (String(status || '').toLowerCase()) {
            case 'new':
                return <Badge className="bg-green-500">New</Badge>;
            case 'pending':
                return <Badge className="bg-blue-500">Pending</Badge>;
            case 'approved':
                return <Badge className="bg-purple-500">Approved</Badge>;
            case 'checked_out':
                return <Badge className="bg-orange-500">Checked Out</Badge>;
            case 'returned':
                return <Badge className="bg-gray-500">Returned</Badge>;
            case 'partially_returned':
                return <Badge className="bg-yellow-500">Partially Returned</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-500">Cancelled</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500">Rejected</Badge>;
            case 'overdue':
                return <Badge className="bg-red-500">Overdue</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Request Details</DialogTitle>
                    <DialogDescription>
                        {requestId && requestId.substring(0, 8)}
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
                                {getStatusBadge(request.status)}
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

                        {request.purpose && (
                            <div className="space-y-1">
                                <h3 className="font-medium">Purpose:</h3>
                                <p className="text-sm text-muted-foreground">{request.purpose}</p>
                            </div>
                        )}

                        <Separator />

                        <div>
                            <h3 className="font-medium mb-2">Equipment Requested:</h3>
                            {gearItems.length > 0 ? (
                                <div className="space-y-2">
                                    {gearItems.map(item => (
                                        <div key={item.id} className="p-2 border rounded-md flex justify-between items-center">
                                            <div>
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {item.category || 'Uncategorized'} • {item.serial_number || 'No S/N'}
                                                </div>
                                            </div>
                                            {getStatusBadge(item.status)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No equipment details available
                                </div>
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
                    <div className="py-8 text-center text-muted-foreground">
                        Request not found or you don't have permission to view it.
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 