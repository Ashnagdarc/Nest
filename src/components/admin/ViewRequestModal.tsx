"use client";

import { useState, useEffect, useMemo, type ComponentType } from "react";
import { format } from "date-fns";
import { apiGet } from "@/lib/apiClient";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
    Calendar,
    Clock,
    Loader2,
    MapPin,
    Package,
    StickyNote,
    User,
    Users,
} from "lucide-react";
import { getRequestStatusConfig } from "@/components/admin/requests/request-status";
import { cn } from "@/lib/utils";

export interface AdminRequestPreview {
    id: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
    gearNames: string[];
    requestDate: Date;
    duration?: string;
    reason?: string;
    destination?: string;
    status: string;
    adminNotes?: string | null;
    checkoutDate?: Date | null;
    dueDate?: Date | null;
    checkinDate?: Date | null;
    teamMembers?: string | null;
    submittedByName?: string | null;
    submittedByEmail?: string | null;
    isOnBehalfBooking?: boolean;
    gear_request_gears?: unknown[];
}

interface ViewRequestModalProps {
    requestId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialRequest?: AdminRequestPreview | null;
}

interface GearLineItem {
    id: string;
    name: string;
    category?: string;
    serial_number?: string | null;
    quantity: number;
    status?: string;
}

type GearRequestGearLine = {
    quantity?: number;
    gears?: {
        id?: string;
        name?: string;
        category?: string;
        serial_number?: string | null;
        status?: string;
    };
};

function formatDate(value?: Date | string | null) {
    if (!value) return "—";
    try {
        return format(new Date(value), "MMM d, yyyy");
    } catch {
        return "—";
    }
}

function formatDateTime(value?: Date | string | null) {
    if (!value) return "—";
    try {
        return format(new Date(value), "MMM d, yyyy · h:mm a");
    } catch {
        return "—";
    }
}

function statusAccentClass(status: string) {
    const normalized = status.toLowerCase();
    switch (normalized) {
        case "pending":
            return "from-amber-500/80 to-amber-500/20";
        case "approved":
        case "checked out":
        case "partially checked out":
            return "from-emerald-500/80 to-emerald-500/20";
        case "rejected":
        case "cancelled":
            return "from-rose-500/80 to-rose-500/20";
        case "completed":
        case "checked in":
            return "from-slate-500/80 to-slate-500/20";
        case "overdue":
            return "from-red-500/80 to-red-500/20";
        default:
            return "from-primary/80 to-primary/20";
    }
}

function buildGearItems(gearNames: string[], gearRequestGears?: unknown[]): GearLineItem[] {
    if (Array.isArray(gearRequestGears) && gearRequestGears.length > 0) {
        return gearRequestGears
            .map((raw, index) => {
                const item = raw as GearRequestGearLine;
                const gears = item.gears;
                if (!gears?.name) return null;
                return {
                    id: gears.id || `gear-${index}`,
                    name: gears.name,
                    category: gears.category,
                    serial_number: gears.serial_number,
                    quantity: Math.max(1, Number(item.quantity ?? 1)),
                    status: gears.status,
                };
            })
            .filter((item): item is GearLineItem => item !== null);
    }

    return gearNames.map((entry, index) => {
        const match = entry.match(/^(.+?)(?: x (\d+))?$/);
        return {
            id: `name-${index}`,
            name: match?.[1]?.trim() || entry,
            quantity: match?.[2] ? Number(match[2]) : 1,
        };
    });
}

function DetailTile({
    icon: Icon,
    label,
    value,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
            </div>
            <p className="text-sm font-medium leading-snug text-foreground">{value}</p>
        </div>
    );
}

