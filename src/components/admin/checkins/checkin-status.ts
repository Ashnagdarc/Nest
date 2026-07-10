import { AlertTriangle, CheckCircle2, Clock, Package, XCircle, type LucideIcon } from "lucide-react";

export interface CheckinStatusConfig {
    label: string;
    className: string;
    icon: LucideIcon;
}

export function getCheckinStatusConfig(status: string): CheckinStatusConfig {
    const normalized = status.toLowerCase();

    switch (normalized) {
        case "pending admin approval":
            return {
                label: "Pending approval",
                className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
                icon: Clock,
            };
        case "completed":
            return {
                label: "Completed",
                className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                icon: CheckCircle2,
            };
        case "rejected":
            return {
                label: "Rejected",
                className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                icon: XCircle,
            };
        default:
            return {
                label: status,
                className: "bg-muted text-muted-foreground",
                icon: Package,
            };
    }
}

export function getConditionConfig(condition: string) {
    const normalized = condition.toLowerCase();

    switch (normalized) {
        case "damaged":
            return {
                label: "Damaged",
                className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                icon: AlertTriangle,
            };
        case "needs repair":
            return {
                label: "Needs repair",
                className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                icon: AlertTriangle,
            };
        case "good":
        default:
            return {
                label: condition || "Good",
                className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                icon: CheckCircle2,
            };
    }
}
