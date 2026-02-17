import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Clock, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react";

export interface GearRequest {
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
    processingRequestId: string | null;
    getStatusBadge: (status: string) => React.ReactNode;
}

const RequestTable: React.FC<RequestTableProps> = ({
    requests, loading, selectedRequests, setSelectedRequests,
    onApprove, onReject, onView, isProcessing, processingRequestId, getStatusBadge
}) => {
    if (loading) return <div className="p-20 text-center text-muted-foreground animate-pulse">Loading data...</div>;
    if (requests.length === 0) return null;

    const totalItems = (names: string[]) => {
        let total = 0;
        for (const n of names) {
            const m = n.match(/ x (\d+)$/);
            total += m ? Number(m[1]) : 1;
        }
        return total;
    };

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow className="border-none hover:bg-transparent px-4">
                        <TableHead className="w-12 h-14">
                            <Checkbox
                                checked={selectedRequests.length === requests.length && requests.length > 0}
                                onCheckedChange={(checked) => {
                                    if (checked) setSelectedRequests(requests.map(req => req.id));
                                    else setSelectedRequests([]);
                                }}
                                className="rounded-md border-muted-foreground/30"
                            />
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 h-16">User</TableHead>
                        <TableHead className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 h-16">Items & Gear</TableHead>
                        <TableHead className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 h-16">Timeline</TableHead>
                        <TableHead className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 h-16">Status</TableHead>
                        <TableHead className="text-xs uppercase tracking-widest font-bold text-muted-foreground/60 h-16 text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map(req => {
                        const isSelected = selectedRequests.includes(req.id);
                        return (
                            <TableRow
                                key={req.id}
                                className={`group border-b border-border/40 transition-all ${isSelected ? 'bg-primary/5' : 'hover:bg-accent/5'}`}
                            >
                                <TableCell className="h-16">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={checked => {
                                            if (checked) setSelectedRequests([...selectedRequests, req.id]);
                                            else setSelectedRequests(selectedRequests.filter(id => id !== req.id));
                                        }}
                                        className="rounded-md border-muted-foreground/30"
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                                            <AvatarImage src={req.avatarUrl || undefined} alt={req.userName} />
                                            <AvatarFallback className="bg-accent text-xs font-bold">{req.userName?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-semibold truncate text-foreground/90">{req.userName}</span>
                                            <span className="text-xs text-muted-foreground truncate opacity-70">{req.userEmail}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5 max-w-[300px]">
                                        <div className="flex flex-wrap gap-1.5">
                                            {req.gearNames.slice(0, 3).map((gear, idx) => (
                                                <Badge key={idx} variant="outline" className="text-xs bg-accent/10 border-none px-2.5 py-1 font-medium text-foreground/80">
                                                    {gear}
                                                </Badge>
                                            ))}
                                            {req.gearNames.length > 3 && (
                                                <span className="text-xs text-muted-foreground font-medium flex items-center">
                                                    +{req.gearNames.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground/50 transition-opacity group-hover:opacity-100 opacity-0">
                                            Total: {totalItems(req.gearNames)} units
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{format(req.requestDate, 'MMM d, yyyy')}</span>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                            <Clock className="h-3.5 w-3.5 opacity-50" />
                                            {format(req.requestDate, 'h:mm a')}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(req.status)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2 pr-2">
                                        {req.status.toLowerCase() === 'pending' && (
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 rounded-full text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                    onClick={() => onApprove(req.id)}
                                                    disabled={isProcessing}
                                                >
                                                    {processingRequestId === req.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 rounded-full text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                    onClick={() => onReject(req.id)}
                                                    disabled={isProcessing}
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onView(req)}
                                            className="rounded-full h-9 px-4 text-sm font-semibold gap-2 transition-all hover:bg-accent/10"
                                        >
                                            View
                                            <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default RequestTable;