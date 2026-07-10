"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiGet } from "@/lib/apiClient";
import { ListSkeleton } from "@/components/dashboard/ListSkeleton";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RequestFilters from "@/components/admin/requests/RequestFilters";
import RequestTable from "@/components/admin/requests/RequestTable";
import { RequestPageHeader } from "@/components/admin/requests/RequestPageHeader";
import { RequestStatsCards } from "@/components/admin/requests/RequestStatsCards";
import { ViewRequestModal } from "@/components/admin/ViewRequestModal";
import { useRequestSummary } from "@/hooks/admin/useRequestSummary";

const NOTIFICATION_SOUND_URL = "/sounds/notification-bell.mp3";
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface GearRequest {
    id: string;
    userName: string;
    userEmail?: string;
    avatarUrl?: string;
    userId: string;
    submittedByName?: string | null;
    submittedByEmail?: string | null;
    submittedByUserId?: string | null;
    isOnBehalfBooking: boolean;
    gearNames: string[];
    requestDate: Date;
    duration: string;
    reason?: string;
    destination?: string;
    status: string;
    adminNotes?: string | null;
    checkoutDate?: Date | null;
    dueDate?: Date | null;
    checkinDate?: Date | null;
    teamMembers?: string | null;
    gear_request_gears?: unknown[];
}

