"use client";

import { useCallback, useEffect, useState } from 'react';
import { subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { AdminReportData } from '@/lib/reports/types';

interface UseReportsResult {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    report: AdminReportData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useReports(): UseReportsResult {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [report, setReport] = useState<AdminReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
            });
            const response = await fetch(`/api/admin/reports?${params.toString()}`);
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `Request failed (${response.status})`);
            }

            setReport(result.data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load report';
            setError(message);
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return {
        dateRange,
        setDateRange,
        report,
        loading,
        error,
        refresh,
    };
}
