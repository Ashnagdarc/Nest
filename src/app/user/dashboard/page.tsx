"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Bell } from 'lucide-react';
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
    fetchNotificationCount();
    // Temporarily comment out tour initialization
    // if (typeof window !== 'undefined' && !localStorage.getItem('user_dashboard_tour_done')) {
    //   setShowTour(true);
    // }
  }, []);

  async function fetchUserStats() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    // Fetch checked out gears
    const { data: requests, error } = await supabase
      .from('requests')
      .select('status, dueDate')
      .eq('user_id', userId);
    if (!error && requests) {
      const checkedOut = requests.filter((r: any) => r.status === 'Checked Out').length;
      const overdue = requests.filter((r: any) => r.status === 'Checked Out' && r.dueDate && new Date(r.dueDate) < new Date()).length;
      setUserStats([
        { title: 'Checked Out Gears', value: checkedOut, icon: PackageCheck, color: 'text-blue-500', link: '/user/my-requests' },
        { title: 'Overdue Gears', value: overdue, icon: Clock, color: 'text-red-500', link: '/user/check-in' },
      ]);
    }
  }

  async function fetchNotificationCount() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;
    // Fetch notifications for the user if you have a notifications table
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false);
    if (!error && data) {
      setNotificationCount(data.length);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 user-stats-cards">
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

    </div>
  );
}
