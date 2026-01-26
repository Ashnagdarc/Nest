"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellRing, Trash2, CheckCheck, Megaphone, Info, Clock, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { SupabaseClient } from '@supabase/supabase-js';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { apiGet } from '@/lib/apiClient';

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read?: boolean;
};

type ReadAnnouncement = {
  announcement_id: string;
};

type TabValue = 'all' | 'system' | 'announcements';

const supabase: SupabaseClient = createClient();

export default function UserNotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, deleteNotification: apiDeleteNotification } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const { toast } = useToast();
  const { showSuccessFeedback, showErrorFeedback, setLoading } = useSuccessFeedback();

  useEffect(() => {
    const fetchNotificationsAndReadStatus = async () => {
      setIsLoading(true);
      try {
        const response = await apiGet<any>(`/api/notifications`);
        if (response.data) {
          const readIds = response.data.filter((notification: { is_read: boolean }) => notification.is_read).map((notification: { id: string }) => notification.id);
          setReadNotificationIds(readIds);
        }

        const { data: announcementsData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (announcementsData) {
          setAnnouncements(announcementsData);
        }

        const { data: readAnnouncementsData } = await supabase
          .from('read_announcements')
          .select('announcement_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        if (readAnnouncementsData) {
          const readIds = readAnnouncementsData.map((item: ReadAnnouncement) => item.announcement_id);
          setReadAnnouncements(readIds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotificationsAndReadStatus();
    const refreshInterval = setInterval(() => { fetchNotificationsAndReadStatus(); }, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  const markAnnouncementAsRead = async (id: string) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('read_announcements')
        .upsert(
          { user_id: userData.user.id, announcement_id: id },
          { onConflict: 'user_id,announcement_id' }
        );

      if (error) throw error;
      setReadAnnouncements(prev => [...prev, id]);
      showSuccessFeedback({ toast: { title: "Announcement marked as read" } });
    } catch (error) {
      showErrorFeedback({ toast: { title: "Error", description: error instanceof Error ? error.message : "Failed" } });
    } finally {
      setLoading(false);
    }
  };

  const markAsReadWithLogging = async (id: string) => {
    if (readNotificationIds.includes(id)) return;
    try {
      const success = await markAsRead(id);
      if (success) setReadNotificationIds(prev => [...prev, id]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setLoading(true);
    try {
      const unreadNotifications = notifications.filter(n => !readNotificationIds.includes(n.id));
      if (unreadNotifications.length === 0) return;
      await markAllAsRead();
      setReadNotificationIds(prev => [...prev, ...unreadNotifications.map(n => n.id)]);
      showSuccessFeedback({ toast: { title: "All notifications marked as read" } });
    } catch (error) {
      showErrorFeedback({ toast: { title: "Error", description: "Failed" } });
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: string) => {
    setLoading(true);
    try {
      const success = await apiDeleteNotification(id);
      if (success) showSuccessFeedback({ toast: { title: "Notification deleted" } });
    } catch (error) {
      showErrorFeedback({ toast: { title: "Error", description: "Failed" } });
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const isRead = n.is_read || readNotificationIds.includes(n.id);
    const readMatches = filter === 'all' || (filter === 'unread' && !isRead);
    if (activeTab === 'system') return n.type === 'system' && readMatches;
    if (activeTab === 'announcements') return false;
    return readMatches;
  });

  const filteredAnnouncements = announcements.filter(a => {
    const isRead = readAnnouncements.includes(a.id);
    return filter === 'all' || (filter === 'unread' && !isRead);
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'request_approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'request_rejected': return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'gear_due_soon': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'gear_overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'new_announcement': return <Megaphone className="h-4 w-4 text-blue-500" />;
      case 'system': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <BellRing className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const unreadAnnouncementsCount = announcements.filter(a => !readAnnouncements.includes(a.id)).length;
  const unreadNotificationsCount = notifications.filter(n => !n.is_read && !readNotificationIds.includes(n.id)).length;

  const markAllAnnouncementsAsRead = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const unreadAnnouncements = announcements
        .filter(a => !readAnnouncements.includes(a.id))
        .map(a => ({ user_id: userData.user!.id, announcement_id: a.id }));
      if (unreadAnnouncements.length === 0) return;
      const { error } = await supabase.from('read_announcements').upsert(unreadAnnouncements);
      if (error) throw error;
      setReadAnnouncements(prev => [...prev, ...announcements.filter(a => !readAnnouncements.includes(a.id)).map(a => a.id)]);
    } catch (error) {
      console.error("Error marking all announcements as read:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-8 space-y-8 max-w-7xl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">Stay updated with gear requests and system alerts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={filter === 'unread' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('unread')}>
            Unread ({unreadNotificationsCount + unreadAnnouncementsCount})
          </Button>
          <Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'announcements' ? markAllAnnouncementsAsRead() : markAllNotificationsAsRead()}
            className="relative hover:bg-primary/10"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full"
      >
        <TabsList className="flex gap-4 bg-transparent border-none h-auto p-0 mb-8 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="all" className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none transition-all font-medium text-base">
            All
            {(unreadNotificationsCount + unreadAnnouncementsCount) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                {unreadNotificationsCount + unreadAnnouncementsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="system" className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none transition-all font-medium text-base">
            System
            {unreadNotificationsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                {unreadNotificationsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="announcements" className="px-0 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none transition-all font-medium text-base">
            Announcements
            {unreadAnnouncementsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                {unreadAnnouncementsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="focus-visible:outline-none">
          <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-350px)] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-md">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="space-y-2 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/4" /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {filteredAnnouncements.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Announcements</h3>
                      <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                        {filteredAnnouncements.map((announcement) => (
                          <motion.li key={announcement.id} variants={itemVariants} className={`group flex items-start justify-between p-4 rounded-2xl transition-all duration-200 ${readAnnouncements.includes(announcement.id) ? 'bg-transparent' : 'bg-primary/5 shadow-sm border border-primary/10'}`}>
                            <div className="flex items-start gap-3">
                              <Megaphone className="h-4 w-4 text-primary mt-1" />
                              <div>
                                <p className="text-sm font-semibold">{announcement.title}</p>
                                <p className="text-xs text-muted-foreground mb-1">{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</p>
                                <p className="text-sm text-muted-foreground">{announcement.content}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!readAnnouncements.includes(announcement.id) && (
                                <Button variant="ghost" size="sm" onClick={() => markAnnouncementAsRead(announcement.id)} className="text-xs">Mark Read</Button>
                              )}
                            </div>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </div>
                  )}

                  {filteredNotifications.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">System Alerts</h3>
                      <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                        {filteredNotifications.map((notification) => (
                          <motion.li key={notification.id} variants={itemVariants} className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${notification.is_read || readNotificationIds.includes(notification.id) ? 'bg-transparent' : 'bg-primary/5 shadow-sm border border-primary/10'}`}>
                            <div className="flex items-center gap-3">
                              {getIconForType(notification.type)}
                              <div>
                                <p className="text-sm font-medium">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!notification.is_read && !readNotificationIds.includes(notification.id) && (
                                <Button variant="ghost" size="sm" onClick={() => markAsReadWithLogging(notification.id)} className="text-xs">Mark Read</Button>
                              )}
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(notification.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </div>
                  )}
                  {filteredAnnouncements.length === 0 && filteredNotifications.length === 0 && <NoNotifications filter={filter} />}
                </>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="system" className="focus-visible:outline-none">
          <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-350px)] pr-4">
              <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <motion.li key={notification.id} variants={itemVariants} className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${notification.is_read || readNotificationIds.includes(notification.id) ? 'bg-transparent' : 'bg-primary/5 shadow-sm border border-primary/10'}`}>
                    <div className="flex items-center gap-3">
                      {getIconForType(notification.type)}
                      <div>
                        <p className="text-sm font-medium">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
              {filteredNotifications.length === 0 && <NoNotifications filter={filter} />}
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="focus-visible:outline-none">
          <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-350px)] pr-4">
              <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
                {filteredAnnouncements.map((announcement) => (
                  <motion.li key={announcement.id} variants={itemVariants} className={`group flex items-start justify-between p-4 rounded-2xl transition-all duration-200 ${readAnnouncements.includes(announcement.id) ? 'bg-transparent' : 'bg-primary/5 shadow-sm border border-primary/10'}`}>
                    <div className="flex items-start gap-3">
                      <Megaphone className="h-4 w-4 text-primary mt-1" />
                      <div>
                        <p className="text-sm font-semibold">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground mb-1">{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</p>
                        <p className="text-sm text-muted-foreground">{announcement.content}</p>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
              {filteredAnnouncements.length === 0 && <NoNotifications filter={filter} />}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function NoNotifications({ filter }: { filter: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
        <BellRing className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-3">No {filter === 'unread' ? 'unread ' : ''}notifications</h3>
      <p className="text-muted-foreground max-w-md mx-auto">You're all caught up!</p>
    </motion.div>
  );
}