const useDebouncedSearch = (value: string, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

function ManageRequestsContent() {
    const { toast } = useToast();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const [requests, setRequests] = useState<GearRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<GearRequest | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const [requestToReject, setRequestToReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [userFilter, setUserFilter] = useState("all");
    const [gearFilter, setGearFilter] = useState("all");
    const [keyword, setKeyword] = useState("");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);

    const debouncedKeyword = useDebouncedSearch(keyword, 300);
    const { summary, loading: summaryLoading } = useRequestSummary(summaryRefreshKey);

    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        const saved = localStorage.getItem("nestbyeden.appSoundEnabled");
        if (saved !== null) setSoundEnabled(saved === "true");
    }, []);

    useEffect(() => {
        localStorage.setItem("nestbyeden.appSoundEnabled", soundEnabled.toString());
    }, [soundEnabled]);

    useEffect(() => {
        setPage(1);
    }, [filterStatus, debouncedKeyword, pageSize]);

    const extractGearNames = useCallback((request: Record<string, unknown>): string[] => {
        const lines = request.gear_request_gears;
        if (!Array.isArray(lines) || lines.length === 0) return [];
        return lines.map((item: Record<string, unknown>) => {
            const gears = item.gears as Record<string, unknown> | undefined;
            const name = (gears?.name as string) || "Unknown gear";
            const qty = Number(item.quantity) > 1 ? ` x ${item.quantity}` : "";
            return `${name}${qty}`;
        });
    }, []);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        setIsRefreshing(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("pageSize", String(pageSize));
            if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);

            const response = await apiGet<{ data: Record<string, unknown>[]; total: number; error: string | null }>(
                `/api/requests?${params.toString()}`
            );
            if (response.error) throw new Error(response.error);

            const processed = response.data.map((request) => {
                const gearNames = extractGearNames(request);
                const ownerName = (request.profiles as { full_name?: string } | undefined)?.full_name || "User";
                const firstName = ownerName.split(" ")[0] || ownerName;
                const submittedBy = request.submitted_by as { id?: string; full_name?: string; email?: string } | null;
                const isOnBehalfBooking = Boolean(submittedBy?.id && submittedBy.id !== request.user_id);

                return {
                    id: request.id as string,
                    userName: firstName,
                    userEmail: (request.profiles as { email?: string } | undefined)?.email,
                    avatarUrl: (request.profiles as { avatar_url?: string } | undefined)?.avatar_url,
                    userId: request.user_id as string,
                    submittedByName: isOnBehalfBooking ? submittedBy?.full_name : null,
                    submittedByEmail: isOnBehalfBooking ? submittedBy?.email : null,
                    submittedByUserId: isOnBehalfBooking ? submittedBy?.id : null,
                    isOnBehalfBooking,
                    gearNames,
                    requestDate: new Date(request.created_at as string),
                    duration: (request.expected_duration as string) || "Not specified",
                    reason: (request.reason as string) || "Not specified",
                    destination: (request.destination as string) || "Not specified",
                    status: (request.status as string) || "Pending",
                    adminNotes: (request.admin_notes as string | null) ?? null,
                    checkoutDate: request.checkout_date ? new Date(request.checkout_date as string) : null,
                    dueDate: request.due_date ? new Date(request.due_date as string) : null,
                    checkinDate: request.checkin_date ? new Date(request.checkin_date as string) : null,
                    teamMembers: (request.team_members as string | null) ?? null,
                    gear_request_gears: request.gear_request_gears,
                };
            });

            setRequests(processed);
            setTotal(response.total || 0);
            setSummaryRefreshKey((key) => key + 1);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to load requests";
            setFetchError(message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [page, pageSize, filterStatus, extractGearNames]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    const forceRefresh = () => {
        setPage(1);
        void fetchRequests();
    };

    const handleApprove = async (requestId: string) => {
        if (isProcessing || processingRequestId) return;

        setIsProcessing(true);
        setProcessingRequestId(requestId);

        try {
            const resp = await fetch("/api/requests/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId }),
            });
            const result = await resp.json();
            if (!resp.ok || !result.success) {
                throw new Error(result?.user_message || result?.error || "Approval failed");
            }

            toast({ title: "Approved", description: result?.user_message || "Request approved successfully." });
            if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => undefined);
            void fetchRequests();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Approval failed";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setProcessingRequestId(null);
        }
    };

    const handleReject = async () => {
        if (!requestToReject || !rejectionReason.trim()) return;
        setIsProcessing(true);
        try {
            const resp = await fetch("/api/requests/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: requestToReject, reason: rejectionReason }),
            });
            const result = await resp.json().catch(() => null);
            if (!resp.ok || !result?.success) {
                throw new Error(result?.user_message || result?.error || "Rejection failed");
            }
            toast({ title: "Rejected", description: result?.user_message || "Request has been rejected." });
            setRequestToReject(null);
            setRejectionReason("");
            void fetchRequests();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Rejection failed";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredRequests = useMemo(() => {
        let filtered = requests;

        if (userFilter !== "all") {
            const needle = userFilter.toLowerCase();
            filtered = filtered.filter((r) => r.userName.toLowerCase().includes(needle));
        }

        if (gearFilter !== "all") {
            const needle = gearFilter.toLowerCase();
            filtered = filtered.filter((r) => r.gearNames.some((g) => g.toLowerCase().includes(needle)));
        }

        if (debouncedKeyword) {
            const needle = debouncedKeyword.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.userName.toLowerCase().includes(needle) ||
                    r.userEmail?.toLowerCase().includes(needle) ||
                    r.reason?.toLowerCase().includes(needle) ||
                    r.destination?.toLowerCase().includes(needle) ||
                    r.gearNames.some((g) => g.toLowerCase().includes(needle))
            );
        }

        if (dateRange?.from) {
            const from = startOfDay(dateRange.from);
            const to = endOfDay(dateRange.to ?? dateRange.from);
            filtered = filtered.filter((r) => isWithinInterval(r.requestDate, { start: from, end: to }));
        }

        return filtered;
    }, [requests, userFilter, gearFilter, debouncedKeyword, dateRange]);

    const uniqueUserNames = useMemo(
        () => Array.from(new Set(requests.map((r) => r.userName))).sort(),
        [requests]
    );
    const uniqueGearNames = useMemo(
        () => Array.from(new Set(requests.flatMap((r) => r.gearNames.map((g) => g.split(" x ")[0])))).sort(),
        [requests]
    );

    const filterChips = useMemo(() => {
        const chips: { label: string; onRemove: () => void }[] = [];
        if (filterStatus !== "all") {
            chips.push({ label: `Status: ${filterStatus}`, onRemove: () => setFilterStatus("all") });
        }
        if (keyword) {
            chips.push({ label: `Search: "${keyword}"`, onRemove: () => setKeyword("") });
        }
        if (userFilter !== "all") {
            chips.push({ label: `User: ${userFilter}`, onRemove: () => setUserFilter("all") });
        }
        if (gearFilter !== "all") {
            chips.push({ label: `Gear: ${gearFilter}`, onRemove: () => setGearFilter("all") });
        }
        if (dateRange?.from) {
            const label = dateRange.to
                ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d")}`
                : format(dateRange.from, "MMM d, yyyy");
            chips.push({ label: `Date: ${label}`, onRemove: () => setDateRange(undefined) });
        }
        return chips;
    }, [filterStatus, keyword, userFilter, gearFilter, dateRange]);

    const hasActiveFilters =
        filterStatus !== "all" ||
        keyword !== "" ||
        userFilter !== "all" ||
        gearFilter !== "all" ||
        Boolean(dateRange?.from);

    const handleClearAllFilters = () => {
        setFilterStatus("all");
        setKeyword("");
        setUserFilter("all");
        setGearFilter("all");
        setDateRange(undefined);
    };

    const downloadRequestsCSV = () => {
        const headers = ["User", "Email", "Gear", "Date", "Status", "Reason", "Destination"];
        const rows = filteredRequests.map((r) =>
            [
                r.userName,
                r.userEmail || "",
                r.gearNames.join("; "),
                format(r.requestDate, "yyyy-MM-dd HH:mm"),
                r.status,
                r.reason || "",
                r.destination || "",
            ].join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gear-requests-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
    };

    const downloadRequestsPDF = () => {
        const doc = new jsPDF();
        doc.text("Gear Requests Report", 14, 20);
        const tableData = filteredRequests.map((r) => [
            r.userName,
            r.gearNames.join(", "),
            format(r.requestDate, "MMM dd, yyyy"),
            r.status,
        ]);
        autoTable(doc, {
            head: [["User", "Gear", "Date", "Status"]],
            body: tableData,
            startY: 25,
        });
        doc.save(`gear-requests-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 pb-8"
        >
            <RequestPageHeader
                isRefreshing={isRefreshing}
                onRefresh={forceRefresh}
                onExportCsv={downloadRequestsCSV}
                onExportPdf={downloadRequestsPDF}
            />

            <RequestStatsCards summary={summary} loading={summaryLoading} />

            <Card className="overflow-hidden border-border/50 shadow-sm">
                <CardContent className="space-y-4 border-b bg-muted/20 p-4 md:p-6">
                    <RequestFilters
                        userFilter={userFilter}
                        setUserFilter={setUserFilter}
                        gearFilter={gearFilter}
                        setGearFilter={setGearFilter}
                        keyword={keyword}
                        setKeyword={setKeyword}
                        filterStatus={filterStatus}
                        setFilterStatus={setFilterStatus}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        uniqueUserNames={uniqueUserNames}
                        uniqueGearNames={uniqueGearNames}
                        hasActiveFilters={hasActiveFilters}
                        filterChips={filterChips}
                        handleClearAllFilters={handleClearAllFilters}
                    />
                </CardContent>

                <CardContent className="p-0">
                    {fetchError && (
                        <div className="border-b bg-destructive/5 px-4 py-3 text-center text-sm font-medium text-destructive">
                            {fetchError}
                        </div>
                    )}

                    {loading && requests.length === 0 ? (
                        <div className="p-6">
                            <ListSkeleton rows={6} />
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="px-4 py-16 text-center">
                            <p className="font-medium text-foreground">No requests found</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Try adjusting filters or refresh to load the latest queue.
                            </p>
                            {hasActiveFilters && (
                                <Button variant="outline" size="sm" className="mt-4" onClick={handleClearAllFilters}>
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <RequestTable
                            requests={filteredRequests}
                            loading={loading}
                            selectedRequests={selectedRequests}
                            setSelectedRequests={setSelectedRequests}
                            onApprove={handleApprove}
                            onReject={setRequestToReject}
                            onView={(req) => {
                                setSelectedRequest(req as GearRequest);
                                setIsDetailsOpen(true);
                            }}
                            isProcessing={isProcessing}
                            processingRequestId={processingRequestId}
                        />
                    )}
                </CardContent>

                {filteredRequests.length > 0 && (
                    <CardFooter className="border-t bg-muted/10 px-4 py-4">
                        <PaginationFooter
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onPageChange={setPage}
                            pageSizeOptions={PAGE_SIZE_OPTIONS}
                            onPageSizeChange={setPageSize}
                            pageSizeLabel="Rows per page"
                            itemLabel="request"
                            summary={
                                selectedRequests.length > 0
                                    ? `${selectedRequests.length} selected · ${total} total`
                                    : undefined
                            }
                            className="w-full border-0 bg-transparent p-0"
                        />
                    </CardFooter>
                )}
            </Card>

            <AlertDialog
                open={Boolean(requestToReject)}
                onOpenChange={(open) => {
                    if (!open) {
                        setRequestToReject(null);
                        setRejectionReason("");
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a reason so the requester understands why this booking was declined.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Equipment unavailable for those dates..."
                        rows={4}
                        className="resize-none"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void handleReject();
                            }}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isProcessing ? "Rejecting…" : "Reject request"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {selectedRequest?.id && (
                <ViewRequestModal
                    requestId={selectedRequest.id}
                    initialRequest={selectedRequest}
                    open={isDetailsOpen}
                    onOpenChange={(open) => {
                        setIsDetailsOpen(open);
                        if (!open) setSelectedRequest(null);
                    }}
                />
            )}
        </motion.div>
    );
}

export default function ManageRequestsPage() {
    return (
        <Suspense
            fallback={
                <div className="p-8">
                    <ListSkeleton rows={6} />
                </div>
            }
        >
            <ManageRequestsContent />
        </Suspense>
    );
}
