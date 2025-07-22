import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface GearRequest {
    id: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
    gearNames: string[];
    requestDate: Date;
    status: string;
    updatedAt?: Date;
}

interface RequestTableProps {
    requests: GearRequest[];
    loading: boolean;
    selectedRequests: string[];
    setSelectedRequests: (ids: string[]) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onView: (req: GearRequest) => void;
    isProcessing: boolean;
    getStatusBadge: (status: string) => React.ReactNode;
}

const RequestTable: React.FC<RequestTableProps> = ({
    requests, loading, selectedRequests, setSelectedRequests,
    onApprove, onReject, onView, isProcessing, getStatusBadge
}) => {
    // Mobile: card/list view
    return (
        <div className="sm:hidden space-y-3">
            {loading ? (
                <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : requests.length === 0 ? null : (
                requests.map(req => (
                    <div key={req.id} className="rounded-lg border bg-background p-3 flex flex-col gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={selectedRequests.includes(req.id)}
                                onCheckedChange={checked => {
                                    if (checked) setSelectedRequests([...selectedRequests, req.id]);
                                    else setSelectedRequests(selectedRequests.filter(id => id !== req.id));
                                }}
                                aria-label={`Select request ${req.id}`}
                            />
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={req.avatarUrl || undefined} alt={req.userName} />
                                <AvatarFallback>{req.userName?.[0] || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-medium leading-tight">{req.userName}</span>
                                {req.userEmail && (
                                    <a href={`mailto:${req.userEmail}`} className="text-xs text-blue-600 hover:underline">{req.userEmail}</a>
                                )}
                            </div>
                            <div className="ml-auto">{getStatusBadge(req.status)}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 text-xs">
                            {req.gearNames.map((gear, idx) => (
                                <Badge key={idx} variant="outline">{gear}</Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(req.requestDate, 'MMM d, yyyy')}</span>
                            <span>{format(req.requestDate, 'h:mm a')}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                            {req.status.toLowerCase() === 'pending' && (
                                <>
                                    <Button size="sm" onClick={() => onApprove(req.id)} disabled={isProcessing} className="bg-green-600 text-white">Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => onReject(req.id)} disabled={isProcessing}>Reject</Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => onView(req)}>View</Button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default RequestTable; 