function PersonTile({
    label,
    name,
    email,
    avatarUrl,
}: {
    label: string;
    name: string;
    email?: string | null;
    avatarUrl?: string;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
            <Avatar className="h-9 w-9 shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {name.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{name}</p>
                {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
            </div>
        </div>
    );
}

function RequestDetailsSkeleton() {
    return (
        <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
        </div>
    );
}

export function ViewRequestModal({ requestId, open, onOpenChange, initialRequest }: ViewRequestModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [gearItems, setGearItems] = useState<GearLineItem[]>([]);
    const [adminNotes, setAdminNotes] = useState<string | null>(null);

    const preview = initialRequest ?? null;
    const hasPreview = Boolean(preview);

    useEffect(() => {
        if (!open) {
            setFetchError(null);
            setGearItems([]);
            setAdminNotes(null);
            return;
        }

        if (initialRequest) {
            setGearItems(buildGearItems(initialRequest.gearNames, initialRequest.gear_request_gears));
            setAdminNotes(initialRequest.adminNotes ?? null);
        }

        if (requestId) {
            void loadRequestDetails(requestId, Boolean(initialRequest));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when dialog opens or request changes
    }, [open, requestId, initialRequest?.id]);

    async function loadRequestDetails(id: string, hasInitialData: boolean) {
        if (hasInitialData) {
            setEnriching(true);
        } else {
            setLoading(true);
        }
        setFetchError(null);

        try {
            const { data: requestData, error: requestError } = await apiGet<{
                data: {
                    admin_notes?: string | null;
                    lineItems?: GearLineItem[];
                    gearNames?: string[];
                    gear_request_gears?: unknown[];
                };
                error: string | null;
            }>(`/api/requests/${id}`);

            if (requestError) throw new Error(requestError);

            if (Array.isArray(requestData?.lineItems) && requestData.lineItems.length > 0) {
                setGearItems(
                    requestData.lineItems.map((item, index) => ({
                        id: item.id || `line-${index}`,
                        name: item.name,
                        category: item.category,
                        serial_number: item.serial_number,
                        quantity: item.quantity,
                        status: item.status,
                    }))
                );
            } else if (requestData?.gear_request_gears || requestData?.gearNames) {
                setGearItems(
                    buildGearItems(requestData.gearNames ?? [], requestData.gear_request_gears)
                );
            }

            if (requestData?.admin_notes !== undefined) {
                setAdminNotes(requestData.admin_notes);
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to load request details";
            setFetchError(message);
            if (!hasInitialData) {
                toast({
                    title: "Error loading request",
                    description: message,
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
            setEnriching(false);
        }
    }

    const status = preview?.status ?? "Unknown";
    const statusConfig = getRequestStatusConfig(status);
    const StatusIcon = statusConfig.icon;

    const itemCount = gearItems.length;
    const unitCount = useMemo(
        () => gearItems.reduce((sum, item) => sum + item.quantity, 0),
        [gearItems]
    );

    if (!open) return null;

    const showContent = hasPreview || (!loading && !fetchError);
    const showFullSkeleton = loading && !hasPreview;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                <div className={cn("h-1.5 w-full bg-gradient-to-r", statusAccentClass(status))} />

                <DialogHeader className="space-y-3 border-b border-border px-6 pb-4 pt-5 text-left">
                    <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl">Request details</DialogTitle>
                            <DialogDescription className="font-mono text-xs">
                                #{requestId?.slice(0, 8) ?? preview?.id.slice(0, 8)}
                            </DialogDescription>
                        </div>
                        <Badge
                            variant="secondary"
                            className={cn("gap-1 border-0 font-normal", statusConfig.className)}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                        </Badge>
                    </div>

                    {preview?.isOnBehalfBooking && preview.submittedByName && (
                        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                            Submitted on behalf of {preview.userName} by {preview.submittedByName}
                        </p>
                    )}
                </DialogHeader>

                {showFullSkeleton ? (
                    <RequestDetailsSkeleton />
                ) : fetchError && !hasPreview ? (
                    <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                        {fetchError}
                    </div>
                ) : showContent && preview ? (
                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <DetailTile
                                icon={Calendar}
                                label="Submitted"
                                value={formatDateTime(preview.requestDate)}
                            />
                            <DetailTile
                                icon={MapPin}
                                label="Destination"
                                value={preview.destination || "Not specified"}
                            />
                            <DetailTile
                                icon={Clock}
                                label="Duration"
                                value={preview.duration || "Not specified"}
                            />
                        </div>

                        {(preview.checkoutDate || preview.dueDate || preview.checkinDate) && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {preview.checkoutDate && (
                                    <DetailTile
                                        icon={Calendar}
                                        label="Checked out"
                                        value={formatDate(preview.checkoutDate)}
                                    />
                                )}
                                {preview.dueDate && (
                                    <DetailTile
                                        icon={Clock}
                                        label="Due date"
                                        value={formatDate(preview.dueDate)}
                                    />
                                )}
                                {preview.checkinDate && (
                                    <DetailTile
                                        icon={Calendar}
                                        label="Checked in"
                                        value={formatDate(preview.checkinDate)}
                                    />
                                )}
                            </div>
                        )}

                        {preview.reason && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Reason
                                </p>
                                <p className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm leading-relaxed">
                                    {preview.reason}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                People
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <PersonTile
                                    label="Equipment for"
                                    name={preview.userName}
                                    email={preview.userEmail}
                                    avatarUrl={preview.avatarUrl}
                                />
                                {preview.isOnBehalfBooking && preview.submittedByName && (
                                    <PersonTile
                                        label="Submitted by"
                                        name={preview.submittedByName}
                                        email={preview.submittedByEmail}
                                    />
                                )}
                                {preview.teamMembers && (
                                    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:col-span-2">
                                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Team members</p>
                                            <p className="text-sm leading-relaxed">{preview.teamMembers}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {adminNotes && (
                            <div className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    <StickyNote className="h-3.5 w-3.5" />
                                    Admin notes
                                </p>
                                <p className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-sm leading-relaxed dark:border-amber-900/40 dark:bg-amber-950/20">
                                    {adminNotes}
                                </p>
                            </div>
                        )}

                        <Separator />

                        <section className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold">Equipment</h4>
                                    {enriching && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                {itemCount > 0 && (
                                    <Badge variant="secondary" className="rounded-full font-normal">
                                        {itemCount} item{itemCount !== 1 ? "s" : ""} · {unitCount} unit
                                        {unitCount !== 1 ? "s" : ""}
                                    </Badge>
                                )}
                            </div>

                            {itemCount > 0 ? (
                                <ScrollArea className="h-[min(280px,40vh)] rounded-xl border border-border">
                                    <div className="divide-y divide-border">
                                        {gearItems.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                                            >
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.category || "Uncategorized"}
                                                        {item.serial_number !== undefined &&
                                                            ` · ${item.serial_number || "No S/N"}`}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="shrink-0 tabular-nums">
                                                    ×{item.quantity}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : enriching ? (
                                <div className="space-y-2 rounded-xl border border-border p-3">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                                    No equipment listed on this request.
                                </div>
                            )}
                        </section>

                        {fetchError && hasPreview && (
                            <p className="text-xs text-muted-foreground">
                                Some details could not be refreshed: {fetchError}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
                        <User className="h-8 w-8 opacity-40" />
                        Request not found or you do not have permission to view it.
                    </div>
                )}

                <DialogFooter className="border-t border-border bg-muted/10 px-6 py-4 sm:justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ViewRequestModal;
