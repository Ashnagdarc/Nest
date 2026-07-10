"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";

export interface CheckinSummary {
    pending: number;
    completedToday: number;
    damaged: number;
    total: number;
}

const EMPTY: CheckinSummary = {
    pending: 0,
    completedToday: 0,
    damaged: 0,
    total: 0,
};

export function useCheckinSummary(refreshKey = 0) {
    const [summary, setSummary] = useState<CheckinSummary>(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const response = await apiGet<{
                    data: CheckinSummary | null;
                    error: string | null;
                }>("/api/checkins/summary");

                if (!cancelled) {
                    if (response.error || !response.data) {
                        setSummary(EMPTY);
                    } else {
                        setSummary(response.data);
                    }
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
