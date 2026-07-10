import { eachDayOfInterval, format, startOfDay } from 'date-fns';
import type { ReportTrendPoint } from '@/lib/reports/types';

export function buildDailyTrendBuckets(from: Date, to: Date): ReportTrendPoint[] {
    const start = startOfDay(from);
    const end = startOfDay(to);

    if (end < start) return [];

    return eachDayOfInterval({ start, end }).map((day) => ({
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, 'MMM d'),
        requests: 0,
        checkins: 0,
        checkouts: 0,
        damages: 0,
    }));
}

export function incrementTrendBucket(
    buckets: ReportTrendPoint[],
    isoDate: string | null | undefined,
    field: keyof Pick<ReportTrendPoint, 'requests' | 'checkins' | 'checkouts' | 'damages'>
) {
    if (!isoDate) return;
    const key = format(new Date(isoDate), 'yyyy-MM-dd');
    const bucket = buckets.find((item) => item.date === key);
    if (bucket) bucket[field] += 1;
}

export function normalizeRequestStatus(status: string | null | undefined): string {
    const value = String(status || 'Unknown').trim();
    if (/pending/i.test(value)) return 'Pending';
    if (/approve/i.test(value)) return 'Approved';
    if (/reject/i.test(value)) return 'Rejected';
    if (/complete/i.test(value)) return 'Completed';
    if (/cancel/i.test(value)) return 'Cancelled';
    return value;
}

export function isCheckoutAction(action: string | null | undefined): boolean {
    return /check\s*out/i.test(String(action || ''));
}

export function isCheckinAction(action: string | null | undefined): boolean {
    const value = String(action || '');
    return /check\s*in/i.test(value) || /return/i.test(value);
}

export function isDamagedCondition(condition: string | null | undefined, damageNotes?: string | null): boolean {
    if (damageNotes?.trim()) return true;
    return /damage/i.test(String(condition || ''));
}
