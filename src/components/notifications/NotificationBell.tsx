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
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification as NotificationType } from '@/services/notification';

type Notification = NotificationType & {
    category?: string;
    metadata?: Record<string, any>;
};

const CATEGORY_TABS = [
    { key: 'all', label: 'All' },
    { key: 'request', label: 'Requests' },
    { key: 'announcement', label: 'Announcements' },
    { key: 'maintenance_record', label: 'Maintenance' },
    { key: 'system', label: 'System' },
];

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const [hasPulse, setHasPulse] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Add pulse animation when new notifications arrive
    useEffect(() => {
        if (unreadCount > 0) {
            setHasPulse(true);
            const timer = setTimeout(() => setHasPulse(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [unreadCount]);

    // Reset pulse when opening the dropdown
    useEffect(() => {
        if (isOpen) {
            setHasPulse(false);
        }
    }, [isOpen]);

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
                    <AnimatePresence mode="wait">
                        {hasPulse && unreadCount > 0 && (
                            <motion.span
                                className="absolute inset-0 rounded-full"
                                initial={{ scale: 1, opacity: 0.8 }}
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.8, 0, 0.8],
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    repeat: 3,
                                    duration: 1,
                                    ease: "easeInOut"
                                }}
                                style={{
                                    background: 'radial-gradient(circle, rgba(127, 127, 255, 0.15) 0%, rgba(127, 127, 255, 0) 70%)',
                                    zIndex: -1
                                }}
                            />
                        )}
                    </AnimatePresence>

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
                        filteredNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start p-4 cursor-pointer transition-colors ${!notification.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent'}`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="flex items-start justify-between w-full">
                                    <div>
                                        <p className={`font-medium ${!notification.is_read ? 'text-primary' : ''}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.message}
                                        </p>
                                        {/* Show metadata if available */}
                                        {notification.metadata && (
                                            <div className="text-xs mt-1 text-muted-foreground">
                                                {notification.metadata.gear_id && <span>Gear ID: {notification.metadata.gear_id} </span>}
                                                {notification.metadata.request_id && <span>Request ID: {notification.metadata.request_id} </span>}
                                                {notification.metadata.announcement_id && <span>Announcement ID: {notification.metadata.announcement_id} </span>}
                                                {/* Add more as needed */}
                                            </div>
                                        )}
                                    </div>
                                    {!notification.is_read && (
                                        <Badge variant="secondary" className="ml-2 bg-primary text-white">
                                            New
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), {
                                        addSuffix: true,
                                    })}
                                </p>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 