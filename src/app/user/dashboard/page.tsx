// User dashboard for Nest by Eden Oasis. Provides real-time asset management, stats, and notifications.

"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Box, Search, ArrowUpDown, ArrowUpRight, Activity, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnnouncementsWidget } from "@/components/dashboard/AnnouncementsWidget";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PopularGearWidget } from "@/components/dashboard/PopularGearWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError, logInfo } from '@/lib/logger';
import { logger } from '@/utils/logger';
import { useToast } from "@/hooks/use-toast";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";
import React from 'react';
import { apiGet } from '@/lib/apiClient';

// User profile data structure
interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  email: string | null;
  role: 'Admin' | 'User';
  status: 'Active' | 'Inactive' | 'Suspended';
}

// Simplified gear interface for dashboard statistics
interface Gear {
  id: string;
  name?: string;
  due_date: string | null;
  status?: string;
  checked_out_to?: string; // Added for user-specific stats
}

/**
 * Main user dashboard component with real-time asset management interface.
 * Manages user statistics, notifications, and real-time subscriptions.
 */
export default function UserDashboardPage() {
  const { toast } = useToast();
  const supabase = createClient();

  // Dashboard statistics state
  const [userStats, setUserStats] = useState([
    {
      title: 'Checked Out Gears',
      value: 0,
      icon: PackageCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/user/my-requests',
      description: 'Currently in your possession'
    },
    {
      title: 'Overdue Gears',
      value: 0,
      icon: Clock,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      link: '/user/check-in',
      description: 'Past due date - please return'
    },
    {
      title: 'Available Gears',
      value: 0,
      icon: Box,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/user/browse',
      description: 'Ready for checkout'
    },
  ]);

  // const [notificationCount, setNotificationCount] = useState(0); // No longer used
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<Profile | null>(null);
  const hasLogged = useRef(false);
  // error state removed

  // Refactored: Fetch all stats in one go to avoid race conditions
  const fetchAllStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }
      // Fetch both in parallel
      const [checkoutsRes, availableRes] = await Promise.all([
        apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?status=Checked%20Out`),
        apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?status=Available&pageSize=1000`)
      ]);
      const checkouts = checkoutsRes.data || [];
      const available = availableRes.data || [];
      const now = new Date();
      const checkedOutGears = checkouts.filter((gear: Gear) => gear.checked_out_to === session.user.id);
      const overdueGears = checkedOutGears.filter((gear: Gear) => gear.due_date && new Date(gear.due_date) < now);
      setUserStats(prev => [
        { ...prev[0], value: checkedOutGears.length },
        { ...prev[1], value: overdueGears.length },
        { ...prev[2], value: available.length }
      ]);
    } catch {
      // error handling (toast/log) only
    }
  };

  // Fetch unread notification count
  const fetchNotificationCount = async () => {
    try {
      logInfo('Starting notification count fetch', 'fetchNotificationCount');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        logError(sessionError, 'fetchNotificationCount', { stage: 'getSession', error: sessionError });
        throw sessionError;
      }
      if (!session?.user) {
        const noSessionError = new Error('No active session found');
        logError(noSessionError, 'fetchNotificationCount', { stage: 'checkSession' });
        throw noSessionError;
      }
      logInfo('Fetching notifications', 'fetchNotificationCount', { userId: session.user.id, timestamp: new Date().toISOString() });
      const { data: profileData, error: profileError } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/profile`);
      console.log('Profile API response:', profileData, profileError);
      if (profileError) {
        logError(profileError, 'fetchNotificationCount', { stage: 'fetchProfile', userId: session.user.id, error: profileError });
        throw new Error('Failed to verify user access');
      }
      if (!profileData) {
        const noProfileError = new Error('User profile not found');
        logError(noProfileError, 'fetchNotificationCount', { stage: 'checkProfile', userId: session.user.id });
        throw noProfileError;
      }
      const { data: unreadCountData, error: unreadCountError } = await apiGet<{ data: number; error: string | null }>(`/api/notifications/unread-count?userId=${session.user.id}`);
      console.log('Unread notifications API response:', unreadCountData, unreadCountError);
      if (unreadCountError) {
        logError(unreadCountError, 'fetchNotificationCount', { stage: 'fetchNotifications', userId: session.user.id, error: unreadCountError, userProfile: { role: profileData.role, status: profileData.status } });
        throw new Error(unreadCountError);
      }
      const count = unreadCountData || 0;
      logInfo('Successfully fetched notifications', 'fetchNotificationCount', { userId: session.user.id, count, userProfile: { role: profileData.role, status: profileData.status } });
      // setNotificationCount(count); // No longer used
    } catch (error: unknown) {
      const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };
      logger.error('Error fetching notification count:', errorDetails);
      toast({ title: 'Error', description: 'Failed to fetch notification count.', variant: 'destructive' });
    }
  };

  // Dashboard setup effect (fetch user profile)
  useEffect(() => {
    console.log('UserDashboardPage useEffect ran');
    let mounted = true;
    let cleanup: (() => void) | undefined;
    const dataCache = new Map();
    let refreshTimeoutId: NodeJS.Timeout | null = null;
    const setupDashboard = async () => {
      if (hasLogged.current) return; // Prevent repeated logging
      hasLogged.current = true;
      try {
        setIsLoading(true);
        logInfo('Starting dashboard setup', 'setupDashboard');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          logError(sessionError, 'setupDashboard', { stage: 'getSession' });
          throw sessionError;
        }
        if (!session?.user) {
          const noUserError = new Error('No authenticated user found');
          logError(noUserError, 'setupUser', { stage: 'checkUser' });
          throw noUserError;
        }
        logInfo('Session found', 'setupDashboard', { userId: session.user.id });
        const { data: profile, error: profileError } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/profile`);
        console.log('Profile API response:', profile, profileError);
        if (profileError) {
          logError(profileError, 'setupDashboard', { stage: 'fetchProfile', userId: session.user.id });
          console.error('Error fetching user profile:', profileError);
        } else if (profile && mounted) {
          logInfo('Profile fetched successfully', 'setupDashboard', { userId: session.user.id, hasProfile: !!profile });
          setUserData(profile);
        }
        if (mounted) {
          logInfo('Starting parallel data fetches', 'setupDashboard');
          await fetchAllStats();
          await fetchNotificationCount();
          logInfo('Parallel data fetches completed', 'setupDashboard');
          const dashboardSubscription = createSupabaseSubscription({
            supabase,
            channel: 'user-dashboard-all-changes',
            config: {
              event: '*',
              schema: 'public',
              table: 'gears'
            },
            callback: () => {
              if (refreshTimeoutId) {
                clearTimeout(refreshTimeoutId);
              }
              refreshTimeoutId = setTimeout(() => {
                fetchAllStats();
                dataCache.set(`dashboard-${session.user.id}`, {
                  timestamp: Date.now(),
                  // ... cache logic if needed ...
                });
              }, 1000);
            },
            pollingInterval: 30000
          });
          cleanup = () => {
            dashboardSubscription.unsubscribe();
            if (refreshTimeoutId) {
              clearTimeout(refreshTimeoutId);
            }
            dataCache.clear();
          };
        }
      } catch (error) {
        logError(error, 'setupDashboard', {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorDetails: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
        console.error('Error in setupDashboard:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try refreshing the page.",
          variant: "destructive"
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
          logInfo('Dashboard setup completed', 'setupDashboard', { success: !isLoading });
        }
      }
    };
    setupDashboard();
    return () => {
      if (cleanup) {
        cleanup();
      }
      mounted = false;
    };
  }, [supabase, toast]);

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

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground truncate">
              Welcome back, {userData?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg">
              {userData?.department ? `${userData.department} Department` : 'Dashboard'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
            <Link href="/user/browse" className="w-full sm:w-auto">
              <Button className="gap-2 w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
                <Search className="h-4 w-4" />
                <span className="hidden xs:inline">Browse Gear</span>
                <span className="xs:hidden">Browse</span>
              </Button>
            </Link>
            <Link href="/user/check-in" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden xs:inline">Check-in Gear</span>
                <span className="xs:hidden">Check-in</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <QuickActions />
        </motion.div>

        {/* Stats Cards */}
        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {userStats.map((stat, i) => (
              <motion.div
                key={stat.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="w-full"
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold flex items-center gap-2 truncate">
                      {React.createElement(stat.icon, { className: `h-5 w-5 sm:h-6 sm:w-6 ${stat.color} flex-shrink-0` })}
                      <span className="truncate">{stat.title}</span>
                    </CardTitle>
                    <Badge
                      className={
                        'text-xs sm:text-sm px-2 sm:px-3 py-1 font-bold shadow-none flex-shrink-0 ' +
                        (stat.title === 'Checked Out Gears' ? 'bg-blue-600 text-white' :
                          stat.title === 'Overdue Gears' ? 'bg-red-600 text-white' :
                            stat.title === 'Available Gears' ? 'bg-green-600 text-white' :
                              'bg-gray-600 text-white')
                      }
                    >
                      {stat.value}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">{stat.description}</p>
                    {stat.value === 0 && (
                      <div className="text-xs text-muted-foreground italic">No {stat.title.toLowerCase()}.</div>
                    )}
                    <Link href={stat.link} className="text-blue-500 hover:underline text-xs sm:text-sm inline-flex items-center gap-1">
                      View details
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column */}
          <div className="space-y-6 sm:space-y-8">
            <UpcomingEvents />
            <PopularGearWidget />
          </div>

          {/* Right Column - Combined Activity and Announcements */}
          <div className="space-y-6 sm:space-y-8">
            <Card className="h-fit">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Activity & Announcements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 divide-y">
                  <div className="p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-medium mb-3 sm:mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recent Activity
                    </h3>
                    <RecentActivity embedded={true} />
                  </div>
                  <div className="p-4 sm:p-6">
                    <h3 className="text-sm sm:text-base font-medium mb-3 sm:mb-4 flex items-center gap-2">
                      <Megaphone className="h-4 w-4" />
                      Announcements
                    </h3>
                    <AnnouncementsWidget embedded={true} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}