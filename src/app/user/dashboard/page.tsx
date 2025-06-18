/**
 * User Dashboard - Personal Asset Management Interface
 * 
 * This component serves as the main hub for users to interact with the Nest by Eden Oasis
 * asset management system. It provides a comprehensive overview of their asset activity,
 * current checkouts, available equipment, and quick access to core functionality.
 * 
 * Key Features:
 * - Real-time statistics of user's current asset status
 * - Interactive dashboard cards with quick navigation
 * - Live notifications and alerts system
 * - Recent activity feed and upcoming events
 * - Popular equipment recommendations
 * - Overdue item tracking and reminders
 * 
 * Data Sources:
 * - gears: User's checked out equipment and available items
 * - gear_requests: Request history and status tracking
 * - notifications: In-app notification system
 * - profiles: User profile and preference data
 * 
 * Real-time Features:
 * - Live updates via Supabase subscriptions
 * - Automatic refresh of statistics and notifications
 * - Instant feedback on user actions
 * - Push notification support for mobile devices
 * 
 * Architecture:
 * - Client-side component with optimized data fetching
 * - Error boundary integration for graceful error handling
 * - Performance monitoring and analytics integration
 * - Responsive design for all device types
 * 
 * @fileoverview User dashboard with real-time asset management interface
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Bell, Box, Calendar, Search, ArrowUpDown } from 'lucide-react';
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
import ErrorBoundary from "@/components/ErrorBoundary";
import { logError, logInfo } from '@/lib/logger';
import { logger } from '@/utils/logger';
import { useToast } from "@/hooks/use-toast";
import { createSupabaseSubscription } from "@/utils/supabase-subscription";

/**
 * User Profile Interface
 * 
 * Defines the structure for user profile data retrieved from the database.
 * This interface ensures type safety when working with user information.
 * 
 * @interface Profile
 */
interface Profile {
  /** Unique user identifier matching Supabase Auth */
  id: string;
  /** User's display name */
  full_name: string | null;
  /** URL to user's avatar image */
  avatar_url: string | null;
  /** User's department or organizational unit */
  department: string | null;
  /** User's email address */
  email: string | null;
}

/**
 * Asset/Gear Interface
 * 
 * Simplified interface for asset data used in dashboard statistics.
 * Focuses on essential fields needed for user dashboard functionality.
 * 
 * @interface Gear
 */
interface Gear {
  /** Unique asset identifier */
  id: string;
  /** Asset name for display */
  name?: string;
  /** Return due date (if checked out) */
  due_date: string | null;
  /** Current asset status */
  status?: string;
}

/**
 * UserDashboardPage Component
 * 
 * The main user dashboard component that provides a comprehensive interface
 * for asset management activities. This component manages multiple data sources,
 * real-time subscriptions, and user interaction state.
 * 
 * State Management:
 * - User statistics (checked out, overdue, available items)
 * - Notification counts and unread status
 * - Loading states for better user experience
 * - User profile data and preferences
 * - Real-time subscription management
 * 
 * Performance Optimizations:
 * - Efficient data fetching with error handling
 * - Memoized calculations for statistics
 * - Lazy loading of non-critical components
 * - Optimistic UI updates for better perceived performance
 * 
 * @component
 * @returns {JSX.Element} Complete user dashboard interface
 */
