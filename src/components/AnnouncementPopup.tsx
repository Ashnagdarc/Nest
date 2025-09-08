"use client";

import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { playNotificationSound } from '@/lib/soundUtils';

// Small cookie helpers local to this component to avoid adding new deps
function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}
function writeCookie(name: string, value: string, days = 30) {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; samesite=lax`;
}

function safeParseStringArray(jsonLike: unknown): string[] {
    try {
        if (typeof jsonLike !== 'string') return [];
        const parsed = JSON.parse(jsonLike);
        return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
    } catch {
        return [];
    }
}

function uniquePush(list: string[], value: string): string[] {
    const set = new Set(list);
    set.add(value);
    return Array.from(set);
}

type Announcement = {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
};

export function AnnouncementPopup() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [entered, setEntered] = useState(false);
    const [exiting, setExiting] = useState(false);
    const supabase = createClient();

    // ESC to dismiss for quick keyboard handling
    useEffect(() => {
        if (!isVisible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleDismiss();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isVisible]);

    // Load the most recent announcement that is less than 7 days old
    useEffect(() => {
        const checkRecentAnnouncements = async () => {
            // Per-session guard: if already shown in this tab session, skip
            if (typeof window !== 'undefined' && sessionStorage.getItem('announcement_shown_session') === '1') {
                return;
            }

            // Load seen IDs from both localStorage and cookie
            const ls = typeof window !== 'undefined' ? localStorage.getItem('seen_announcements') : '[]';
            const ck = readCookie('seen_announcements') || '[]';
            const seenAnnouncements = Array.from(new Set([...
                safeParseStringArray(ls),
            safeParseStringArray(ck),
            ].flat()));

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
                    const id = String(recentAnnouncement.id);

                    // Show if we haven't seen it before
                    if (!seenAnnouncements.includes(id)) {
                        setAnnouncement({
                            id,
                            title: String(recentAnnouncement.title),
                            content: String(recentAnnouncement.content),
                            createdAt: new Date(recentAnnouncement.created_at)
                        });

                        // Play notification sound when showing announcement
                        playNotificationSound('login');

                        // Show after a small delay for better UX
                        setTimeout(() => {
                            setIsVisible(true);
                            // allow next frame for transition
                            requestAnimationFrame(() => setEntered(true));
                        }, 1000);
                    }
                    return;
                }

                if (!data || data.length === 0) {
                    return;
                }

                const recentAnnouncement = data[0];

                // Skip if announcement is older than 7 days
                const announcementDate = new Date((recentAnnouncement as any).created_at || '');
                if (announcementDate < sevenDaysAgo) {
                    return;
                }

                const id = String((recentAnnouncement as any).id);

                // Show if we haven't seen it before
                if (!seenAnnouncements.includes(id)) {
                    setAnnouncement({
                        id,
                        title: String((recentAnnouncement as any).title),
                        content: String((recentAnnouncement as any).content),
                        createdAt: new Date((recentAnnouncement as any).created_at)
                    });

                    // Play notification sound when showing announcement
                    playNotificationSound('login');

                    // Show after a small delay for better UX
                    setTimeout(() => {
                        setIsVisible(true);
                        requestAnimationFrame(() => setEntered(true));
                    }, 1000);
                }
            } catch (e) {
                console.error("Unexpected error in checkRecentAnnouncements:", e);
            }
        };

        checkRecentAnnouncements();
    }, [supabase]);

    const persistSeen = (id: string) => {
        // Merge and persist to both localStorage and cookie
        const ls = typeof window !== 'undefined' ? localStorage.getItem('seen_announcements') : '[]';
        const ck = readCookie('seen_announcements') || '[]';
        const merged = uniquePush(Array.from(new Set([...
            safeParseStringArray(ls),
        safeParseStringArray(ck),
        ].flat())), id);
        try {
            localStorage.setItem('seen_announcements', JSON.stringify(merged));
        } catch { }
        writeCookie('seen_announcements', JSON.stringify(merged), 90);
        // Mark as shown for this session
        try { sessionStorage.setItem('announcement_shown_session', '1'); } catch { }
    };

    const handleDismiss = () => {
        if (announcement) persistSeen(announcement.id);
        // play exit animation then unmount
        setExiting(true);
        setEntered(false);
        setTimeout(() => setIsVisible(false), 220);
    };

    const handleViewMore = () => {
        window.location.href = '/user/announcements';
        handleDismiss();
    };

    if (!announcement || !isVisible) return null;

    const wrapperClasses = [
        "fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50",
        "transition-all duration-200 ease-out",
        entered && !exiting ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
    ].filter(Boolean).join(' ');

    return (
        <div className={wrapperClasses} aria-live="polite" aria-atomic="true">
            <Card className="relative w-[92vw] max-w-md rounded-2xl border border-primary/20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-2xl">
                {/* Gradient top accent */}
                <div className="absolute -top-px left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full" />
                <CardHeader className="pb-2 pt-4 pr-4 pl-4 sm:pl-5 sm:pr-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
                                <Megaphone className="h-4 w-4" />
                            </span>
                            <CardTitle className="text-base sm:text-lg leading-tight">{announcement.title}</CardTitle>
                        </div>
                        <Button aria-label="Dismiss announcement" variant="ghost" size="icon" onClick={handleDismiss} className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Posted on {format(announcement.createdAt, 'PPP')}</p>
                </CardHeader>
                <CardContent className="pt-3 pb-1 px-4 sm:px-5">
                    <p className="text-sm leading-relaxed line-clamp-4">
                        {announcement.content}
                    </p>
                </CardContent>
                <CardFooter className="gap-2 pt-0 pb-4 px-4 sm:px-5 flex flex-col sm:flex-row sm:justify-end">
                    <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleDismiss}>
                        Dismiss
                    </Button>
                    <Button className="w-full sm:w-auto" variant="default" size="sm" onClick={handleViewMore}>
                        View Details
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
} 