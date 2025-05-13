"use client";

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { List, CheckCircle, AlertTriangle, PackagePlus, Calendar, Users, Settings, BarChart3, Activity, Search, Filter, Sliders, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { RequestStats } from '@/components/admin/RequestStats';
import { RequestNotifications } from '@/components/admin/RequestNotifications';

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

type GearPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    name?: string;
    status?: string;
  };
  old?: {
    id: string;
    name?: string;
    status?: string;
  };
};

type MaintenancePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    gear_id: string;
    status?: string;
  };
};

type RequestPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    status: string;
  };
};

type ProfilePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    full_name?: string;
    email?: string;
  };
};

type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type GearData = {
  id: string;
  status?: string;
  created_at?: string;
};

type ActivityLogData = {
  id: string;
  activity_type: string;
  status?: string;
  notes?: string;
  details?: any;
  created_at: string;
  user_id: string;
  gear_id: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
  gears?: {
    name?: string;
  };
};

type GearActivityData = {
  id: string;
  name?: string;
  created_at: string;
  owner_id?: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
};

type ProfileData = {
  id: string;
  full_name?: string;
  email?: string;
  updated_at: string;
  created_at: string;
};

type GearActivityLogPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: {
    id: string;
    user_id: string;
    gear_id: string;
    activity_type: string;
    status?: string;
    notes?: string;
    details?: any;
    created_at: string;
  };
};

// Add these type definitions at the top with the other types
type ActivityLogRecord = {
  id: string;
  user_id: string;
  gear_id: string;
  activity_type: string;
  details: any;
  created_at: string;
  status?: string;
};

type UserProfile = {
  id: string;
  full_name?: string;
  email?: string;
};

type GearRecord = {
  id: string;
  name: string;
  created_at: string;
  owner_id?: string;
};

interface RequestNotification {
  id: string;
  type: 'new' | 'pending' | 'checkin';
  userName: string;
  gearNames: string[];
  requestDate: Date;
  dueDate?: Date;
}

