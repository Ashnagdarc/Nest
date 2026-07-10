"use client";

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '@/lib/apiClient';

export interface UserSummary {
    total: number;
    admins: number;
    active: number;
    inactive: number;
}

const EMPTY_SUMMARY: UserSummary = {
    total: 0,
    admins: 0,
    active: 0,
    inactive: 0,
};

export function useUserSummary(refreshKey = 0) {
    const [summary, setSummary] = useState<UserSummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiGet<UserSummary & { error?: string | null }>('/api/users/summary');
            if (result.error) throw new Error(result.error);
            setSummary({
                total: result.total ?? 0,
                admins: result.admins ?? 0,
                active: result.active ?? 0,
                inactive: result.inactive ?? 0,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load user summary';
            setError(message);
            setSummary(EMPTY_SUMMARY);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary, refreshKey]);

    return { summary, loading, error, refetch: fetchSummary };
}
