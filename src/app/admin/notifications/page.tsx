"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellRing, Trash2, CheckCheck, Filter, Bell, ExternalLink, Settings, CheckCircle, Clock, XCircle, Package, RotateCcw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  metadata?: any;
};

export default function AdminNotificationsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [activeTab, setActiveTab] = useState('all');
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
    const savedSoundEnabled = localStorage.getItem('gearflowSoundEnabled');
    const savedSoundVolume = localStorage.getItem('gearflowSoundVolume');
    const savedSoundType = localStorage.getItem('gearflowSoundType');

    if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === 'true');
    if (savedSoundVolume !== null) setSoundVolume(parseInt(savedSoundVolume));
    if (savedSoundType !== null) setSoundType(savedSoundType);

    fetchNotifications();
  }, []);

  // Save preferences when they change
  useEffect(() => {
    localStorage.setItem('gearflowSoundEnabled', soundEnabled.toString());
    localStorage.setItem('gearflowSoundVolume', soundVolume.toString());
    localStorage.setItem('gearflowSoundType', soundType);

    // Update audio volume
    if (audioRef.current) {
      audioRef.current.volume = soundVolume / 100;
    }
  }, [soundEnabled, soundVolume, soundType]);

  async function fetchNotifications() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Try using the RPC function first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_notifications', { 
        p_limit: 100, 
        p_offset: 0 
      });

      if (!rpcError && rpcData) {
        setNotifications(rpcData.map((n: any) => ({
          id: n.id,
          type: n.type,
          content: n.message || n.content,
          timestamp: new Date(n.created_at),
          read: n.is_read,
          link: n.link,
          metadata: n.metadata
        })));
        return;
      }

      console.log('RPC failed, falling back to direct fetch:', rpcError);

      // Fallback: Fetch notifications and read status directly
      const [notificationsResult, readNotificationsResult] = await Promise.all([
        supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('read_notifications')
          .select('notification_id')
          .eq('user_id', user.id)
      ]);

      if (notificationsResult.error) {
        console.error('Error fetching notifications:', notificationsResult.error);
        return;
      }

      // Create a Set of read notification IDs for faster lookup
      const readNotifications = readNotificationsResult.data as Array<{ notification_id: string }> || [];
      const readNotificationIds = new Set(readNotifications.map(rn => rn.notification_id));

      // Map notifications with read status from both tables
      setNotifications(notificationsResult.data.map((n: {
        id: string;
        type: string;
        message?: string;
        content?: string;
        created_at: string;
        read: boolean;
        link?: string;
        metadata?: any;
      }) => ({
        id: n.id,
        type: n.type,
        content: n.message || n.content,
        timestamp: new Date(n.created_at),
        read: n.read || readNotificationIds.has(n.id),
        link: n.link,
        metadata: n.metadata
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
        (payload: {
          new: {
            id: string;
            type: string;
            message?: string;
            content?: string;
            created_at: string;
            read: boolean;
            link?: string;
            metadata?: any;
          }
        }) => {
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
    const matchesFilter = filter === 'all' || (filter === 'unread' && !n.read);
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'gear_requests' && n.type === 'new_request') ||
      (activeTab === 'system' && (n.type === 'system' || n.type === 'info' || n.type === 'warning'));
    return matchesFilter && matchesTab;
  });

  const markAsRead = async (id: string) => {
    try {
      // Stop any ongoing sound for this notification
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.currentTime = 0;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Update UI immediately for better UX
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );

      // Also insert into read_notifications first to ensure the relationship is recorded
      const { error: readError } = await supabase
        .from('read_notifications')
        .upsert(
          { user_id: user.id, notification_id: id },
          { onConflict: 'user_id,notification_id' }
        );

      if (readError) {
        console.error('Error updating read_notifications:', readError);
      }

      // Update notification as read using direct update
      // Try using the stored procedure first
      const { error: procError } = await supabase.rpc('mark_notification_as_read', {
        notification_id: id
      });

      if (procError) {
        console.log('Stored procedure failed, falling back to direct update:', procError);
        
        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating notification status:', {
            error: updateError,
            code: updateError.code,
            details: updateError.details,
            message: updateError.message
          });

          // Revert UI state if the update failed
          setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: false } : n)
          );
          return;
        }
      }

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: user.id,
        activity_type: 'mark_notification_read',
        details: { notification_id: id }
      });

    } catch (error) {
      console.error('Error in markAsRead:', error);
      // Revert UI state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Update UI immediately
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );

      // Try using the stored procedure first
      const { error: procError } = await supabase.rpc('mark_all_notifications_as_read');

      if (procError) {
        console.log('Stored procedure failed, falling back to direct update:', procError);

        // Fallback to direct update
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            updated_at: new Date().toISOString()
          })
          .eq('is_read', false);

        if (updateError) {
          console.error('Error marking all as read:', {
            error: updateError,
            code: updateError.code,
            details: updateError.details,
            message: updateError.message
          });
          // Refresh notifications to get current state
          fetchNotifications();
          return;
        }
      }

      // Also update the read_notifications table
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        const { error: readError } = await supabase
          .from('read_notifications')
          .upsert(
            unreadNotifications.map(n => ({
              user_id: user.id,
              notification_id: n.id
            })),
            { onConflict: 'user_id,notification_id' }
          );

        if (readError) {
          console.error('Error updating read_notifications:', readError);
        }
      }

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: user.id,
        activity_type: 'mark_all_notifications_read',
        details: { count: notifications.filter(n => !n.read).length }
      });

    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      // Refresh notifications to get current state
      fetchNotifications();
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
    // If it's a gear request notification with metadata containing requestId
    if (notification.type === 'new_request' && notification.metadata?.requestId) {
      // Navigate to the manage requests page
      router.push(`/admin/manage-requests?request=${notification.metadata.requestId}`);
      // Mark as read when navigating
      markAsRead(notification.id);
    } else if (notification.link) {
      // For other notifications with links
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

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'new_request': return <Badge variant="outline" className="bg-primary/10"><Clock className="mr-1 h-3 w-3" /> New Request</Badge>;
      case 'request_approved': return <Badge variant="default" className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" /> Approved</Badge>;
      case 'request_rejected': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      case 'gear_checkin': return <Badge variant="outline" className="bg-green-500/10 text-green-500"><Package className="mr-1 h-3 w-3" /> Checked In</Badge>;
      case 'gear_checkout': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><Package className="mr-1 h-3 w-3" /> Checked Out</Badge>;
      case 'overdue': return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Overdue</Badge>;
      case 'warning': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><AlertCircle className="mr-1 h-3 w-3" /> Warning</Badge>;
      case 'info': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500"><BellRing className="mr-1 h-3 w-3" /> Info</Badge>;
      default: return <Badge variant="outline"><BellRing className="mr-1 h-3 w-3" /> {type}</Badge>;
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

  // Test notification sound
  const playTestSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Error playing test sound:", e));
    }
  };

  // Filter counts for badges
  const gearRequestCount = notifications.filter(n => n.type === 'new_request' && !n.read).length;
  const systemCount = notifications.filter(n => (n.type === 'system' || n.type === 'info' || n.type === 'warning') && !n.read).length;
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

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Alerts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {systemCount}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gear Alerts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {notifications.filter(n =>
                    (n.type === 'gear_checkin' || n.type === 'gear_checkout' || n.type === 'overdue') &&
                    !n.read
                  ).length}
                </h3>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request Alerts</p>
                <h3 className="text-2xl font-bold mt-1">
                  {notifications.filter(n =>
                    n.type === 'new_request' &&
                    !n.read
                  ).length}
                </h3>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
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
                            <p className={cn(
                              "font-medium line-clamp-2",
                              !notification.read && "text-primary"
                            )}>
                              {notification.content}
                            </p>
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
