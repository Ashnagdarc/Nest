// User dashboard for Nest by Eden Oasis. Provides real-time asset management, stats, and notifications.

"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, Clock, Box, Search, ArrowUpDown, ArrowUpRight, Activity, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AnnouncementsWidget } from "@/components/dashboard/AnnouncementsWidget";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { PopularGearWidget } from "@/components/dashboard/PopularGearWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from '@/lib/logger';
import { useToast } from "@/hooks/use-toast";
import { useDashboardData } from '@/hooks/dashboard/use-dashboard-data';
import { apiGet } from '@/lib/apiClient';
import React from 'react';

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

/**
 * Main user dashboard component with real-time asset management interface.
 * Updated to follow Apple's Human Interface Guidelines for minimal, clean design.
 */
export default function UserDashboardPage() {
  const { toast } = useToast();
  const supabase = createClient();

  // Use optimized centralized dashboard data
  const dashboardData = useDashboardData();

  const [userData, setUserData] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: profile, error } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/profile`);
        if (error && error !== '') {
          logError(error, 'fetchUserProfile');
        } else if (profile) {
          setUserData(profile);
        }
      } catch (error) {
        // Only log if it's a real error, not an empty object
        if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
          logError(error, 'fetchUserProfile');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // Transform dashboard data into the format expected by the existing UI
  const userStats = [
    {
      title: 'Checked Out Gears',
      value: dashboardData.userStats.checkedOut,
      icon: PackageCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      link: '/user/my-requests',
      description: 'Currently in your possession'
    },
    {
      title: 'Overdue Gears',
      value: dashboardData.userStats.overdue,
      icon: Clock,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      link: '/user/check-in',
      description: 'Past due date - please return'
    },
    {
      title: 'Available Gears',
      value: dashboardData.userStats.available,
      icon: Box,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/user/browse',
      description: 'Ready for checkout'
    },
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut",
      },
    }),
  };

  // Check if any data is still loading
  const isDataLoading = Object.values(dashboardData.loading).some(loading => loading);

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16 space-y-8 sm:space-y-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-8"
        >
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground truncate leading-tight">
              Welcome back, {userData?.full_name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-2 text-base sm:text-lg lg:text-xl leading-relaxed">
              {userData?.department ? `${userData.department} Department` : 'Dashboard'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 w-full sm:w-auto">
            <Link href="/user/browse" className="w-full sm:w-auto">
              <Button className="gap-3 w-full sm:w-auto min-h-[48px] text-base">
                <Search className="h-5 w-5" />
                <span className="hidden xs:inline">Browse Gear</span>
                <span className="xs:hidden">Browse</span>
              </Button>
            </Link>
            <Link href="/user/check-in" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-3 w-full sm:w-auto min-h-[48px] text-base">
                <ArrowUpDown className="h-5 w-5" />
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
        {isDataLoading ? (
          <LoadingState variant="cards" count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {userStats.map((stat, i) => (
              <motion.div
                key={stat.title}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="w-full"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 p-6">
                    <CardTitle className="text-base sm:text-lg lg:text-xl font-semibold flex items-center gap-3 truncate">
                      {React.createElement(stat.icon, { className: `h-6 w-6 sm:h-7 sm:w-7 ${stat.color} flex-shrink-0` })}
                      <span className="truncate">{stat.title}</span>
                    </CardTitle>
                    <Badge
                      className={
                        'text-sm sm:text-base px-3 sm:px-4 py-1.5 font-bold shadow-none flex-shrink-0 rounded-lg ' +
                        (stat.title === 'Checked Out Gears' ? 'bg-blue-600 text-white' :
                          stat.title === 'Overdue Gears' ? 'bg-red-600 text-white' :
                            stat.title === 'Available Gears' ? 'bg-green-600 text-white' :
                              'bg-gray-600 text-white')
                      }
                    >
                      {stat.value}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-sm sm:text-base text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{stat.description}</p>
                    {stat.value === 0 && (
                      <div className="text-sm text-muted-foreground italic">No {stat.title.toLowerCase()}.</div>
                    )}
                    <Link href={stat.link} className="text-blue-500 hover:underline text-sm sm:text-base inline-flex items-center gap-2">
                      View details
                      <ArrowUpRight className="h-4 w-4" />
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