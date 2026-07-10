import { AlertCircle, CheckCircle2, Clock, XCircle, type LucideIcon } from "lucide-react";

export interface BookingStatusConfig {
    label: string;
    className: string;
    icon: LucideIcon;
}

export function getBookingStatusConfig(status: string): BookingStatusConfig {
    switch (status) {
        case "Approved":
            return {
                label: "Approved",
                className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                icon: CheckCircle2,
            };
        case "Pending":
            return {
                label: "Pending",
                className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
                icon: Clock,
            };
        case "Rejected":
            return {
                label: "Rejected",
                className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                icon: XCircle,
            };
        case "Cancelled":
            return {
                label: "Cancelled",
                className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                icon: AlertCircle,
            };
        case "Completed":
            return {
                label: "Completed",
                className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                icon: CheckCircle2,
            };
        default:
            return {
                label: status,
                className: "bg-muted text-muted-foreground",
                icon: AlertCircle,
            };
    }
}

export function formatTime12h(hhmm: string | null | undefined): string {
    if (!hhmm) return "";
    const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatTimeRange(
    start?: string | null,
    end?: string | null,
    fallback?: string | null
): string {
    if (start && end) return `${formatTime12h(start)} – ${formatTime12h(end)}`;
    return fallback || "";
}
