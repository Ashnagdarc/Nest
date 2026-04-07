"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./NotificationProvider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const CATEGORY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'request', label: 'Requests' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'maintenance_record', label: 'Maintenance' },
    { key: 'system', label: 'System' },
];

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 opacity-0" />
            </Button>
        );
    }
    const router = useRouter();
    const pathname = usePathname();

    // Filter notifications by category
    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => n.category === activeTab);

    return (
        <DropdownMenu
            open={isOpen}
            onOpenChange={(open) => setIsOpen(open)}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={`Notifications (${unreadCount} unread)`}
                >
                    <Bell className="h-5 w-5" />

                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-2 border-b">
                    <h4 className="font-medium">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllAsRead()}
                            className="h-8"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                {/* Category Tabs */}
                <div className="flex border-b">
                    {CATEGORY_TABS.map(tab => (
                        <button
                            key={tab.key}
                            className={`flex-1 py-2 text-xs font-medium ${activeTab === tab.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <ScrollArea className="h-[300px]">
                    {filteredNotifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => {
                            // Robust null checks for all fields
                            const title = notification.title || 'Untitled';
                            const message = notification.message || '';
                            const createdAt = notification.created_at ? new Date(notification.created_at) : null;
                            const metadata = notification.metadata || {};
                            let timeAgo = '';
                            try {
                                if (createdAt && !isNaN(createdAt.getTime())) {
                                    timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
                                }
                            } catch {
                                timeAgo = '';
                            }
                            // Determine notifications page route
                            let target = null;
                            // Prefer explicit link
                            if (notification.link) {
                                target = notification.link;
                            } else if (metadata && metadata.request_id) {
                                target = pathname?.includes('/admin')
                                    ? `/admin/manage-requests/${metadata.request_id}`
                                    : `/user/my-requests/${metadata.request_id}`;
                            } else if (metadata && metadata.gear_id) {
                                target = pathname?.includes('/admin')
                                    ? `/admin/manage-gears?gear=${metadata.gear_id}`
                                    : `/user/browse?gear=${metadata.gear_id}`;
                            } else if (metadata && metadata.announcement_id) {
                                target = pathname?.includes('/admin')
                                    ? `/admin/announcements?announcement=${metadata.announcement_id}`
                                    : `/user/announcements?announcement=${metadata.announcement_id}`;
                            }
                            // Fallback to notifications page
                            if (!target) {
                                if (pathname?.includes('/admin')) target = '/admin/notifications';
                                else if (pathname?.includes('/user')) target = '/user/notifications';
                                else target = '/notifications';
                            }
                            return (
                                <DropdownMenuItem
                                    key={notification.id || Math.random()}
                                    className={`flex flex-col items-start p-4 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent'}`}
                                    onClick={() => {
                                        if (notification.id) markAsRead(notification.id);
                                        let target = null;
                                        // Prefer explicit link
                                        if (notification.link) {
                                            target = notification.link;
                                        } else if (metadata && metadata.request_id) {
                                            target = pathname?.includes('/admin')
                                                ? `/admin/manage-requests/${metadata.request_id}`
                                                : `/user/my-requests/${metadata.request_id}`;
                                        } else if (metadata && metadata.gear_id) {
                                            target = pathname?.includes('/admin')
                                                ? `/admin/manage-gears?gear=${metadata.gear_id}`
                                                : `/user/browse?gear=${metadata.gear_id}`;
                                        } else if (metadata && metadata.announcement_id) {
                                            target = pathname?.includes('/admin')
                                                ? `/admin/announcements?announcement=${metadata.announcement_id}`
                                                : `/user/announcements?announcement=${metadata.announcement_id}`;
                                        }
                                        // Fallback to notifications page
                                        if (!target) {
                                            if (pathname?.includes('/admin')) target = '/admin/notifications';
                                            else if (pathname?.includes('/user')) target = '/user/notifications';
                                            else target = '/notifications';
                                        }
                                        console.log('[NotificationBell] Clicked notification:', {
                                            notification,
                                            target,
                                            pathname
                                        });
                                        if (target !== pathname) {
                                            router.push(target);
                                        }
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-start justify-between w-full">
                                        <div>
                                            <p className={`font-medium ${!notification.is_read ? 'text-primary' : ''}`}>{title}</p>
                                            {message && <p className="text-sm text-muted-foreground">{message}</p>}
                                            {/* Show metadata if available */}
                                            {metadata && typeof metadata === 'object' && (
                                                <div className="text-xs mt-1 text-muted-foreground">
                                                    {metadata.gear_id && <span>Gear ID: {metadata.gear_id} </span>}
                                                    {metadata.request_id && <span>Request ID: {metadata.request_id} </span>}
                                                    {metadata.announcement_id && <span>Announcement ID: {metadata.announcement_id} </span>}
                                                </div>
                                            )}
                                        </div>
                                        {!notification.is_read && (
                                            <Badge variant="secondary" className="ml-2 bg-primary text-white">
                                                New
                                            </Badge>
                                        )}
                                    </div>
                                    {timeAgo && <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>}
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 