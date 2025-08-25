"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BellRing, Trash2, CheckCheck, ExternalLink, Settings, CheckCircle, Clock, XCircle, Package, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { List } from "lucide-react";
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';
import { ScrollArea } from "@/components/ui/scroll-area";

type ApiNotification = {
  id: string;
  type: string;
  message?: string;
  title?: string;
  content?: string;
  created_at: string;
  is_read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
};

type Notification = {
  id: string;
  type: string;
  title?: string;
  content: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
};

function isRequestMetadata(meta: unknown): meta is { requestId: string } {
  return (
    typeof meta === 'object' &&
    meta !== null &&
    'requestId' in (meta as Record<string, unknown>) &&
    typeof (meta as Record<string, unknown>).requestId === 'string'
  );
}

export default function AdminNotificationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);
  const [soundType, setSoundType] = useState('bell');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/sounds/notification-bell.mp3');
    audioRef.current.volume = soundVolume / 100;

    // Load user preferences from localStorage
    const savedSoundEnabled = localStorage.getItem('flowtagSoundEnabled');
    const savedSoundVolume = localStorage.getItem('flowtagSoundVolume');
    const savedSoundType = localStorage.getItem('flowtagSoundType');

    if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === 'true');
    if (savedSoundVolume !== null) setSoundVolume(parseInt(savedSoundVolume));
    if (savedSoundType !== null) setSoundType(savedSoundType);

    fetchNotifications();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('flowtagSoundEnabled', soundEnabled.toString());
    localStorage.setItem('flowtagSoundVolume', soundVolume.toString());
    localStorage.setItem('flowtagSoundType', soundType);

    // Update audio volume
    if (audioRef.current) {
      audioRef.current.volume = soundVolume / 100;
    }
  }, [soundEnabled, soundVolume, soundType]);

  async function fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';
      // Use centralized API client and RESTful endpoint
      const { data, error } = await apiGet<{ data: ApiNotification[]; error: string | null }>(`/api/notifications${userId ? `?userId=${userId}` : ''}`);
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }
      setNotifications((data || []).map((n) => ({
        id: n.id,
        type: n.type,
        content: n.message || n.title || "",
        timestamp: new Date(n.created_at),
        read: n.is_read,
        link: n.link,
        metadata: n.metadata ?? {},
      })));
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  }

  // Set up real-time listener for new notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: { new: ApiNotification }) => {
          console.log('New notification:', payload);
          fetchNotifications();

          // Play sound if enabled
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Error playing notification sound:", e));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, soundEnabled]);

  const filteredNotifications = notifications.filter(n => {
    return filter === 'all' || (filter === 'unread' && !n.read);
  });

  const markAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      const { error } = await apiPut<{ data: Notification; error: string | null }>(`/api/notifications/${id}`, { is_read: true });
      if (error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
        console.error('Error updating notification status:', error);
      }
    } catch (error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      console.error('Unexpected error in markAsRead:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await apiPut<{ data: Notification[]; error: string | null }>(`/api/notifications/mark-read`, {});
      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Unexpected error in markAllAsRead:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const handleViewRequest = (notification: Notification) => {
    if (notification.type === 'new_request' && isRequestMetadata(notification.metadata)) {
      router.push(`/admin/manage-requests?request=${notification.metadata.requestId}`);
      markAsRead(notification.id);
    } else if (notification.link) {
      window.open(notification.link, '_blank');
      markAsRead(notification.id);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'new_request': return <Clock className="h-4 w-4 text-primary" />;
      case 'request_approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'request_rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'gear_checkin': return <Package className="h-4 w-4 text-green-500" />;
      case 'gear_checkout': return <Package className="h-4 w-4 text-blue-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'system': return <Settings className="h-4 w-4 text-blue-500" />;
      case 'info': return <BellRing className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <BellRing className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-6 space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Manage system notifications and alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'unread' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="relative"
          >
            <BellRing className="h-4 w-4 mr-2" />
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === 'all' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            <List className="h-4 w-4 mr-2" />
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="relative hover:bg-primary/10"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Center</CardTitle>
          <CardDescription>
            {filter === 'unread' ? 'Unread notifications requiring attention' : 'All system notifications and alerts'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-400px)] rounded-md">
            {filteredNotifications.length > 0 ? (
              <motion.ul
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {filteredNotifications.map((notification) => (
                  <motion.li
                    key={notification.id}
                    variants={itemVariants}
                    className={cn(
                      "border rounded-lg p-4 transition-colors",
                      !notification.read && "bg-primary/5 hover:bg-primary/10",
                      notification.read && "hover:bg-accent/5"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        {getIconForType(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {notification.title && (
                              <div className="font-semibold text-base mb-1 truncate">
                                {notification.title}
                              </div>
                            )}
                            {notification.content && (
                              <div className="text-sm text-muted-foreground whitespace-pre-line">
                                {notification.content}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.read && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                New
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {(notification.type === 'new_request' || notification.link) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRequest(notification)}
                              className="flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View Details
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="hover:bg-primary/10"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <div className="text-center py-12">
                <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  {filter === 'unread'
                    ? 'No unread notifications to review.'
                    : 'No notifications to display.'}
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Sound element for notifications */}
      <audio ref={soundRef} src="/sounds/notification-bell.mp3" />
    </motion.div>
  );
}
