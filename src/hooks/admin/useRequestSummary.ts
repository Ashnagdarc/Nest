"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";

export interface RequestSummary {
    total: number;
    pending: number;
    approved: number;
    checkedOut: number;
    rejected: number;
}

const EMPTY: RequestSummary = {
    total: 0,
    pending: 0,
    approved: 0,
    checkedOut: 0,
    rejected: 0,
};

async function fetchStatusTotal(status?: string): Promise<number> {
    const params = new URLSearchParams({ page: "1", pageSize: "1" });
    if (status) params.set("status", status);
    const response = await apiGet<{ total?: number; error: string | null }>(`/api/requests?${params}`);
    if (response.error) return 0;
    return response.total ?? 0;
}

export function useRequestSummary(refreshKey = 0) {
    const [summary, setSummary] = useState<RequestSummary>(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const [total, pending, approved, checkedOut, rejected] = await Promise.all([
                    fetchStatusTotal(),
                    fetchStatusTotal("Pending"),
                    fetchStatusTotal("Approved"),
                    fetchStatusTotal("Checked Out"),
                    fetchStatusTotal("Rejected"),
                ]);

                if (!cancelled) {
                    setSummary({ total, pending, approved, checkedOut, rejected });
                }
            } catch {
                if (!cancelled) setSummary(EMPTY);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return { summary, loading };
}
