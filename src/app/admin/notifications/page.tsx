"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BellRing, Trash2, CheckCheck, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Notification = {
  id: string;
  type: 'new_request' | 'damage_report' | 'gear_checkin' | 'low_stock';
  content: string;
  timestamp: Date;
  read: boolean;
  link?: string;
};

export default function AdminNotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data.map(n => ({
        id: n.id,
        type: n.type,
        content: n.content,
        timestamp: new Date(n.created_at),
        read: n.read,
        link: n.link,
      })));
    }
  }

  const filteredNotifications = notifications.filter(n =>
    filter === 'all' || (filter === 'unread' && !n.read)
  );

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
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

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'new_request': return <BellRing className="h-4 w-4 text-blue-500" />;
      case 'damage_report': return <BellRing className="h-4 w-4 text-orange-500" />;
      case 'gear_checkin': return <BellRing className="h-4 w-4 text-green-500" />;
      case 'low_stock': return <BellRing className="h-4 w-4 text-yellow-500" />;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <div className="flex gap-2">
          <Button variant={filter === 'unread' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('unread')}>
            Unread ({notifications.filter(n => !n.read).length})
          </Button>
          <Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={notifications.filter(n => !n.read).length === 0}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>System alerts and user activity updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length > 0 ? (
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {filteredNotifications.map((notification) => (
                <motion.li
                  key={notification.id}
                  variants={itemVariants}
                  className={`flex items-center justify-between p-3 rounded-md border ${notification.read ? 'bg-background' : 'bg-primary/5 font-medium'}`}
                >
                  <div className="flex items-center gap-3">
                    {getIconForType(notification.type)}
                    <div>
                      <p className="text-sm">{notification.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                        Mark Read
                      </Button>
                    )}
                    {/* Link Button (optional) */}
                    {notification.link && (
                      <a href={notification.link} target="_blank" rel="noopener noreferrer">
                        <Button variant="link" size="sm">View</Button>
                      </a>
                    )}
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(notification.id)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-10 text-muted-foreground"
            >
              <BellRing className="h-10 w-10 mx-auto mb-4" />
              <p>No {filter === 'unread' ? 'unread ' : ''}notifications found.</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
