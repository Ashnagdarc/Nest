import { CheckCircle, Clock, FileText, Package, XCircle, type LucideIcon } from "lucide-react";

export interface RequestStatusConfig {
    label: string;
    className: string;
    icon: LucideIcon;
}

export function getRequestStatusConfig(status: string): RequestStatusConfig {
    const normalized = status.toLowerCase();

    switch (normalized) {
        case "pending":
            return {
                label: status,
                className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
                icon: Clock,
            };
        case "approved":
            return {
                label: status,
                className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
                icon: CheckCircle,
            };
        case "rejected":
            return {
                label: status,
                className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                icon: XCircle,
            };
        case "checked out":
        case "partially checked out":
            return {
                label: status,
                className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
                icon: Package,
            };
        case "checked in":
        case "completed":
            return {
                label: status,
                className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                icon: CheckCircle,
            };
        case "overdue":
            return {
                label: status,
                className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                icon: Clock,
            };
        default:
            return {
                label: status,
                className: "bg-muted text-muted-foreground",
                icon: FileText,
            };
    }
}
