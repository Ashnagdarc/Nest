"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getRequestStatusConfig } from "@/components/admin/requests/request-status";
import { RequestRowActions } from "@/components/admin/requests/RequestRowActions";
import { cn } from "@/lib/utils";

export interface GearRequest {
    id: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
    gearNames: string[];
    requestDate: Date;
    status: string;
    destination?: string;
    duration?: string;
    submittedByName?: string | null;
    isOnBehalfBooking?: boolean;
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
}

function countGearUnits(names: string[]): number {
    return names.reduce((sum, name) => {
        const match = name.match(/ x (\d+)$/);
        return sum + (match ? Number(match[1]) : 1);
    }, 0);
}

function RequestStatusBadge({ status }: { status: string }) {
    const config = getRequestStatusConfig(status);
    const Icon = config.icon;
    return (
        <Badge variant="secondary" className={cn("gap-1 border-0 font-normal", config.className)}>
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}

export default function RequestTable({
    requests,
    loading,
    selectedRequests,
    setSelectedRequests,
    onApprove,
    onReject,
    onView,
    isProcessing,
    processingRequestId,
}: RequestTableProps) {
    if (loading) return null;

    const allSelected = selectedRequests.length === requests.length && requests.length > 0;

    return (
        <TooltipProvider delayDuration={300}>
            {/* Mobile */}
            <div className="divide-y md:hidden">
                {requests.map((req) => (
                    <RequestMobileCard
                        key={req.id}
                        request={req}
                        selected={selectedRequests.includes(req.id)}
                        onSelect={(checked) => {
                            if (checked) setSelectedRequests([...selectedRequests, req.id]);
                            else setSelectedRequests(selectedRequests.filter((id) => id !== req.id));
                        }}
                        onApprove={() => onApprove(req.id)}
                        onReject={() => onReject(req.id)}
                        onView={() => onView(req)}
                        isProcessing={isProcessing}
                        processingRequestId={processingRequestId}
                    />
                ))}
            </div>

            {/* Desktop */}
            <div className="hidden max-h-[min(70vh,720px)] overflow-auto md:block">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-12 pl-4">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedRequests(requests.map((r) => r.id));
                                        else setSelectedRequests([]);
                                    }}
                                    aria-label="Select all requests on page"
                                />
                            </TableHead>
                            <TableHead className="min-w-[200px]">Requester</TableHead>
                            <TableHead className="min-w-[240px]">Equipment</TableHead>
                            <TableHead className="min-w-[120px]">Submitted</TableHead>
                            <TableHead className="min-w-[120px]">Status</TableHead>
                            <TableHead className="min-w-[220px] pr-4 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req) => {
                            const isPending = req.status.toLowerCase() === "pending";
                            const isSelected = selectedRequests.includes(req.id);
                            const unitCount = countGearUnits(req.gearNames);

                            return (
                                <TableRow
                                    key={req.id}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                                    )}
                                    onClick={() => onView(req)}
                                >
                                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedRequests([...selectedRequests, req.id]);
                                                else setSelectedRequests(selectedRequests.filter((id) => id !== req.id));
                                            }}
                                            aria-label={`Select request from ${req.userName}`}
                                        />
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <RequesterCell request={req} />
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <GearListCell names={req.gearNames} unitCount={unitCount} />
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-medium">{format(req.requestDate, "MMM d, yyyy")}</p>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {format(req.requestDate, "h:mm a")}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                        <RequestStatusBadge status={req.status} />
                                    </TableCell>
                                    <TableCell className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <RequestRowActions
                                            isPending={isPending}
                                            isProcessing={isProcessing}
                                            isThisProcessing={processingRequestId === req.id}
                                            onApprove={() => onApprove(req.id)}
                                            onReject={() => onReject(req.id)}
                                            onView={() => onView(req)}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}

function RequesterCell({ request }: { request: GearRequest }) {
    return (
        <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border">
                <AvatarImage src={request.avatarUrl || undefined} alt={request.userName} />
                <AvatarFallback className="text-xs font-semibold">
                    {request.userName?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate font-medium">{request.userName}</p>
                {request.userEmail && (
                    <p className="truncate text-xs text-muted-foreground">{request.userEmail}</p>
                )}
                {request.isOnBehalfBooking && request.submittedByName && (
                    <p className="mt-0.5 truncate text-[11px] text-blue-600 dark:text-blue-400">
                        Booked by {request.submittedByName}
                    </p>
                )}
            </div>
        </div>
    );
}

function GearListCell({ names, unitCount }: { names: string[]; unitCount: number }) {
    return (
        <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1">
                {names.slice(0, 2).map((gear, idx) => (
                    <Badge key={idx} variant="outline" className="max-w-[200px] truncate text-xs font-normal">
                        {gear}
                    </Badge>
                ))}
                {names.length > 2 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                        +{names.length - 2} more
                    </Badge>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                {names.length} item{names.length === 1 ? "" : "s"} · {unitCount} unit{unitCount === 1 ? "" : "s"}
            </p>
        </div>
    );
}

function RequestMobileCard({
    request,
    selected,
    onSelect,
    onApprove,
    onReject,
    onView,
    isProcessing,
    processingRequestId,
}: {
    request: GearRequest;
    selected: boolean;
    onSelect: (checked: boolean) => void;
    onApprove: () => void;
    onReject: () => void;
    onView: () => void;
    isProcessing: boolean;
    processingRequestId: string | null;
}) {
    const isPending = request.status.toLowerCase() === "pending";
    const unitCount = countGearUnits(request.gearNames);

    return (
        <div className={cn("flex flex-col gap-3 p-4 sm:flex-row", selected && "bg-primary/5")}>
            <div className="flex gap-3">
                <div className="pt-1">
                    <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(checked === true)} />
                </div>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={onView}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                        <RequesterCell request={request} />
                        <RequestStatusBadge status={request.status} />
                    </div>
                    <GearListCell names={request.gearNames} unitCount={unitCount} />
                    <p className="mt-2 text-xs text-muted-foreground">
                        {format(request.requestDate, "MMM d, yyyy · h:mm a")}
                    </p>
                </button>
            </div>
            <RequestRowActions
                compact
                isPending={isPending}
                isProcessing={isProcessing}
                isThisProcessing={processingRequestId === request.id}
                onApprove={onApprove}
                onReject={onReject}
                onView={onView}
            />
        </div>
    );
}
