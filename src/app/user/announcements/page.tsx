"use client";

import { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListSkeleton } from '@/components/dashboard/ListSkeleton';
import ErrorDisplay from '@/components/ui/error-display';
import { AnnouncementCard, AnnouncementsEmptyState } from '@/components/announcements/AnnouncementCard';
import { AnnouncementsPageHeader } from '@/components/announcements/AnnouncementsPageHeader';
import { useAnnouncements } from '@/hooks/announcements/useAnnouncements';

export default function UserAnnouncementsPage() {
    const {
        announcements,
        readIds,
        unreadCount,
        loading,
        isRefreshing,
        error,
        fetchAnnouncements,
        markAsRead,
        markAllAsRead,
    } = useAnnouncements(50);

    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredAnnouncements = useMemo(() => {
        const query = search.trim().toLowerCase();
        return announcements.filter((item) => {
            const matchesFilter = filter === 'all' || !readIds.has(item.id);
            if (!matchesFilter) return false;
            if (!query) return true;
            return (
                item.title.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query) ||
                item.authorName?.toLowerCase().includes(query)
            );
        });
    }, [announcements, filter, readIds, search]);

    return (
        <div className="mx-auto w-full max-w-4xl space-y-6">
            <AnnouncementsPageHeader
                title="Announcements"
                description="Company updates, news, and important notices."
                isRefreshing={isRefreshing}
                onRefresh={() => void fetchAnnouncements({ silent: true })}
                action={
                    unreadCount > 0 ? (
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => void markAllAsRead()}>
                            <Bell className="h-4 w-4" />
                            Mark all read ({unreadCount})
                        </Button>
                    ) : undefined
                }
            />

            <Card className="border-border/50">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <Input
                        placeholder="Search announcements..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="flex-1"
                    />
                    <div className="flex gap-2">
                        <Button
                            variant={filter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('all')}
                        >
                            All
                        </Button>
                        <Button
                            variant={filter === 'unread' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilter('unread')}
                        >
                            Unread ({unreadCount})
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {error ? (
                <ErrorDisplay error={error} onRetry={() => void fetchAnnouncements()} />
            ) : loading ? (
                <ListSkeleton rows={4} />
            ) : filteredAnnouncements.length === 0 ? (
                <AnnouncementsEmptyState />
            ) : (
                <div className="space-y-4">
                    {filteredAnnouncements.map((announcement) => {
                        const isRead = readIds.has(announcement.id);
                        return (
                            <AnnouncementCard
                                key={announcement.id}
                                announcement={announcement}
                                isRead={isRead}
                                expanded={expandedId === announcement.id}
                                onToggleExpand={() =>
                                    setExpandedId((current) =>
                                        current === announcement.id ? null : announcement.id
                                    )
                                }
                                onMarkRead={() => void markAsRead(announcement.id)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