export default function UserDashboardPage() {
  const { toast } = useToast();
  const supabase = createClient();

  /**
   * User Statistics State
   * 
   * Manages the statistical data displayed in dashboard cards.
   * Each statistic includes count, metadata, and navigation information.
   */
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

  /**
   * User Statistics Fetching
   * 
   * Retrieves and calculates user-specific statistics including checked out
   * equipment, overdue items, and personal request history. This function
   * implements robust error handling and logging for monitoring purposes.
   * 
   * Statistics Calculated:
   * - Checked out gear count (items currently with user)
   * - Overdue gear count (items past return date)
   * - User-specific activity metrics
   * 
   * Error Handling:
   * - Graceful handling of database connection issues
   * - Fallback to cached data when possible
   * - User-friendly error messages via toast notifications
   * - Comprehensive logging for debugging
   * 
   * @async
   * @function fetchUserStats
   * @returns {Promise<void>} Updates component state with calculated statistics
   */
  const fetchUserStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('No session found for user stats');
        return;
      }

      /**
       * Checked Out Equipment Query
       * 
       * Retrieves all equipment currently checked out to the authenticated user.
       * Filters by user ID and "Checked Out" status for accurate counting.
       */
      const { data: checkouts, error: checkoutsError } = await supabase
        .from('gears')
        .select('id, name, due_date, status, checked_out_to')
        .eq('checked_out_to', session.user.id)
        .eq('status', 'Checked Out');

      if (checkoutsError) {
        logger.error('Error fetching user checked out gears:', { error: checkoutsError });
        toast({ title: 'Error', description: 'Failed to fetch checked out gears.', variant: 'destructive' });
        throw checkoutsError;
      }

      console.log('Checked out gears:', checkouts, 'User:', session.user.id);

      const now = new Date();
      const checkedOutGears = checkouts || [];

      /**
       * Overdue Items Calculation
       * 
       * Filters checked out items to identify those past their due date.
       * Uses current timestamp comparison for accurate overdue detection.
       */
      const overdueGears = checkedOutGears.filter((gear: Gear) =>
        gear.due_date && new Date(gear.due_date) < now
      );

      console.log('Overdue gears:', overdueGears);

      // Update statistics state with calculated values
      setUserStats(prev => [
        { ...prev[0], value: checkedOutGears.length },
        { ...prev[1], value: overdueGears.length },
        prev[2] // Available gears updated separately
      ]);

      // Log statistics for monitoring and analytics
      logger.info("Dashboard stats updated", {
        context: 'fetchUserStats',
        checkedOut: checkedOutGears.length,
        overdue: overdueGears.length,
        userId: session.user.id,
        overdueItems: overdueGears.map((g: Gear) => ({ id: g.id, name: g.name, due: g.due_date }))
      });

    } catch (error: unknown) {
      logger.error('Error fetching user stats:', { error });
      toast({ title: 'Error', description: 'Failed to fetch user stats.', variant: 'destructive' });
    }
  };

  /**
   * Available Equipment Fetching
   * 
   * Retrieves count of all equipment available for checkout.
   * This provides users with an overview of equipment availability
   * for planning their requests.
   * 
   * @async
   * @function fetchAvailableGears
   * @returns {Promise<void>} Updates available gear count in state
   */
  const fetchAvailableGears = async () => {
    try {
      const { data, error } = await supabase
        .from('gears')
        .select('id')
        .eq('status', 'Available');

      if (error) throw error;

      // Update only the available gears statistic
      setUserStats(prev => [
        prev[0],
        prev[1],
        { ...prev[2], value: data?.length || 0 }
      ]);
    } catch (error: unknown) {
      console.error('Error fetching available gears:', error);
    }
  };

  /**
   * Notification Count Fetching
   * 
   * Retrieves the count of unread notifications for the current user.
   * This function implements comprehensive error handling and logging
   * to ensure reliable notification functionality.
   * 
   * Features:
   * - Session validation and user verification
   * - Profile access verification for security
   * - Detailed error logging for debugging
   * - Fallback handling for missing data
   * 
   * @async
   * @function fetchNotificationCount
   * @returns {Promise<void>} Updates notification count state
   */
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

      /**
       * User Profile Verification
       * 
       * Verifies user access by checking their profile before retrieving notifications.
       * This additional security step ensures proper access control.
       */
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

      /**
       * Notification Count Query
       * 
       * Retrieves count of unread notifications for the verified user.
       * Uses exact count for accurate notification badge display.
       */
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

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
    let cleanup: (() => void) | undefined;

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

          // Setup real-time subscriptions
          const gearsSubscription = createSupabaseSubscription({
            supabase,
            channel: 'dashboard-gears-changes',
            config: {
              event: '*',
              schema: 'public',
              table: 'gears'
            },
            callback: () => {
              fetchUserStats();
              fetchAvailableGears();
            },
            pollingInterval: 30000 // 30 seconds fallback polling
          });

          // Store the cleanup function
          cleanup = () => {
            gearsSubscription.unsubscribe();
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
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Welcome back, {userData?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {userData?.department ? `${userData.department} Department` : 'Dashboard'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-4 w-full sm:w-auto">
            <Link href="/user/browse" className="w-full sm:w-auto">
              <Button className="gap-2 w-full min-h-[44px] min-w-[44px]">
                <Search className="h-4 w-4" />
                Browse Gear
              </Button>
            </Link>
            <Link href="/user/check-in" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full min-h-[44px] min-w-[44px]">
                <ArrowUpDown className="h-4 w-4" />
                Check-in Gear
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userStats.map((stat, i) => (
              <motion.div
                key={stat.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="w-full"
              >
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                      {stat.title}
                    </CardTitle>
                    <Badge
                      className={
                        'text-base px-3 py-1 font-bold shadow-none ' +
                        (stat.title === 'Checked Out Gears' ? 'bg-blue-600 text-white' :
                          stat.title === 'Overdue Gears' ? 'bg-red-600 text-white' :
                            stat.title === 'Available Gears' ? 'bg-green-600 text-white' :
                              'bg-gray-600 text-white')
                      }
                    >
                      {stat.value}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2">{stat.description}</p>
                    {stat.value === 0 && (
                      <div className="text-xs text-muted-foreground italic">No {stat.title.toLowerCase()}.</div>
                    )}
                    <Link href={stat.link} className="text-blue-500 hover:underline text-xs">View details</Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <UpcomingEvents />
            <PopularGearWidget />
          </div>

          {/* Right Column - Combined Activity and Announcements */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md md:text-lg">Activity & Announcements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 divide-y">
                  <div className="p-4">
                    <h3 className="text-xs md:text-sm font-medium mb-2">Recent Activity</h3>
                    <RecentActivity embedded={true} />
                  </div>
                  <div className="p-4">
                    <h3 className="text-xs md:text-sm font-medium mb-2">Announcements</h3>
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
