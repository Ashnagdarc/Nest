"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/dashboard/ListSkeleton";
import type { UnifiedDashboardData } from "@/hooks/dashboard/use-unified-dashboard";

type DashboardNotification = UnifiedDashboardData["notifications"][number];

/** Read notifications remain visible for this long after being read. */
const READ_VISIBILITY_MS = 24 * 60 * 60 * 1000;
const MAX_VISIBLE = 5;

interface NotificationsCardProps {
    notifications: DashboardNotification[];
    isLoading: boolean;
    onMarkAllRead: () => void;
}

function NotificationRow({ notification, unread }: { notification: DashboardNotification; unread: boolean }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <div
                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${unread ? "bg-primary/15" : "bg-muted"
                    }`}
            >
                <Bell className={`h-4 w-4 ${unread ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground truncate">
                    {notification.title || notification.type}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
            </div>
            <Badge variant={unread ? "default" : "secondary"} className="text-xs shrink-0">
                {unread ? "New" : "Read"}
            </Badge>
        </div>
    );
}

export function NotificationsCard({ notifications, isLoading, onMarkAllRead }: NotificationsCardProps) {
    const cutoff = Date.now() - READ_VISIBILITY_MS;
    const unread = notifications.filter((n) => !n.is_read);
    const recentlyRead = notifications.filter(
        (n) => n.is_read && new Date(n.updated_at || n.created_at).getTime() >= cutoff
    );
    const visibleUnread = unread.slice(0, MAX_VISIBLE);
    const visibleRead = recentlyRead.slice(0, Math.max(0, MAX_VISIBLE - visibleUnread.length));

    return (
        <Card className="border-border/50">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Bell className="h-5 w-5" />
                    Notifications
                    {unread.length > 0 && (
                        <Badge variant="default" className="text-xs">{unread.length}</Badge>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/user/notifications">View all</Link>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onMarkAllRead} disabled={unread.length === 0}>
                        Mark all as read
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <ListSkeleton rows={3} />
                ) : notifications.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">No notifications</p>
                ) : (
                    <div className="space-y-4">
                        <section>
                            <h4 className="text-sm font-semibold mb-2 text-foreground">Unread</h4>
                            <div className="space-y-2">
                                {visibleUnread.map((n) => (
                                    <NotificationRow key={n.id} notification={n} unread />
                                ))}
                                {visibleUnread.length === 0 && (
                                    <p className="text-muted-foreground text-sm">No unread notifications</p>
                                )}
                            </div>
                        </section>
                        <section>
                            <h4 className="text-sm font-semibold mb-2 text-foreground">Read</h4>
                            <div className="space-y-2">
                                {visibleRead.map((n) => (
                                    <NotificationRow key={n.id} notification={n} unread={false} />
                                ))}
                                {visibleRead.length === 0 && (
                                    <p className="text-muted-foreground text-sm">No read notifications</p>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
