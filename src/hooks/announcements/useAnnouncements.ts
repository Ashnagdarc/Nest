"use client";

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mapAnnouncementRecord, type Announcement, type AnnouncementRecord } from '@/components/announcements/types';

interface AnnouncementsResponse {
    announcements: AnnouncementRecord[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    error?: string;
}

export function useAnnouncements(limit = 50) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReadStatus = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return new Set<string>();

        const { data } = await supabase
            .from('read_announcements')
            .select('announcement_id')
            .eq('user_id', user.id);

        return new Set((data ?? []).map((row) => row.announcement_id));
    }, []);

    const fetchAnnouncements = useCallback(async (options?: { silent?: boolean }) => {
        if (options?.silent) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const [response, readSet] = await Promise.all([
                fetch(`/api/announcements?limit=${limit}&page=1`, { cache: 'no-store' }),
                fetchReadStatus(),
            ]);

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Failed to fetch announcements');
            }

            const payload = (await response.json()) as AnnouncementsResponse;
            const rows = Array.isArray(payload.announcements) ? payload.announcements : [];

            setAnnouncements(rows.map(mapAnnouncementRecord));
            setTotal(payload.pagination?.total ?? rows.length);
            setReadIds(readSet);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch announcements';
            setError(message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchReadStatus, limit]);

    useEffect(() => {
        void fetchAnnouncements();
    }, [fetchAnnouncements]);

    const markAsRead = useCallback(async (announcementId: string) => {
        if (readIds.has(announcementId)) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error: insertError } = await supabase.from('read_announcements').upsert({
            user_id: user.id,
            announcement_id: announcementId,
            created_at: new Date().toISOString(),
        });

        if (!insertError) {
            setReadIds((prev) => new Set([...prev, announcementId]));
        }
    }, [readIds]);

    const markAllAsRead = useCallback(async () => {
        const unread = announcements.filter((item) => !readIds.has(item.id));
        if (unread.length === 0) return;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error: insertError } = await supabase.from('read_announcements').upsert(
            unread.map((item) => ({
                user_id: user.id,
                announcement_id: item.id,
                created_at: new Date().toISOString(),
            }))
        );

        if (!insertError) {
            setReadIds(new Set(announcements.map((item) => item.id)));
        }
    }, [announcements, readIds]);

    const unreadCount = announcements.filter((item) => !readIds.has(item.id)).length;

    return {
        announcements,
        readIds,
        total,
        unreadCount,
        loading,
        isRefreshing,
        error,
        fetchAnnouncements,
        markAsRead,
        markAllAsRead,
    };
}
