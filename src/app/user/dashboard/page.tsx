"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Bell, Box, Calendar, Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnnouncementsWidget } from "@/components/dashboard/AnnouncementsWidget";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LoadingState } from "@/components/ui/loading-state";
import ErrorBoundary from "@/components/ErrorBoundary";
import { logError, logInfo } from '@/lib/logger';
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  email: string | null;
}

interface Gear {
  id: string;
  due_date: string | null;
}

export default function UserDashboardPage() {
  const { toast } = useToast();
  const supabase = createClient();
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<Profile | null>(null);

  // Fetch user stats
  const fetchUserStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: checkouts, error: checkoutsError } = await supabase
        .from('gears')
        .select('id, due_date')
        .eq('checked_out_to', session.user.id);

      if (checkoutsError) throw checkoutsError;

      const now = new Date();
      const checkedOutCount = checkouts?.length || 0;
      const overdueCount = checkouts?.filter((gear: Gear) =>
        gear.due_date && new Date(gear.due_date) < now
      ).length || 0;

      setUserStats(prev => [
        { ...prev[0], value: checkedOutCount },
        { ...prev[1], value: overdueCount },
        prev[2]
      ]);
    } catch (error: unknown) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Fetch available gears
  const fetchAvailableGears = async () => {
    try {
      const { data, error } = await supabase
        .from('gears')
        .select('id')
        .eq('status', 'Available');

      if (error) throw error;

      setUserStats(prev => [
        prev[0],
        prev[1],
        { ...prev[2], value: data?.length || 0 }
      ]);
    } catch (error: unknown) {
      console.error('Error fetching available gears:', error);
    }
  };

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      logInfo('Starting notification count fetch', 'fetchNotificationCount');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        logError(sessionError, 'fetchNotificationCount', {
          stage: 'getSession',
          error: sessionError
        });
        throw sessionError;
      }

      if (!session?.user) {
        const noSessionError = new Error('No active session found');
        logError(noSessionError, 'fetchNotificationCount', {
          stage: 'checkSession'
        });
        throw noSessionError;
      }

      logInfo('Fetching notifications', 'fetchNotificationCount', {
        userId: session.user.id,
        timestamp: new Date().toISOString()
      });

      // First, verify user access by checking their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, status')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        logError(profileError, 'fetchNotificationCount', {
          stage: 'fetchProfile',
          userId: session.user.id,
          error: {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details
          }
        });
        throw new Error('Failed to verify user access');
      }

      if (!profileData) {
        const noProfileError = new Error('User profile not found');
        logError(noProfileError, 'fetchNotificationCount', {
          stage: 'checkProfile',
          userId: session.user.id
        });
        throw noProfileError;
      }

      // Now fetch notifications count with detailed error logging
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('read', false);

      if (error) {
        logError(error, 'fetchNotificationCount', {
          stage: 'fetchNotifications',
          userId: session.user.id,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          },
          userProfile: {
            role: profileData.role,
            status: profileData.status
          }
        });
        throw error;
      }

      const count = data?.length || 0;
      logInfo('Successfully fetched notifications', 'fetchNotificationCount', {
        userId: session.user.id,
        count,
        userProfile: {
          role: profileData.role,
          status: profileData.status
        }
      });

      setNotificationCount(count);
    } catch (error: unknown) {
      const errorDetails = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : { error };

      logError(error, 'fetchNotificationCount', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        ...errorDetails,
        timestamp: new Date().toISOString()
      });

      // Set count to 0 on error to prevent UI issues
      setNotificationCount(0);

      // Show error toast to user
      toast({
        title: "Error",
        description: "Failed to fetch notifications. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    const setupDashboard = async () => {
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
          logError(noUserError, 'setupDashboard', { stage: 'checkUser' });
          throw noUserError;
        }

        logInfo('Session found', 'setupDashboard', { userId: session.user.id });

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          logError(profileError, 'setupDashboard', {
            stage: 'fetchProfile',
            userId: session.user.id
          });
          console.error('Error fetching user profile:', profileError);
        } else if (profile && mounted) {
          logInfo('Profile fetched successfully', 'setupDashboard', {
            userId: session.user.id,
            hasProfile: !!profile
          });
          setUserData(profile);
        }

        // Initial data fetch with error handling
        if (mounted) {
          logInfo('Starting parallel data fetches', 'setupDashboard');
          await Promise.all([
            fetchUserStats().catch(error => {
              logError(error, 'setupDashboard', {
                stage: 'fetchUserStats',
                userId: session.user.id
              });
              return null;
            }),
            fetchAvailableGears().catch(error => {
              logError(error, 'setupDashboard', {
                stage: 'fetchAvailableGears',
                userId: session.user.id
              });
              return null;
            }),
            fetchNotificationCount().catch(error => {
              logError(error, 'setupDashboard', {
                stage: 'fetchNotificationCount',
                userId: session.user.id,
                error: JSON.stringify(error, Object.getOwnPropertyNames(error))
              });
              return null;
            })
          ]);
          logInfo('Parallel data fetches completed', 'setupDashboard');
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
    return () => { mounted = false; };
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
      <div className="container mx-auto py-6 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {userData?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {userData?.department ? `${userData.department} Department` : 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/user/browse">
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Browse Gear
              </Button>
            </Link>
            <Link href="/user/check-in">
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Check-in Gear
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {isLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {userStats.map((stat, index) => (
              <motion.div key={stat.title} custom={index} initial="hidden" animate="visible" variants={cardVariants}>
                <Link href={stat.link} passHref>
                  <Card className="shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-full ${stat.bgColor}`}>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <UpcomingEvents />
            <AnnouncementsWidget />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <RecentActivity />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
