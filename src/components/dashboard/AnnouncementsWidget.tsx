"use client";

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
};

export function AnnouncementsWidget() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchRecentAnnouncements = async () => {
            setLoading(true);
            try {
                // Try the RPC function first with a limit of 3
                const { data, error } = await supabase.rpc('get_recent_announcements', {
                    max_count: 3
                });

                // Fall back to direct query if RPC fails
                if (error) {
                    console.error("Error using RPC to fetch recent announcements:", error);

                    const { data: directData, error: directError } = await supabase
                        .from('announcements')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(3);

                    if (directError) {
                        console.error("Error fetching recent announcements:", directError);
                        setLoading(false);
                        return;
                    }

                    if (directData) {
                        setAnnouncements(directData.map((a: any) => ({
                            id: a.id,
                            title: a.title,
                            content: a.content,
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
                        content: a.content,
                        createdAt: new Date(a.created_at)
                    })));
                }
                setLoading(false);
            } catch (e) {
                console.error("Unexpected error in fetchRecentAnnouncements:", e);
                setLoading(false);
            }
        };

        fetchRecentAnnouncements();
    }, [supabase]);

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
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        Loading...
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
                ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        No announcements yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 