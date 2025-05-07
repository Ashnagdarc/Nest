"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { BellRing, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export default function UserNotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all'); // 'all', 'unread'

  const filteredNotifications = notifications.filter(n =>
    filter === 'all' || (filter === 'unread' && !n.read)
  );

  const deleteNotification = (id: string) => {
    // TODO: Call API to delete notification
  };

  const getIconForType = (type: string) => {
    // Customize icons based on notification type for better visual cues
    switch (type) {
      case 'request_approved': return <BellRing className="h-4 w-4 text-green-500" />;
      case 'request_rejected': return <BellRing className="h-4 w-4 text-red-500" />;
      case 'gear_due_soon': return <BellRing className="h-4 w-4 text-yellow-500" />;
      case 'gear_overdue': return <BellRing className="h-4 w-4 text-red-600 font-bold" />;
      case 'new_announcement': return <BellRing className="h-4 w-4 text-blue-500" />;
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
        <h1 className="text-3xl font-bold text-foreground">My Notifications</h1>
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
          <CardTitle>Updates & Alerts</CardTitle>
          <CardDescription>Stay informed about your requests and important updates.</CardDescription>
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
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                        Mark Read
                      </Button>
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
