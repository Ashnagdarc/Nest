"use client";

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { playNotificationSound } from '@/lib/soundUtils';

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
};

export function AnnouncementPopup() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const supabase = createClient();

    // Load the most recent announcement that is less than 7 days old
    useEffect(() => {
        const checkRecentAnnouncements = async () => {
            // Check if we've already shown this announcement to this user
            const seenAnnouncementsJson = localStorage.getItem('seen_announcements') || '[]';
            const seenAnnouncements = JSON.parse(seenAnnouncementsJson) as string[];

            // Get current time minus 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            try {
                // Try to get the most recent announcement using the RPC function
                const { data, error } = await supabase.rpc('get_recent_announcements', {
                    max_count: 1
                });

                // Fall back to direct query if RPC fails
                if (error) {
                    console.error("Error using RPC to fetch recent announcement for popup:", error);

                    // Fall back to direct query
                    const { data: directData, error: directError } = await supabase
                        .from('announcements')
                        .select('*')
                        .gt('created_at', sevenDaysAgo.toISOString())
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (directError || !directData || directData.length === 0) {
                        return;
                    }

                    const recentAnnouncement = directData[0];

                    // Show if we haven't seen it before
                    if (!seenAnnouncements.includes(recentAnnouncement.id)) {
                        setAnnouncement({
                            id: recentAnnouncement.id,
                            title: recentAnnouncement.title,
                            content: recentAnnouncement.content,
                            createdAt: new Date(recentAnnouncement.created_at)
                        });

                        // Play notification sound when showing announcement
                        playNotificationSound('login');

                        // Show after a small delay for better UX
                        setTimeout(() => setIsVisible(true), 1000);
                    }
                    return;
                }

                if (!data || data.length === 0) {
                    return;
                }

                const recentAnnouncement = data[0];

                // Skip if announcement is older than 7 days
                const announcementDate = new Date(recentAnnouncement.created_at || '');
                if (announcementDate < sevenDaysAgo) {
                    return;
                }

                // Show if we haven't seen it before
                if (!seenAnnouncements.includes(recentAnnouncement.id as string)) {
                    setAnnouncement({
                        id: recentAnnouncement.id as string,
                        title: recentAnnouncement.title as string,
                        content: recentAnnouncement.content as string,
                        createdAt: new Date(recentAnnouncement.created_at as string)
                    });

                    // Play notification sound when showing announcement
                    playNotificationSound('login');

                    // Show after a small delay for better UX
                    setTimeout(() => setIsVisible(true), 1000);
                }
            } catch (e) {
                console.error("Unexpected error in checkRecentAnnouncements:", e);
            }
        };

        checkRecentAnnouncements();
    }, [supabase]);

    const handleDismiss = () => {
        // Mark as seen
        if (announcement) {
            const seenAnnouncementsJson = localStorage.getItem('seen_announcements') || '[]';
            const seenAnnouncements = JSON.parse(seenAnnouncementsJson) as string[];

            // Add to seen announcements
            seenAnnouncements.push(announcement.id);

            // Store back to localStorage
            localStorage.setItem('seen_announcements', JSON.stringify(seenAnnouncements));
        }

        setIsVisible(false);
    };

    const handleViewMore = () => {
        window.location.href = '/user/announcements';
        handleDismiss();
    };

    if (!announcement || !isVisible) return null;

    return (
        <div className="fixed bottom-8 right-8 max-w-md z-50">
            <Card className="shadow-lg border-primary/20">
                <CardHeader className="bg-primary/5 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0 rounded-full">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Posted on {format(announcement.createdAt, 'PPP')}
                    </p>
                </CardHeader>
                <CardContent className="pt-4">
                    <p className="text-sm">
                        {announcement.content.length > 150
                            ? `${announcement.content.substring(0, 150)}...`
                            : announcement.content
                        }
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-0">
                    <Button variant="outline" size="sm" onClick={handleDismiss}>
                        Dismiss
                    </Button>
                    <Button variant="default" size="sm" onClick={handleViewMore}>
                        View Details
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
} 