interface RequestStats {
  new: number;
  pending: number;
  checkin: number;
  overdue: number;
  available?: number;
  total?: number;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stats, setStats] = useState<RequestStats & { available?: number; total?: number }>({
    new: 0,
    pending: 0,
    checkin: 0,
    overdue: 0,
    available: 0,
    total: 0
  });
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
  const [notifications, setNotifications] = useState<RequestNotification[]>([]);

  // Initialize audio in useEffect
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
  }, []);

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
    // Initial data fetch
    fetchAllData();

    // Set up comprehensive real-time subscription for all relevant tables
    const dashboardChannel = supabase
      .channel('real-time-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, (payload: GearPayload) => {
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

        // Only play sound if user has interacted
        if (hasUserInteracted && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((error: Error) => {
            console.error("Error playing notification sound:", error);
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, (payload: MaintenancePayload) => {
        console.log('Real-time update from maintenance table:', payload);
        fetchUpcomingMaintenance();
        setRecentUpdate('Maintenance schedule was updated');
        setLastUpdated(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload: RequestPayload) => {
        console.log('Real-time update from requests table:', payload);
        fetchPendingRequests();
        setRecentUpdate('Request status changed');
        setLastUpdated(new Date());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: ProfilePayload) => {
        console.log('Real-time update from profiles table:', payload);
        fetchUserStats();
        fetchUserActivities();
        setRecentUpdate('User profile was updated');
        setLastUpdated(new Date());
      })
      .subscribe((status: SubscriptionStatus) => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: ProfilePayload) => {
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

    // Add subscription for gear activity log
    const activityChannel = supabase
      .channel('gear-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gear_activity_log' }, (payload: GearActivityLogPayload) => {
        console.log('Real-time update from gear_activity_log table:', payload);
        fetchRecentActivities();
        setLastUpdated(new Date());
      })
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(dashboardChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [supabase, toast]);

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
      // Get current gear data
      const { data: currentData, error: currentError } = await supabase
        .from('gears')
        .select('id, status, created_at, category')
        .order('created_at', { ascending: false });

      if (currentError) throw currentError;

      if (currentData) {
        // Current counts
        const available = currentData.filter((g: GearData) => String(g.status || '').toLowerCase().trim() === 'available').length;
        const booked = currentData.filter((g: GearData) => ['booked', 'checked out', 'checked_out'].includes(String(g.status || '').toLowerCase().trim())).length;
        const damaged = currentData.filter((g: GearData) => ['damaged', 'maintenance', 'repair'].includes(String(g.status || '').toLowerCase().trim())).length;
        const total = currentData.length;

        // Group by category for utilization data
        const categories: Record<string, { total: number, used: number }> = {};
        currentData.forEach((gear: any) => {
          const category = gear.category || 'Uncategorized';
          if (!categories[category]) {
            categories[category] = { total: 0, used: 0 };
          }
          categories[category].total++;
          if (['booked', 'checked out', 'checked_out'].includes(String(gear.status || '').toLowerCase().trim())) {
            categories[category].used++;
          }
        });

        // Convert to array and calculate utilization percentage
        const utilizationResult = Object.entries(categories).map(([category, { total, used }]) => ({
          category,
          count: total,
          utilization: total > 0 ? Math.round((used / total) * 100) : 0
        }));

        setUtilizationData(utilizationResult);

        // Update stats with total available gear
        setStats(prevStats => ({
          ...prevStats,
          available: available,
          total: total
        }));
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
      // First check if user is admin
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        throw profileError;
      }

      if (profile?.role !== 'Admin') {
        console.error("Unauthorized: Admin access required");
        toast({
          title: "Access Denied",
          description: "You need admin privileges to view this information.",
          variant: "destructive",
        });
        return;
      }

      // Fetch activity log with basic fields first
      const { data: activityData, error: activityError } = await supabase
        .from('gear_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (activityError) {
        console.error("Error fetching activity log:", activityError);
        toast({
          title: "Error",
          description: "Failed to fetch activity log. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Fetch user details for activities
      const userIds = activityData?.map((a: ActivityLogRecord) => a.user_id).filter(Boolean) || [];
      const gearIds = activityData?.map((a: ActivityLogRecord) => a.gear_id).filter(Boolean) || [];

      const [usersResponse, gearsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds),
        supabase
          .from('gears')
          .select('id, name')
          .in('id', gearIds)
      ]);

      const usersMap = new Map(usersResponse.data?.map((u: UserProfile) => [u.id, u]) || []);
      const gearsMap = new Map(gearsResponse.data?.map((g: GearRecord) => [g.id, g]) || []);

      // Also fetch recent gear changes
      const { data: gearData, error: gearError } = await supabase
        .from('gears')
        .select('id, name, created_at, owner_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (gearError) {
        console.error("Error fetching gear data:", gearError);
        toast({
          title: "Error",
          description: "Failed to fetch gear data. Please try again later.",
          variant: "destructive",
        });
        return;
      }

      // Fetch owner details for gears
      const ownerIds = gearData?.map((g: GearRecord) => g.owner_id).filter(Boolean) || [];
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ownerIds);

      const ownersMap = new Map(ownersData?.map((o: UserProfile) => [o.id, o]) || []);

      // Combine and format activities
      const activities = [
        ...(activityData?.map((a: ActivityLogRecord) => {
          const user = usersMap.get(a.user_id) as UserProfile | undefined;
          const gear = gearsMap.get(a.gear_id) as GearRecord | undefined;
          return {
            id: a.id,
            user: user?.full_name || user?.email || 'Unknown User',
            action: formatActivityType(a.activity_type, a.details, gear?.name),
            time: a.created_at ? timeAgo(new Date(a.created_at)) : '',
          };
        }) || []),
        ...(gearData?.map((g: GearRecord) => {
          const owner = ownersMap.get(g.owner_id || '') as UserProfile | undefined;
          return {
            id: g.id,
            user: owner?.full_name || owner?.email || 'Unknown User',
            action: `added ${g.name || 'new gear'}`,
            time: g.created_at ? timeAgo(new Date(g.created_at)) : '',
          };
        }) || [])
      ]
        .sort((a, b) => {
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        })
        .slice(0, 5);

      setRecentActivities(activities);
    } catch (error: any) {
      console.error("Error fetching activities:", error.message);
      setRecentActivities([]);
      toast({
        title: "Error",
        description: error.message || "Could not load recent activities. Please try again later.",
        variant: "destructive",
      });
    }
  }

  // Helper function to format activity types
  function formatActivityType(type: string, details: any, gearName?: string): string {
    switch (type) {
      case 'Request':
        return `requested ${gearName || 'gear'}`;
      case 'Check-in':
        return `checked in ${gearName || 'gear'}`;
      case 'Check-out':
        return `checked out ${gearName || 'gear'}`;
      case 'Maintenance':
        return `scheduled maintenance for ${gearName || 'gear'}`;
      case 'Status Change':
        if (details && typeof details === 'object') {
          return `changed ${gearName || 'gear'} status from ${details.old_status || 'unknown'} to ${details.new_status || 'unknown'}`;
        }
        return `updated ${gearName || 'gear'} status`;
      default:
        return type.replace(/_/g, ' ').toLowerCase();
    }
  }

  // Helper function to parse time ago string into milliseconds
  function parseTimeAgo(timeAgo: string): number {
    const [amount, unit] = timeAgo.split(' ');
    const now = new Date().getTime();

    switch (unit) {
      case 'sec':
      case 'secs':
        return now - (parseInt(amount) * 1000);
      case 'min':
      case 'mins':
        return now - (parseInt(amount) * 60 * 1000);
      case 'hour':
      case 'hours':
        return now - (parseInt(amount) * 60 * 60 * 1000);
      case 'day':
      case 'days':
        return now - (parseInt(amount) * 24 * 60 * 60 * 1000);
      default:
        return now;
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

        data.forEach((gear: { category?: string, status?: string }) => {
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
        activities = profiles.map((profile: ProfileData) => {
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
        const gearActivities = gears.map((gear: GearActivityData) => ({
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

  // Update the playTestSound function with proper error typing
  const playTestSound = () => {
    if (!hasUserInteracted) {
      toast({
        title: "Sound Playback",
        description: "Please interact with the page first (click anywhere) to enable sound playback.",
        variant: "default",
      });
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error: Error) => {
        console.error("Error playing test sound:", error);
        toast({
          title: "Sound Playback Failed",
          description: "Could not play the notification sound. Please check your browser settings.",
          variant: "destructive",
        });
      });
    }
  };

  // Fetch request statistics
  const fetchRequestStats = async () => {
    try {
      const now = new Date();

      // First check if the gear_requests table exists
      const { count, error: tableCheckError } = await supabase
        .from('gear_requests')
        .select('*', { count: 'exact', head: true });

      if (tableCheckError) {
        console.error('Error checking gear_requests table:', tableCheckError);
        // Initialize with empty stats if table doesn't exist
        setStats({
          new: 0,
          pending: 0,
          checkin: 0,
          overdue: 0,
          available: 0,
          total: 0
        });
        setNotifications([]);
        return;
      }

      // Fetch all requests with proper type checking
      const { data: requests, error: requestError } = await supabase
        .from('gear_requests')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          due_date,
          user_id,
          gear_ids,
          profiles:user_id (
            full_name
          )
        `);

      if (requestError) {
        console.error('Supabase query error:', requestError);
        throw new Error(requestError.message);
      }

      // Fetch gear names separately if needed
      const gearNames = new Map<string, string>();
      if (requests && requests.length > 0) {
        const allGearIds = requests.reduce((acc: string[], request: any) => {
          return acc.concat(request.gear_ids || []);
        }, []);

        if (allGearIds.length > 0) {
          const { data: gears, error: gearError } = await supabase
            .from('gears')
            .select('id, name')
            .in('id', allGearIds);

          if (!gearError && gears) {
            gears.forEach((gear: any) => {
              gearNames.set(gear.id, gear.name);
            });
          }
        }
      }

      if (!requests) {
        console.warn('No requests data returned from query');
        setStats({
          new: 0,
          pending: 0,
          checkin: 0,
          overdue: 0,
          available: 0,
          total: 0
        });
        setNotifications([]);
        return;
      }

      // Calculate stats with type safety
      const newStats = {
        new: 0,
        pending: 0,
        checkin: 0,
        overdue: 0
      };

      requests.forEach((request: any) => {
        try {
          if (!request.status) {
            console.warn('Request missing status:', request.id);
            return;
          }

          const status = request.status.toLowerCase();
          if (status === 'pending') {
            // Consider a request "new" if it was created less than 24 hours ago
            const createdAt = new Date(request.created_at);
            const isNew = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000;
            if (isNew) {
              newStats.new++;
            } else {
              newStats.pending++;
            }
          } else if (status === 'checked out' && request.due_date) {
            const dueDate = new Date(request.due_date);
            if (dueDate < now) {
              newStats.overdue++;
            } else if (dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
              newStats.checkin++;
            }
          }
        } catch (err) {
          console.warn('Error processing request:', request.id, err);
        }
      });

      setStats(prevStats => ({
        ...prevStats,
        new: newStats.new,
        pending: newStats.pending,
        checkin: newStats.checkin,
        overdue: newStats.overdue
      }));

      // Update notifications with better error handling
      const newNotifications: RequestNotification[] = requests
        .filter((request: any) => {
          try {
            if (!request.created_at) return false;

            const requestDate = new Date(request.created_at);
            const isRecent = now.getTime() - requestDate.getTime() < 24 * 60 * 60 * 1000;
            const status = request.status?.toLowerCase() || '';
            const needsAttention = status === 'pending' ||
              (status === 'checked out' && request.due_date && new Date(request.due_date) < now);

            return isRecent && needsAttention;
          } catch (err) {
            console.warn('Error filtering notification:', request.id, err);
            return false;
          }
        })
        .map((request: any) => {
          try {
            const gearNamesArray = (request.gear_ids || [])
              .map((id: string) => gearNames.get(id) || 'Unnamed Gear')
              .filter(Boolean);

            const createdAt = new Date(request.created_at);
            const isNew = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000;

            return {
              id: request.id,
              type: request.status?.toLowerCase() === 'pending' && isNew ? 'new' :
                request.status?.toLowerCase() === 'pending' ? 'pending' : 'checkin',
              userName: request.profiles?.full_name || 'Unknown User',
              gearNames: gearNamesArray,
              requestDate: new Date(request.created_at),
              dueDate: request.due_date ? new Date(request.due_date) : undefined
            };
          } catch (err) {
            console.warn('Error mapping notification:', request.id, err);
            return null;
          }
        })
        .filter(Boolean)
        .slice(0, 5);

      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error fetching request stats:', error);
      // Set default values on error
      setStats({
        new: 0,
        pending: 0,
        checkin: 0,
        overdue: 0,
        available: 0,
        total: 0
      });
      setNotifications([]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch request statistics",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchRequestStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gear_requests'
        },
        () => {
          fetchRequestStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewCategory = (category: string) => {
    router.push('/admin/manage-requests?filter=' + category);
  };

  const handleViewNotification = (id: string) => {
    router.push('/admin/manage-requests?request=' + id);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getStatIcon = (statName: keyof RequestStats) => {
    switch (statName) {
      case 'new':
        return <PackagePlus className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <List className="h-5 w-5 text-blue-500" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'checkin':
        return <ShieldCheck className="h-5 w-5 text-purple-500" />;
    }
  };

  const getStatColor = (statName: keyof RequestStats) => {
    switch (statName) {
      case 'new':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-blue-500/10 text-blue-500';
      case 'overdue':
        return 'bg-red-500/10 text-red-500';
      case 'checkin':
        return 'bg-purple-500/10 text-purple-500';
    }
  };

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
            {[
              { key: 'new', label: 'New Requests', icon: PackagePlus, color: 'green' },
              { key: 'pending', label: 'Pending Requests', icon: List, color: 'blue' },
              { key: 'available', label: 'Available Gear', icon: CheckCircle, color: 'emerald' },
              { key: 'total', label: 'Total Gear', icon: BarChart3, color: 'purple' }
            ].map((stat) => (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleViewCategory(stat.key)}
                className="cursor-pointer"
              >
                <Card className={`border-l-4 border-${stat.color}-500`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full bg-${stat.color}-500/10 text-${stat.color}-500`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="text-2xl font-bold">
                          {stats[stat.key] || 0}
                        </div>
                      </div>
                    </div>
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
                    {Object.entries(stats).map(([statName, value], i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">{statName.charAt(0).toUpperCase() + statName.slice(1)}</p>
                              <h3 className="text-2xl font-bold mt-1">{value}</h3>
                            </div>
                            <div className={`p-2 rounded-full bg-primary/10 ${statName === 'new' ? 'bg-green-500' :
                              statName === 'pending' ? 'bg-blue-500' :
                                statName === 'overdue' ? 'bg-orange-500' :
                                  'bg-purple-500'
                              }`}>
                              {statName === 'new' ? (
                                <PackagePlus className="h-5 w-5" />
                              ) : statName === 'pending' ? (
                                <List className="h-5 w-5" />
                              ) : statName === 'overdue' ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                <ShieldCheck className="h-5 w-5" />
                              )}
                            </div>
                          </div>
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

      {/* Request Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Request Overview</h2>
        <RequestStats
          stats={stats}
          onViewCategory={handleViewCategory}
        />
      </div>

      {/* Notifications */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Notifications</h2>
        <div className="max-w-2xl">
          <RequestNotifications
            notifications={notifications}
            onView={handleViewNotification}
            onDismiss={handleDismissNotification}
          />
        </div>
      </div>
    </div>
  );
}
