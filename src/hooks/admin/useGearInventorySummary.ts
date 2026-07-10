"use client";

import { useEffect, useState } from "react";
import { gearQueries } from "@/lib/api/queries";
import type { GearInventorySummary } from "@/lib/gear/inventory-stats";

export type { GearInventorySummary };

const EMPTY_SUMMARY: GearInventorySummary = {
    total: 0,
    available: 0,
    checkedOut: 0,
    maintenance: 0,
};

export function useGearInventorySummary(refreshKey = 0) {
    const [summary, setSummary] = useState<GearInventorySummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadSummary() {
            setLoading(true);
            try {
                const response = await gearQueries.getInventorySummary();
                if (cancelled) return;

                if (response.error || !response.data) {
                    setSummary(EMPTY_SUMMARY);
                    return;
                }

                setSummary(response.data);
            } catch {
                if (!cancelled) setSummary(EMPTY_SUMMARY);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadSummary();

        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    return { summary, loading };
}
