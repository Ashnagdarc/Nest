"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Bell, Box, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import UserLayout from '../layout'; // Assume UserLayout handles sidebar/header
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnnouncementsWidget } from "@/components/dashboard/AnnouncementsWidget";
// Temporarily comment out Joyride
// import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import type { Database } from '@/types/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { LoadingState } from "@/components/ui/loading-state";
import ErrorBoundary from "@/components/ErrorBoundary";
import { createErrorLogger } from "@/lib/error-handling";
import { useToast } from "@/hooks/use-toast";

interface Gear {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  image_url?: string | null;
  checked_out_to?: string | null;
  current_request_id?: string | null;
  last_checkout_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface GearRequest {
  id: string;
  user_id: string;
  gear_ids?: string[];
  status: string;
  request_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type Profile = Database['public']['Tables']['profiles']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

type RealtimeGearPayload = RealtimePostgresChangesPayload<{
  old: Gear | null;
  new: Gear;
}>;

type RealtimeGearRequestPayload = RealtimePostgresChangesPayload<{
  old: GearRequest | null;
  new: GearRequest;
}>;

type RealtimeNotificationPayload = RealtimePostgresChangesPayload<{
  old: Notification | null;
  new: Notification;
}>;

type GearStatusPayload = {
  old: {
    status?: string;
    checked_out_to?: string;
  } | null;
  new: {
    status?: string;
    checked_out_to?: string;
  };
};

const logError = createErrorLogger('UserDashboard');

export default function UserDashboardPage() {
  const { toast } = useToast();
  const supabase = createClient();
  const [userStats, setUserStats] = useState([
    {
      title: 'Checked Out Gears',
      value: 0,
      icon: PackageCheck,
      color: 'text-blue-500',
      link: '/user/my-requests',
      description: 'Currently in your possession'
    },
    {
      title: 'Overdue Gears',
      value: 0,
      icon: Clock,
      color: 'text-red-500',
      link: '/user/check-in',
      description: 'Past due date - please return'
    },
    {
      title: 'Available Gears',
      value: 0,
      icon: Box,
      color: 'text-green-500',
      link: '/user/browse',
      description: 'Ready for checkout'
    },
  ]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<Profile | null>(null);
  // Temporarily comment out tour state
  // const [showTour, setShowTour] = useState(false);
  // const steps: Step[] = [
  //   {
  //     target: '.user-stats-cards',
  //     content: 'See your checked out and overdue gear at a glance.',
  //     disableBeacon: true,
  //   },
  //   {
  //     target: '.user-notifications-btn',
  //     content: 'Check your notifications here.',
  //   },
  //   {
  //     target: '.user-quick-actions',
  //     content: 'Quickly browse, request, or check-in gear.',
  //   },
  // ];

  useEffect(() => {
    let mounted = true;

    const setupDashboard = async () => {
      try {
        setIsLoading(true);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) {
          throw new Error('No authenticated user found');
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else if (profile && mounted) {
          setUserData(profile);
        }

        // Initial data fetch with error handling
        if (mounted) {
          await Promise.all([
            fetchUserStats().catch(error => {
              logError(error, 'fetching user stats');
              return null;
            }),
            fetchAvailableGears().catch(error => {
              logError(error, 'fetching available gears');
              return null;
            }),
            fetchNotificationCount().catch(error => {
              logError(error, 'fetching notification count');
              return null;
            })
          ]);
        }

        // Set up real-time subscriptions with payload type checking
        const channels = [
          // Gears channel - listen for any changes that might affect user's checkouts
          supabase.channel('public:gears')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'gears' },
              async (payload: { old: GearStatusPayload['old']; new: GearStatusPayload['new'] }) => {
                console.log('Gears change received:', payload);
                if (mounted) {
                  const oldStatus = payload.old?.status?.toLowerCase();
                  const newStatus = payload.new?.status?.toLowerCase();
                  const affectsUser =
                    payload.new?.checked_out_to === session.user.id ||
                    payload.old?.checked_out_to === session.user.id ||
                    newStatus === 'available' ||
                    oldStatus === 'available';

                  if (affectsUser) {
                    await fetchUserStats();
                    await fetchAvailableGears();
                  }
                }
              }
            ),

          // Gear requests channel - filter for user's requests
          supabase.channel('public:gear_requests')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'gear_requests',
                filter: `user_id=eq.${session.user.id}`
              },
              async (payload: RealtimeGearRequestPayload) => {
                console.log('Gear requests change received:', payload);
                if (mounted) {
                  await fetchUserStats();
                }
              }
            ),

          // Notifications channel
          supabase.channel('public:notifications')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${session.user.id}`
              },
              async (payload: RealtimeNotificationPayload) => {
                console.log('Notifications change received:', payload);
                if (mounted) {
                  await fetchNotificationCount();
                }
              }
            )
        ];

        // Subscribe to all channels
        await Promise.all(channels.map(channel => channel.subscribe()));

        // Return cleanup function
        return () => {
          channels.forEach(channel => {
            supabase.removeChannel(channel);
          });
        };

      } catch (error) {
        logError(error, 'setting up dashboard');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setupDashboard();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array since we want this to run once on mount

  async function fetchUserStats() {
    try {
      // Get current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }

      const userId = session.user.id;
      console.log('Fetching stats for user:', userId);

      // First, get all checked out gears directly from gears table
      const { data: directCheckouts, error: directError } = await supabase
        .from('gears')
        .select('id, status, due_date')
        .eq('checked_out_to', userId)
        .or('status.eq.Checked Out,status.eq.checked out');

      if (directError) {
        console.error('Error fetching direct checkouts:', directError);
        throw directError;
      }

      // Then, get all gear requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('gear_requests')
        .select('id, status, due_date, gear_ids')
        .eq('user_id', userId)
        .or('status.eq.Approved,status.eq.Checked Out');

      if (requestsError) {
        console.error('Error fetching gear requests:', requestsError.message || requestsError);
        throw new Error(requestsError.message || 'Failed to fetch gear requests');
      }

      console.log('Direct checkouts:', directCheckouts);
      console.log('Requests data:', requestsData);

      let checkedOutGearCount = 0;
      let overdueGearCount = 0;
      const now = new Date();
      const checkedGearIds = new Set<string>();

      // Process direct checkouts
      if (directCheckouts) {
        directCheckouts.forEach((gear: Gear) => {
          if (!checkedGearIds.has(gear.id)) {
            checkedOutGearCount++;
            checkedGearIds.add(gear.id);
            if (gear.due_date && new Date(gear.due_date) < now) {
              overdueGearCount++;
            }
          }
        });
      }

      // Process gear requests
      if (requestsData) {
        for (const request of requestsData) {
          if (request.gear_ids && Array.isArray(request.gear_ids)) {
            // Verify each gear's current status
            const { data: currentGearStatuses, error: statusError } = await supabase
              .from('gears')
              .select('id, status, checked_out_to, due_date')
              .in('id', request.gear_ids);

            if (statusError) {
              console.error('Error fetching gear statuses:', statusError);
              continue;
            }

            currentGearStatuses?.forEach((gear: Gear) => {
              if (
                gear.checked_out_to === userId &&
                !checkedGearIds.has(gear.id)
              ) {
                checkedOutGearCount++;
                checkedGearIds.add(gear.id);
                if (gear.due_date && new Date(gear.due_date) < now) {
                  overdueGearCount++;
                }
              }
            });
          }
        }
      }

      // Get available gears count
      const { count: availableCount, error: availableError } = await supabase
        .from('gears')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Available');

      if (availableError) {
        console.error('Error fetching available gears:', availableError);
        throw availableError;
      }

      // Log the counts for debugging
      console.log('Final gear counts:', {
        checkedOut: checkedOutGearCount,
        overdue: overdueGearCount,
        available: availableCount || 0,
        directCheckouts: directCheckouts?.length || 0,
        approvedRequests: requestsData?.length || 0,
        checkedGearIds: Array.from(checkedGearIds)
      });

      // Update the stats
      setUserStats(prev => [
        {
          ...prev[0],
          value: checkedOutGearCount
        },
        {
          ...prev[1],
          value: overdueGearCount
        },
        {
          ...prev[2],
          value: availableCount || 0
        }
      ]);

    } catch (error: any) {
      console.error('Exception in fetchUserStats:', error.message || error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? `Error: ${error.message}`
          : "An unexpected error occurred while fetching stats.",
        variant: "destructive"
      });
    }
  }

  async function fetchAvailableGears() {
    // Fetch available gears count
    const { data, error } = await supabase
      .from('gears')
      .select('id')
      .eq('status', 'Available');

    if (!error && data) {
      // Update only the third item (Available Gears)
      setUserStats(prev => [
        prev[0], // Keep the Checked Out Gears item
        prev[1], // Keep the Overdue Gears item
        { ...prev[2], value: data.length }, // Update Available Gears value
      ]);
    }
  }

  async function fetchNotificationCount() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        console.log('No user ID found');
        return;
      }

      // Get IDs of read notifications
      const { data: readRows, error: readError } = await supabase
        .from('read_notifications')
        .select('notification_id')
        .eq('user_id', userId);

      if (readError) {
        console.error('Error fetching read notifications:', readError);
        return;
      }

      const readIds = readRows?.map((r: { notification_id: string }) => r.notification_id) || [];

      // Get all notifications for the user
      const { data: allNotifications, error: notifError } = await supabase
        .from('notifications')
        .select('id, created_at')  // Only select what you need
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
        return;
      }

      // Calculate unread count
      const unreadCount = (allNotifications || [])
        .filter((n: { id: string }) => !readIds.includes(n.id))
        .length;

      console.log(`Unread notifications count: ${unreadCount}`);
      setNotificationCount(unreadCount);

    } catch (error) {
      console.error('Error in fetchNotificationCount:', error);
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  // Temporarily comment out tour callback
  // const handleTourCallback = (data: CallBackProps) => {
  //   const { status } = data;
  //   if (status === 'finished' || status === 'skipped') {
  //     setShowTour(false);
  //     localStorage.setItem('user_dashboard_tour_done', '1');
  //   }
  // };

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {userData?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {userData?.department ? `${userData.department} Department` : 'Dashboard'}
            </p>
          </div>
          <Link href="/user/notifications" passHref>
            <Button variant="ghost" size="icon" className="relative user-notifications-btn">
              <Bell className="h-6 w-6" />
              {notificationCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </Link>
        </motion.div>

        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 user-stats-cards">
            {userStats.map((stat, index) => (
              <motion.div key={stat.title} custom={index} initial="hidden" animate="visible" variants={cardVariants}>
                <Link href={stat.link} passHref>
                  <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="user-quick-actions"
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Link href="/user/browse" passHref>
                <Button className="w-full sm:w-auto">Browse & Request Gear</Button>
              </Link>
              <Link href="/user/check-in">
                <Button variant="outline" className="w-full sm:w-auto">Check-in Gear</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcements Widget */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
          <ErrorBoundary fallback={
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Unable to load announcements</p>
              </CardContent>
            </Card>
          }>
            <AnnouncementsWidget />
          </ErrorBoundary>
        </div>

        {/* Updated NotificationSound usage */}
        <NotificationSound count={notificationCount} />
      </div>
    </ErrorBoundary>
  );
}

// Updated NotificationSound component with proper TypeScript and error handling
interface NotificationSoundProps {
  count: number;
}

function NotificationSound({ count }: NotificationSoundProps) {
  const [audioError, setAudioError] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { toast } = useToast();

  // Add effect to track user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      // Remove listeners after first interaction
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };

    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('touchstart', handleUserInteraction);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    if (count > 0 && !audioError && hasUserInteracted) {
      try {
        audio = new Audio('/sounds/notification.mp3');
        audio.loop = true;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Audio playback failed:", error);
            setAudioError(true);
            toast({
              title: "Sound Playback Failed",
              description: "Could not play the notification sound. Please check your browser settings.",
              variant: "destructive",
            });
          });
        }
      } catch (error) {
        console.error("Error creating audio:", error);
        setAudioError(true);
        toast({
          title: "Sound Initialization Failed",
          description: "Could not initialize the notification sound. Please check your browser settings.",
          variant: "destructive",
        });
      }
    } else if (count > 0 && !hasUserInteracted) {
      toast({
        title: "Sound Playback",
        description: "Please interact with the page first (click anywhere) to enable notification sounds.",
        variant: "default",
      });
    }

    return () => {
      if (audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          console.error("Error cleaning up audio:", error);
        }
      }
    };
  }, [count, audioError, hasUserInteracted, toast]);

  return null;
}
