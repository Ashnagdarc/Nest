"use client";

import { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
};

interface AnnouncementsWidgetProps {
    embedded?: boolean;
}

export function AnnouncementsWidget({ embedded = false }: AnnouncementsWidgetProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    const sanitizeContent = (content: string) => {
        // Fix common grammatical errors and spacing
        return content
            .replace(/will be have/g, 'will have')
            .replace(/nextweek/g, 'next week')
            .replace(/(\w)we(\s)/g, '$1 we$2')
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            // Try the RPC function first with a limit of 3
            const { data, error } = await supabase.rpc('get_recent_announcements', {
                max_count: 3
            });

            // Fall back to direct query if RPC fails
            if (error) {
                logger.error("Error using RPC to fetch recent announcements:", error);

                const { data: directData, error: directError } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(3);

                if (directError) {
                    logger.error("Error fetching recent announcements:", directError);
                    setLoading(false);
                    return;
                }

                if (directData) {
                    setAnnouncements(directData.map((a: any) => ({
                        id: a.id,
                        title: a.title,
                        content: sanitizeContent(a.content),
                        createdAt: new Date(a.created_at)
                    })));
                }
                setLoading(false);
                return;
            }

            if (data) {
                setAnnouncements(data.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    content: sanitizeContent(a.content),
                    createdAt: new Date(a.created_at)
                })));
            }
            setLoading(false);
        } catch (e) {
            logger.error("Unexpected error in fetchRecentAnnouncements:", e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();

        // Set up real-time subscription to announcements
        const announcementsSubscription = createSupabaseSubscription({
            supabase,
            channel: 'announcements-changes',
            config: {
                event: '*',
                schema: 'public',
                table: 'announcements'
            },
            callback: () => {
                fetchAnnouncements();
            },
            pollingInterval: 30000 // 30 seconds fallback polling
        });

        return () => {
            announcementsSubscription.unsubscribe();
        };
    }, [supabase]);

    // If embedded, render just the content
    if (embedded) {
        return (
            <div className="space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="py-1">
                                <Skeleton className="h-3 w-4/5 mb-1" />
                                <Skeleton className="h-2 w-1/3 mb-1" />
                                <Skeleton className="h-2 w-full" />
                            </div>
                        ))}
                    </div>
                ) : announcements.length > 0 ? (
                    <div className="space-y-3">
                        {announcements.slice(0, 2).map(announcement => (
                            <div key={announcement.id} className="py-1">
                                <h3 className="font-medium text-xs">{announcement.title}</h3>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(announcement.createdAt, { addSuffix: true })}
                                </p>
                                <p className="text-xs line-clamp-1 mt-1">
                                    {announcement.content}
                                </p>
                            </div>
                        ))}
                        <Link href="/user/announcements">
                            <Button variant="link" size="sm" className="px-0 h-6 text-xs">
                                View all announcements
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-4xl mb-3">📢</div>
                        <h3 className="text-lg font-medium mb-2">No announcements</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">Check back later for important announcements</p>
                    </div>
                )}
            </div>
        );
    }

    // If not embedded, render with card container
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    Recent Announcements
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border-b pb-3 last:border-0">
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-3 w-1/4 mb-2" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full mt-1" />
                            </div>
                        ))}
                    </div>
                ) : announcements.length > 0 ? (
                    <div className="space-y-4">
                        {announcements.map(announcement => (
                            <div key={announcement.id} className="border-b pb-3 last:border-0">
                                <h3 className="font-medium text-sm">{announcement.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1 mb-2">
                                    {formatDistanceToNow(announcement.createdAt, { addSuffix: true })}
                                </p>
                                <p className="text-xs line-clamp-2">
                                    {announcement.content}
                                </p>
                            </div>
                        ))}
                        <Link href="/user/announcements">
                            <Button variant="link" size="sm" className="px-0">
                                View all announcements
                            </Button>
                        </Link>
                    </div>
                ) :
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-4xl mb-3">📢</div>
                        <h3 className="text-lg font-medium mb-2">No announcements</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">Check back later for important announcements</p>
                    </div>
                }
            </CardContent>
        </Card>
    );
} 