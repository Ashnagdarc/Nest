"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Bell, Box } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import UserLayout from '../layout'; // Assume UserLayout handles sidebar/header
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnnouncementsWidget } from "@/components/dashboard/AnnouncementsWidget";
// Temporarily comment out Joyride
// import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export default function UserDashboardPage() {
  const supabase = createClient();
  const [userStats, setUserStats] = useState([
    { title: 'Checked Out Gears', value: 0, icon: PackageCheck, color: 'text-blue-500', link: '/user/my-requests' },
    { title: 'Overdue Gears', value: 0, icon: Clock, color: 'text-red-500', link: '/user/check-in' },
    { title: 'Available Gears', value: 0, icon: Box, color: 'text-green-500', link: '/user/browse' },
  ]);
  const [notificationCount, setNotificationCount] = useState(0);
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
    fetchUserStats();
    fetchAvailableGears();
    fetchNotificationCount();

    const refreshInterval = setInterval(() => {
      fetchNotificationCount();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  async function fetchUserStats() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    try {
      // Fetch checked out gears from gear_requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('gear_requests')
        .select('id, status, due_date, gear_ids')
        .eq('user_id', userId);

      if (requestsError) throw requestsError;

      let checkedOutGearCount = 0;
      let overdueGearCount = 0;

      if (requestsData && requestsData.length > 0) {
        // Get all gear IDs that are checked out
        const now = new Date();

        requestsData.forEach((request: any) => {
          if (request.status === 'Approved' || request.status === 'Checked Out') {
            const gearCount = request.gear_ids?.length || 0;
            checkedOutGearCount += gearCount;

            // Check for overdue gears
            if (request.due_date && new Date(request.due_date) < now) {
              overdueGearCount += gearCount;
            }
          }
        });
      }

      try {
        // Alternative approach: directly query the gears table
        // Check if checked_out_to column exists by logging the structure
        console.log("Attempting to query gears table with checked_out_to column");

        const { data: gearData, error: gearError } = await supabase
          .from('gears')
          .select('id, status')
          .eq('checked_out_to', userId);

        if (gearError) {
          console.log("Error querying gears table:", gearError);
          // Continue with the counts from gear_requests if this query fails
        } else if (gearData) {
          // This is a more accurate count, so we'll use it if available
          const directlyCheckedOut = gearData.filter((g: any) => g.status === 'Checked Out').length;
          console.log(`Found ${directlyCheckedOut} items directly checked out to user in gears table`);
          checkedOutGearCount = directlyCheckedOut;
        }
      } catch (gearQueryError) {
        console.log("Exception querying gears table:", gearQueryError);
        // Fall back to using the counts from gear_requests
      }

      // Update only the first two items, preserving the third (Available Gears)
      setUserStats(prev => [
        { title: 'Checked Out Gears', value: checkedOutGearCount, icon: PackageCheck, color: 'text-blue-500', link: '/user/my-requests' },
        { title: 'Overdue Gears', value: overdueGearCount, icon: Clock, color: 'text-red-500', link: '/user/check-in' },
        prev[2], // Keep the Available Gears item
      ]);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Show a more detailed error message
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      } else {
        console.error('Unknown error type:', typeof error);
      }
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
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      {/* Temporarily comment out Joyride component */}
      {/* {showTour && (
        <Joyride
          steps={steps}
          continuous
          showSkipButton
          showProgress
          callback={handleTourCallback}
          styles={{ options: { zIndex: 10000 } }}
        />
      )} */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between items-center mb-6"
      >
        <h1 className="text-3xl font-bold text-foreground">
          User Dashboard
        </h1>
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

      {/* User Stats Cards */}
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

      {/* Quick Actions or other relevant info */}
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

      {/* Add the widget to the dashboard grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <AnnouncementsWidget />
      </div>

      {/* Updated NotificationSound usage */}
      <NotificationSound count={notificationCount} />

    </div>
  );
}

// Updated NotificationSound component with proper TypeScript and error handling
interface NotificationSoundProps {
  count: number;
}

function NotificationSound({ count }: NotificationSoundProps) {
  const [audioError, setAudioError] = useState(false);

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    if (count > 0 && !audioError) {
      try {
        audio = new Audio('/notification-sound.mp3');
        audio.loop = true;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Audio playback failed:", error);
            setAudioError(true);
          });
        }
      } catch (error) {
        console.error("Error creating audio:", error);
        setAudioError(true);
      }
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
  }, [count, audioError]);

  return null;
}
