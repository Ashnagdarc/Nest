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

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('/sounds/notification.mp3');
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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data.map(n => ({
        id: n.id,
        type: n.type,
        content: n.message || n.content,
        timestamp: new Date(n.created_at),
        read: n.read,
        link: n.link,
        metadata: n.metadata
      })));
    }
  }

  // Set up real-time listener for new notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
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
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
        <div className="flex gap-2">
          <Button variant={filter === 'unread' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('unread')}>
            Unread ({unreadCount})
          </Button>
          <Button variant={filter === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={notifications.filter(n => !n.read).length === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="all">
                    All
                    {unreadCount > 0 && <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="gear_requests">
                    Gear Requests
                    {gearRequestCount > 0 && <Badge variant="secondary" className="ml-2">{gearRequestCount}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="system">
                    System
                    {systemCount > 0 && <Badge variant="secondary" className="ml-2">{systemCount}</Badge>}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
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
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border ${notification.read ? 'bg-background' : 'bg-primary/5 font-medium border-primary/20'}`}
                    >
                      <div className="flex items-start sm:items-center gap-3 mb-2 sm:mb-0">
                        <div className="mt-1">
                          {getIconForType(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 items-center mb-1">
                            {getStatusBadge(notification.type)}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{notification.content}</p>
                          {notification.timestamp && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(notification.timestamp, 'PPp')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 ml-8 sm:ml-0">
                        {(notification.type === 'new_request' || notification.link) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRequest(notification)}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                        )}
                        {!notification.read && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BellRing className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p>No notifications found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-enabled" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Sound Notifications
                  </Label>
                  <Switch
                    id="sound-enabled"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Play sound when new notifications arrive
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="volume" className="flex items-center justify-between">
                  Volume
                  <span className="text-xs text-muted-foreground">{soundVolume}%</span>
                </Label>
                <Slider
                  id="volume"
                  min={0}
                  max={100}
                  step={5}
                  value={[soundVolume]}
                  onValueChange={(value) => setSoundVolume(value[0])}
                  disabled={!soundEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sound-type">Notification Sound</Label>
                <Select
                  value={soundType}
                  onValueChange={setSoundType}
                  disabled={!soundEnabled}
                >
                  <SelectTrigger id="sound-type">
                    <SelectValue placeholder="Select sound" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bell">Bell</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="ding">Ding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={playTestSound}
                disabled={!soundEnabled}
                className="w-full"
              >
                Test Sound
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
