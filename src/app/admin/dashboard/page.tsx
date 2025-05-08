"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { List, CheckCircle, AlertTriangle, PackagePlus, Calendar, Users, Settings, BarChart3, Activity, Search, Filter, Sliders, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';
import type { Database } from '@/types/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

type Activity = {
  id: string;
  user: string;
  action: string;
  time: string;
};

type Stat = {
  title: string;
  value: number;
  icon: any;
  color: string;
  change?: number;
  changeType?: 'increase' | 'decrease';
};

type Gear = Database['public']['Tables']['gears']['Row'];

// Add this type definition if needed
type UtilizationData = {
  category: string;
  count: number;
  utilization: number;
}

// Add these new types
type UserActivity = {
  id: string;
  user: string;
  action: string;
  time: string;
  icon?: any;
};

type UserStats = {
  activeUsers: number;
  newAccounts: number;
  admins: number;
};

export default function AdminDashboardPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([
    { title: 'Available Gears', value: 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Booked Gears', value: 0, icon: List, color: 'text-blue-500' },
    { title: 'Damaged Gears', value: 0, icon: AlertTriangle, color: 'text-orange-500' },
    { title: 'New Gears', value: 0, icon: PackagePlus, color: 'text-purple-500' },
  ]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);
  const [upcomingMaintenanceCount, setUpcomingMaintenanceCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentUpdate, setRecentUpdate] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [userStats, setUserStats] = useState<UserStats>({
    activeUsers: 0,
    newAccounts: 0,
    admins: 0
  });
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    // Initial data fetch
    fetchAllData();

    // Set up comprehensive real-time subscription for all relevant tables
    const dashboardChannel = supabase
      .channel('real-time-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, (payload) => {
        console.log('Real-time update from gears table:', payload);
        fetchStats();
        fetchUtilizationData();

        // Show update notification
        const eventType = payload.eventType;
        const record = payload.new;
        let updateMessage = '';

        if (eventType === 'INSERT') {
          updateMessage = `New gear "${record.name || 'Unnamed'}" was added`;
        } else if (eventType === 'UPDATE') {
          updateMessage = `Gear "${record.name || 'Unnamed'}" was updated`;
        } else if (eventType === 'DELETE') {
          updateMessage = 'A gear was removed from inventory';
        }

        setRecentUpdate(updateMessage);
        setLastUpdated(new Date());
        fetchRecentActivities();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, (payload) => {
        console.log('Real-time update from maintenance table:', payload);
        fetchUpcomingMaintenance();
        setRecentUpdate('Maintenance schedule was updated');
        setLastUpdated(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
        console.log('Real-time update from requests table:', payload);
        fetchPendingRequests();
        setRecentUpdate('Request status changed');
        setLastUpdated(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('Real-time update from profiles table:', payload);
        fetchUserStats();
        fetchUserActivities();
        setRecentUpdate('User profile was updated');
        setLastUpdated(new Date());
      })
      .subscribe((status) => {
        console.log('Real-time dashboard subscription status:', status);
        if (status === 'SUBSCRIBED') {
          toast({
            title: "Real-time Updates Active",
            description: "Dashboard will update automatically when data changes",
            variant: "default",
          });
        }
      });

    // Add a new subscription specific to user activity
    const userChannel = supabase
      .channel('user-activity-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('Real-time update from profiles table:', payload);
        fetchUserStats();
        fetchUserActivities();

        const eventType = payload.eventType;
        const record = payload.new;
        let updateMessage = '';

        if (eventType === 'INSERT') {
          updateMessage = `New user account was created`;
        } else if (eventType === 'UPDATE') {
          updateMessage = `User profile was updated`;
        } else if (eventType === 'DELETE') {
          updateMessage = 'A user account was removed';
        }

        setRecentUpdate(updateMessage);
        setLastUpdated(new Date());
      })
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(dashboardChannel);
      supabase.removeChannel(userChannel);
    };
  }, []);

  // Function to fetch all data at once
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentActivities(),
        fetchUtilizationData(),
        fetchUpcomingMaintenance(),
        fetchPendingRequests(),
        fetchUserStats(),
        fetchUserActivities()
      ]);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error.message);
      toast({
        title: "Data Fetch Error",
        description: "Could not load all dashboard data. Some information may be missing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function fetchStats() {
    setIsLoading(true);
    try {
      // Get more detailed data including status, to properly count items
      const { data, error } = await supabase
        .from('gears')
        .select('id, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        console.log("Gear data fetched:", data);

        // Log the unique status values to help debug
        const statuses = [...new Set(data.map(g => String(g.status).toLowerCase()))];
        console.log("Unique gear statuses found:", statuses);

        // More robust filtering with extra logging
        const available = data.filter(g => {
          const status = String(g.status || '').toLowerCase().trim();
          const isAvailable = status === 'available';

          // Log each status that's not clearly matching any category
          if (!['available', 'booked', 'checked out', 'checked_out', 'damaged', 'maintenance', ''].includes(status)) {
            console.log(`Unusual status found: "${status}" for gear ID ${g.id}`);
          }

          return isAvailable;
        }).length;

        console.log(`Available gears count: ${available}`);

        // Improved filtering for booked status
        const booked = data.filter(g => {
          const status = String(g.status || '').toLowerCase().trim();
          return status === 'booked' ||
            status === 'checked out' ||
            status === 'checked_out';
        }).length;

        console.log(`Booked gears count: ${booked}`);

        // Improved filtering for damaged/maintenance status
        const damaged = data.filter(g => {
          const status = String(g.status || '').toLowerCase().trim();
          return status === 'damaged' ||
            status === 'maintenance' ||
            status === 'repair';
        }).length;

        console.log(`Damaged gears count: ${damaged}`);

        // New gears: added in the last 7 days
        const now = new Date();
        const newGears = data.filter(g => {
          if (!g.created_at) return false;
          const createdDate = new Date(g.created_at);
          return (now.getTime() - createdDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
        }).length;

        console.log(`New gears count: ${newGears}`);

        setStats([
          { title: 'Available Gears', value: available, icon: CheckCircle, color: 'text-green-500', change: 2, changeType: 'increase' },
          { title: 'Booked Gears', value: booked, icon: List, color: 'text-blue-500', change: 5, changeType: 'increase' },
          { title: 'Damaged Gears', value: damaged, icon: AlertTriangle, color: 'text-orange-500', change: 1, changeType: 'decrease' },
          { title: 'New Gears', value: newGears, icon: PackagePlus, color: 'text-purple-500', change: 3, changeType: 'increase' },
        ]);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error.message);
      toast({
        title: "Error fetching stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRecentActivities() {
    try {
      // If you have an activities table, fetch from there. Otherwise, use recent gears as placeholder.
      const { data, error } = await supabase
        .from('gears')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        setRecentActivities(data.map(g => ({
          id: g.id,
          user: 'Admin',
          action: `added ${g.name}`,
          time: g.created_at ? timeAgo(new Date(g.created_at)) : '',
        })));
      }
    } catch (error: any) {
      console.error("Error fetching activities:", error.message);
    }
  }

  async function fetchUtilizationData() {
    try {
      const { data, error } = await supabase
        .from('gears')
        .select('category, status');

      if (error) throw error;

      if (data) {
        // Group by category
        const categories: Record<string, { total: number, used: number }> = {};

        data.forEach(gear => {
          const category = gear.category || 'Uncategorized';

          if (!categories[category]) {
            categories[category] = { total: 0, used: 0 };
          }

          categories[category].total++;

          // Count items that are booked/checked out as "used"
          if (String(gear.status).toLowerCase() === 'booked' ||
            String(gear.status).toLowerCase() === 'checked out' ||
            String(gear.status).toLowerCase() === 'checked_out') {
            categories[category].used++;
          }
        });

        // Convert to array and calculate utilization percentage
        const result = Object.entries(categories).map(([category, { total, used }]) => ({
          category,
          count: total,
          utilization: total > 0 ? Math.round((used / total) * 100) : 0
        }));

        setUtilizationData(result);
      }
    } catch (error: any) {
      console.error("Error fetching utilization data:", error.message);
    }
  }

  async function fetchUpcomingMaintenance() {
    try {
      // Assuming you have a maintenance table
      const { count, error } = await supabase
        .from('maintenance')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');

      if (error) throw error;

      setUpcomingMaintenanceCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching maintenance data:", error.message);
    }
  }

  async function fetchPendingRequests() {
    try {
      // Assuming you have a requests table
      const { count, error } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;

      setPendingRequestsCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching pending requests:", error.message);
    }
  }

  async function fetchUserStats() {
    try {
      // Get active users (status = 'Active')
      const { data: activeUsers, error: activeError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');

      // Get new users (created in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: newUsers, error: newError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'Admin');

      if (activeError || newError || adminError) {
        console.error("Error fetching user stats:", activeError || newError || adminError);
        return;
      }

      setUserStats({
        activeUsers: activeUsers?.count || 0,
        newAccounts: newUsers?.count || 0,
        admins: adminUsers?.count || 0
      });

    } catch (error: any) {
      console.error("Error in fetchUserStats:", error.message);
    }
  }

  async function fetchUserActivities() {
    try {
      // First try to get user activity from a dedicated table if it exists
      let activities: UserActivity[] = [];

      // Fallback: Get recent profile updates as activity
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, updated_at, created_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (profilesError) {
        console.error("Error fetching user activities:", profilesError);
        return;
      }

      if (profiles) {
        activities = profiles.map(profile => {
          // Check if this is a new profile (created_at and updated_at are close)
          const isNewProfile = new Date(profile.updated_at).getTime() - new Date(profile.created_at).getTime() < 1000 * 60 * 5; // 5 minutes difference

          return {
            id: profile.id,
            user: profile.full_name || profile.email || 'User',
            action: isNewProfile ? 'account was created' : 'profile was updated',
            time: profile.updated_at ? timeAgo(new Date(profile.updated_at)) : '',
            icon: isNewProfile ? Users : Activity
          };
        });
      }

      // Also get recent gear activity to supplement
      const { data: gears, error: gearsError } = await supabase
        .from('gears')
        .select('id, name, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!gearsError && gears) {
        const gearActivities = gears.map(gear => ({
          id: gear.id,
          user: 'Admin',
          action: `added ${gear.name}`,
          time: gear.created_at ? timeAgo(new Date(gear.created_at)) : '',
          icon: PackagePlus
        }));

        // Combine and sort by time
        activities = [...activities, ...gearActivities]
          .sort((a, b) => {
            const timeA = a.time.includes('ago') ? a.time : '0 secs ago';
            const timeB = b.time.includes('ago') ? b.time : '0 secs ago';

            // Extract numbers and units for comparison
            const [numA, unitA] = timeA.split(' ');
            const [numB, unitB] = timeB.split(' ');

            if (unitA === unitB) {
              return parseInt(numB) - parseInt(numA);
            } else {
              // Priority: secs < mins < hours < days
              const units = ['secs', 'mins', 'hours', 'days'];
              return units.indexOf(unitA) - units.indexOf(unitB);
            }
          })
          .slice(0, 5); // Keep only the 5 most recent
      }

      setUserActivities(activities);
    } catch (error: any) {
      console.error("Error in fetchUserActivities:", error.message);
    }
  }

  function timeAgo(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff} sec${diff !== 1 ? 's' : ''} ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
  }

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  const listVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05 + 0.4, // Start after cards animation
        duration: 0.4,
        ease: "easeOut",
      },
    }),
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header with real-time indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-foreground"
          >
            Admin Dashboard
          </motion.h1>
          <div className="flex items-center mt-1 text-xs text-muted-foreground">
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${recentUpdate ? 'bg-green-500 animate-pulse' : 'bg-muted'}`}></div>
              {recentUpdate ? (
                <span className="font-medium text-green-600 dark:text-green-400">{recentUpdate}</span>
              ) : (
                <span>Real-time updates active</span>
              )}
            </div>
            <span className="mx-2">•</span>
            <span>Last updated: {timeAgo(lastUpdated)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-[200px] sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAllData}
            className="flex items-center justify-center"
            title="Refresh all data"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 md:grid-cols-6 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="maintenance" className="hidden md:inline-flex">Maintenance</TabsTrigger>
          <TabsTrigger value="users" className="hidden md:inline-flex">Users</TabsTrigger>
          <TabsTrigger value="reports" className="hidden md:inline-flex">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                  <div className={`h-1 ${stat.title === 'Available Gears' ? 'bg-green-500' :
                    stat.title === 'Booked Gears' ? 'bg-blue-500' :
                      stat.title === 'Damaged Gears' ? 'bg-orange-500' :
                        'bg-purple-500'
                    }`}></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-1.5 rounded-full ${stat.title === 'Available Gears' ? 'bg-green-100 dark:bg-green-900/20' :
                      stat.title === 'Booked Gears' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        stat.title === 'Damaged Gears' ? 'bg-orange-100 dark:bg-orange-900/20' :
                          'bg-purple-100 dark:bg-purple-900/20'
                      }`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change !== undefined && (
                      <p className={`text-xs flex items-center mt-1 ${stat.changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                        }`}>
                        {stat.changeType === 'increase' ? '↑' : '↓'} {stat.change}% from last week
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/admin/manage-gears/add">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Gear
                  </Button>
                </Link>
                <Link href="/admin/manage-users">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                </Link>
                <Link href="/admin/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Reports
                  </Button>
                </Link>
                <Link href="/admin/calendar">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Calendar
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="shadow-sm col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activities</CardTitle>
                <CardDescription>Latest actions within the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {recentActivities.map((activity, index) => (
                    <motion.li
                      key={activity.id}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={listVariants}
                      className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                          <Activity className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <span className="font-semibold">{activity.user}</span>{' '}
                          <span className="text-muted-foreground">{activity.action}</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                    </motion.li>
                  ))}
                </ul>
                {recentActivities.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No recent activities.</p>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-center">
                <Button variant="ghost" size="sm">View All Activities</Button>
              </CardFooter>
            </Card>
          </div>

          {/* Gear Category Utilization */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Gear Utilization by Category</CardTitle>
              <CardDescription>Percentage of gear currently in use by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {utilizationData.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.category}</span>
                      <span className="text-muted-foreground">{item.utilization}% ({item.count} items)</span>
                    </div>
                    <Progress value={item.utilization} className="h-2" />
                  </div>
                ))}
                {utilizationData.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No utilization data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gear Inventory</CardTitle>
              <CardDescription>Manage your equipment inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                </div>
              ) : utilizationData.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                              <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                            </div>
                            <div className={`p-2 rounded-full bg-primary/10 ${stat.color}`}>
                              <stat.icon className="h-5 w-5" />
                            </div>
                          </div>
                          {stat.change !== undefined && (
                            <div className="mt-4">
                              <p className={`text-xs flex items-center ${stat.changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                                {stat.changeType === 'increase' ? '↑' : '↓'} {stat.change}% from last month
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <h3 className="text-lg font-semibold mt-6">Equipment Utilization by Category</h3>
                  <div className="space-y-4">
                    {utilizationData.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.category} ({item.count} items)</span>
                          <span className="text-sm text-muted-foreground">{item.utilization}%</span>
                        </div>
                        <Progress value={item.utilization} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PackagePlus className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
                  <p>No inventory data available. Add some gear to get started.</p>
                  <Button asChild className="mt-4">
                    <Link href="/admin/manage-gears">Manage Gears</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gear Requests</CardTitle>
              <CardDescription>Manage pending and approved gear requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 py-8 px-4 border rounded-lg bg-muted/40">
                <div className="text-4xl font-bold text-primary">{pendingRequestsCount}</div>
                <div>
                  <div className="font-medium">Pending Requests</div>
                  <div className="text-sm text-muted-foreground">Awaiting your approval</div>
                </div>
              </div>
              <p className="text-center py-10">Request management content would appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
              <CardDescription>Track gear maintenance and repairs</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted/40 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-background rounded-lg p-4 shadow-sm border">
                        <h3 className="text-4xl font-bold text-orange-500">{upcomingMaintenanceCount}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Scheduled Maintenance</p>
                        <p className="text-xs mt-2">Upcoming maintenance tasks</p>
                      </div>
                      {/* Add more maintenance stats here */}
                    </div>
                  </div>

                  {upcomingMaintenanceCount > 0 ? (
                    <div className="space-y-4 mt-6">
                      <h3 className="text-lg font-semibold">Upcoming Maintenance</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the Maintenance Management section to view and manage detailed maintenance schedule.
                      </p>
                      <Button asChild variant="outline">
                        <Link href="/admin/maintenance">View Full Maintenance Schedule</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 mt-4">
                      <p className="text-muted-foreground">No scheduled maintenance at this time.</p>
                      <Button asChild className="mt-4" variant="outline">
                        <Link href="/admin/maintenance">Schedule Maintenance</Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* User metrics cards */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                            <h4 className="text-2xl font-bold mt-1">{userStats.activeUsers}</h4>
                          </div>
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">New Accounts</p>
                            <h4 className="text-2xl font-bold mt-1">{userStats.newAccounts}</h4>
                          </div>
                          <Users className="h-5 w-5 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
                            <h4 className="text-2xl font-bold mt-1">{userStats.admins}</h4>
                          </div>
                          <ShieldCheck className="h-5 w-5 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-4 mt-6">
                    <h3 className="text-lg font-semibold">Recent User Activities</h3>
                    {userActivities.length > 0 ? (
                      <div className="space-y-2">
                        {userActivities.map((activity, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {activity.icon ? <activity.icon className="h-4 w-4 text-primary" /> : <Activity className="h-4 w-4 text-primary" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{activity.user} {activity.action}</p>
                                <p className="text-xs text-muted-foreground">{activity.time}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent user activities to display.</p>
                    )}

                    <Button asChild className="mt-4" variant="outline">
                      <Link href="/admin/manage-users">Manage Users</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>View detailed analytics and generate reports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-muted/40 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Equipment Usage Summary</h3>

                    {utilizationData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-medium text-muted-foreground">Total Equipment</h4>
                                <p className="text-2xl font-bold mt-1">
                                  {utilizationData.reduce((sum, item) => sum + item.count, 0)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-medium text-muted-foreground">Categories</h4>
                                <p className="text-2xl font-bold mt-1">{utilizationData.length}</p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4">
                              <div className="flex flex-col">
                                <h4 className="text-sm font-medium text-muted-foreground">Avg. Utilization</h4>
                                <p className="text-2xl font-bold mt-1">
                                  {utilizationData.length > 0
                                    ? Math.round(utilizationData.reduce((sum, item) => sum + item.utilization, 0) / utilizationData.length)
                                    : 0}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No equipment data available for analysis.</p>
                    )}
                  </div>

                  <Button asChild className="mt-4">
                    <Link href="/admin/reports">View Detailed Reports</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
