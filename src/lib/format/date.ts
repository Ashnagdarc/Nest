import { format, isToday, isYesterday, parseISO, subDays } from "date-fns";

/** Local calendar date as YYYY-MM-DD (stable grouping key). */
export function toLocalYmd(dateValue: string | Date): string {
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-CA");
}

export function formatDayGroupLabel(ymd: string): string {
    const today = toLocalYmd(new Date());
    const yesterday = toLocalYmd(subDays(new Date(), 1));
    if (ymd === today) return "Today";
    if (ymd === yesterday) return "Yesterday";

    try {
        return format(parseISO(ymd), "EEEE, MMM d");
    } catch {
        return ymd;
    }
}

export function formatShortDate(dateValue: string): string {
    try {
        const d = dateValue.includes("T") ? new Date(dateValue) : parseISO(dateValue);
        if (Number.isNaN(d.getTime())) return dateValue;
        if (isToday(d)) return "Today";
        if (isYesterday(d)) return "Yesterday";
        return format(d, "MMM d, yyyy");
    } catch {
        return dateValue;
    }
}

export function formatRelativeTimeAgo(timestamp: string): string {
    const when = new Date(timestamp);
    if (Number.isNaN(when.getTime())) return "";

    const seconds = (Date.now() - when.getTime()) / 1000;
    if (seconds < 0) return "just now";
    if (seconds < 60) return `${Math.round(seconds)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
    if (seconds < 604_800) return `${Math.round(seconds / 86_400)}d ago`;
    return formatShortDate(timestamp);
}
