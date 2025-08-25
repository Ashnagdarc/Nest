"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { WeeklyActivityReport } from "@/components/reports/WeeklyActivityReport";
import { subscribeToTable, unsubscribeFromTable, RealtimeSubscription } from '@/lib/utils/realtime-utils';
import logger from '@/lib/logger';
import {
  HelpCircle,
  BarChart3,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiGet } from '@/lib/apiClient';
import Image from 'next/image';
import { subDays, format, getISOWeek, formatDistanceToNow } from 'date-fns';

interface Gear {
  id: string;
  name: string;
  full_name?: string;
  category?: string;
}

interface GearRequest {
  id?: string;
  gear_ids?: string[];
  gears?: Gear[];
}

interface PopularGear {
  name: string;
  count: number;
  fullName: string;
}

interface WeeklyTrend {
  week: string;
  weekLabel: string;
  requests: number;
  damages: number;
}

interface ActivityLogEntry {
  id: string;
  type: string;
  timestamp: string;
  status: string;
  gearName: string;
  gearCategory?: string;
  gearImage?: string;
  userName: string;
  userAvatar?: string;
  notes?: string;
  details?: Record<string, unknown>;
}

interface AnalyticsData {
  totalRequests: number;
  totalDamageReports: number;
  popularGears: Array<PopularGear>;
  weeklyTrends: Array<WeeklyTrend>;
  recentActivity: Array<ActivityLogEntry>;
}

interface RequestData {
  created_at: string;
}

interface GearData {
  id: string;
  name: string;
  category?: string;
  image_url?: string;
  full_name?: string;
}

interface ProfileData {
  id: string;
  full_name?: string;
  avatar_url?: string;
}

interface ActivityData {
  id: string;
  gear_id?: string;
  user_id?: string;
  activity_type: string;
  status?: string;
  notes?: string;
  details?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRequests: 0,
    totalDamageReports: 0,
    popularGears: [],
    weeklyTrends: [],
    recentActivity: []
  });
  const [showHelp, setShowHelp] = useState(false);
  const [activityType, setActivityType] = useState<'all' | 'Check-in' | 'Check-out' | 'Maintenance' | 'Request' | 'Status Change'>('all');
  const [activityQuery, setActivityQuery] = useState('');

  const filteredActivity = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    return (analytics.recentActivity || []).filter(a => {
      const typeOk = activityType === 'all' || a.type === activityType;
      const text = `${a.userName} ${a.gearName} ${a.status} ${a.gearCategory || ''}`.toLowerCase();
      const searchOk = q === '' || text.includes(q);
      return typeOk && searchOk;
    });
  }, [analytics.recentActivity, activityType, activityQuery]);

  const activityByDay = useMemo(() => {
    const groups: Record<string, typeof filteredActivity> = {} as any;
    filteredActivity.forEach(a => {
      const key = new Date(a.timestamp).toDateString();
      if (!groups[key]) groups[key] = [] as any;
      groups[key].push(a);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [filteredActivity]);
  const { toast } = useToast();
  const supabase = createClient();

  async function fetchPopularGears(): Promise<PopularGear[]> {
    try {
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error('Invalid date range');
      }

      // Use the new view to get all gear requests with their gears
      const { data: requestData, error: queryError } = await supabase
        .from('gear_requests_with_gears')
        .select('*')
        .gte('request_created_at', dateRange.from.toISOString())
        .lte('request_created_at', dateRange.to.toISOString());

      if (queryError) {
        console.error('Query Error Details:', queryError);
        throw new Error(`Failed to query gear_requests_with_gears: ${queryError.message}`);
      }

      if (!Array.isArray(requestData)) {
        throw new Error('Invalid response format: expected an array of gear requests with gears');
      }

      // Aggregate gear usage by gear_id
      const gearUsage = new Map<string, { name: string; fullName: string; count: number }>();
      requestData.forEach(row => {
        const key = row.gear_id;
        const name = row.gear_name || 'Unknown Gear';
        const fullName = row.gear_name || 'Unknown Gear';
        const existing = gearUsage.get(key) || { name, fullName, count: 0 };
        gearUsage.set(key, { ...existing, count: existing.count + 1 });
      });

      return Array.from(gearUsage.values())
        .sort((a, b) => b.count - a.count)
        .map(item => ({
          name: item.name,
          fullName: item.fullName,
          count: item.count
        }));
    } catch (error) {
      console.error('Error fetching popular gears:', error);
      return [];
    }
  }

  // Add weekly trends fetching logic
  async function fetchWeeklyTrends(): Promise<WeeklyTrend[]> {
    try {
      console.log('Fetching weekly trends for date range:', {
        from: dateRange?.from?.toISOString() || '',
        to: dateRange?.to?.toISOString() || ''
      });

      // Use centralized API client for requests
      const { data: requestsData, error: requestsError } = await apiGet<{ data: RequestData[]; error: string | null }>(`/api/requests?from=${dateRange?.from?.toISOString() || ''}&to=${dateRange?.to?.toISOString() || ''}`);
      if (requestsError) throw new Error(requestsError);

      // Use existing Supabase for damages (not migrated here)
      const damagesResult = await supabase
        .from('gear_maintenance')
        .select('created_at')
        .eq('maintenance_type', 'Damage Report')
        .gte('created_at', dateRange?.from?.toISOString() || '')
        .lte('created_at', dateRange?.to?.toISOString() || '');
      if (damagesResult.error) throw damagesResult.error;

      const weeklyData: Record<string, { requests: number; damages: number }> = {};

      // Process request data
      (requestsData || []).forEach((request: RequestData) => {
        const date = new Date(request.created_at);
        const weekKey = `${format(date, 'yyyy')}-${getISOWeek(date)}`;
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { requests: 0, damages: 0 };
        }
        weeklyData[weekKey].requests++;
      });

      // Process damage reports data
      damagesResult.data?.forEach((damage: RequestData) => {
        const date = new Date(damage.created_at);
        const weekKey = `${format(date, 'yyyy')}-${getISOWeek(date)}`;
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { requests: 0, damages: 0 };
        }
        weeklyData[weekKey].damages++;
      });

      return Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, data]) => ({
          week,
          weekLabel: `Week ${week.split('-')[1]}`,
          requests: data.requests,
          damages: data.damages
        }));
    } catch (err) {
      console.error('Error fetching weekly trends:', err);
      throw err; // Propagate the error for better handling in fetchData
    }
  }

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching analytics data...');

      // Get total requests count using API client
      const { data: requestsData, error: requestsError } = await supabase
        .from('gear_requests')
        .select('*')
        .gte('created_at', dateRange?.from?.toISOString() || '')
        .lte('created_at', dateRange?.to?.toISOString() || '');

      if (requestsError) throw requestsError;

      // Get total damage reports count
      const { data: damageData, error: damageError } = await supabase
        .from('gear_maintenance')
        .select('id', { count: 'exact' })
        .eq('maintenance_type', 'Damage Report')
        .gte('created_at', dateRange?.from?.toISOString() || '')
        .lte('created_at', dateRange?.to?.toISOString() || '');
      if (damageError) throw damageError;

      // Get popular gears
      let popularGears: PopularGear[] = [];
      try {
        popularGears = await fetchPopularGears();
      } catch (gearError) {
        console.error('Error fetching popular gears:', gearError);
        // Continue without popular gears data
      }

      // Get weekly trends
      const weeklyTrends = await fetchWeeklyTrends();

      // Get recent activity log data
      let recentActivity: ActivityLogEntry[] = [];
      try {
        console.log('Fetching activity log data from database...');

        // First check if the gear_activity_log table exists and has data
        const { count, error: countError } = await supabase
          .from('gear_activity_log')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('Error checking gear_activity_log table:', countError);
          throw countError;
        }

        console.log(`Found ${count} total entries in gear_activity_log table`);

        if (count && count > 0) {
          // First, fetch just the activity log data without joins
          const { data: activityData, error: activityError } = await supabase
            .from('gear_activity_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(15);

          if (activityError) {
            console.error('Error fetching activity log data:', activityError);
            throw activityError;
          }

          if (!activityData || activityData.length === 0) {
            console.log('No activity log entries found in the selected date range');
            return;
          }

          console.log('Successfully fetched activity log data:', activityData.length, 'entries');
          console.log('First entry sample:', JSON.stringify(activityData[0], null, 2));

          // Get the gear IDs and user IDs
          const gearIds = activityData
            .map((activity: ActivityData) => activity.gear_id)
            .filter((id: string | undefined): id is string => id !== null && id !== undefined);

          const userIds = activityData
            .map((activity: ActivityData) => activity.user_id)
            .filter((id: string | undefined): id is string => id !== null && id !== undefined);

          // Fetch gear details for activity log
          const { data: gearsData, error: gearsError } = await supabase
            .from('gears')
            .select('id, name, category, image_url')
            .in('id', gearIds);

          if (gearsError) {
            throw new Error(`Failed to fetch gear details: ${gearsError.message}`);
          }

          // Fetch user details separately
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profile details:', profilesError);
            // Continue with what we have - don't throw
          }

          // Create lookup maps for fast access
          const gearMap = new Map<string, GearData>();
          if (gearsData) {
            gearsData.forEach((gear: GearData) => {
              gearMap.set(gear.id, gear);
            });
          }

          const userMap = new Map<string, ProfileData>();
          if (profilesData) {
            profilesData.forEach((profile: ProfileData) => {
              userMap.set(profile.id, profile);
            });
          }

          // Create a function to generate avatar URL if not available
          const getAvatarUrl = (name: string) => {
            // Generate a deterministic color based on the name
            const colors = ['0D8ABC', 'E03A3F', '32A852', '7047EB', 'F9A826', '2E86C1', 'CB4335', '28B463', '8E44AD', 'D68910'];
            const hash = name.split('').reduce((a, b) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0);
            const colorIndex = Math.abs(hash) % colors.length;
            const color = colors[colorIndex];

            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff`;
          };

          // Map the activity data with gear and user details
          recentActivity = activityData.map((activity: ActivityData) => {
            const gear = activity.gear_id ? gearMap.get(activity.gear_id) : undefined;
            const user = activity.user_id ? userMap.get(activity.user_id) : undefined;

            const gearName = gear?.name || 'Unknown Gear';
            const userName = user?.full_name || 'Unknown User';

            return {
              id: activity.id,
              type: activity.activity_type,
              timestamp: activity.created_at,
              status: activity.status || 'Unknown',
              gearName: gearName,
              gearCategory: gear?.category,
              gearImage: gear?.image_url,
              userName: userName,
              userAvatar: user?.avatar_url || getAvatarUrl(userName),
              notes: activity.notes,
              details: activity.details
            };
          });

          console.log('Successfully processed activity data with gear and user details');
        } else {
          console.log('No activity log entries found in the database');
        }
      } catch (activityError) {
        console.error('Error in activity log processing:', activityError);
        // Continue without activity log data
      }

      // Update analytics state
      setAnalytics({
        totalRequests: requestsData?.length || 0,
        totalDamageReports: damageData?.length || 0,
        popularGears,
        weeklyTrends,
        recentActivity
      });

      console.log('Analytics data updated successfully with the following data:',
        `- Total Requests: ${requestsData?.length || 0}`,
        `- Total Damage Reports: ${damageData?.length || 0}`,
        `- Popular Gears: ${popularGears.length}`,
        `- Weekly Trends: ${weeklyTrends.length}`,
        `- Recent Activity: ${recentActivity.length}`
      );

      // Show success toast if this was a manual refresh
      if (!isLoading) {
        toast({
          title: "Data refreshed",
          description: "Analytics data has been updated.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError('Failed to load analytics data: ' + errorMessage);
      console.error('Error loading analytics:', err);

      toast({
        title: "Error loading data",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
    toast({
      title: "Data Refreshed",
      description: "Analytics data has been updated with the latest information.",
    });
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Add a subscription for real-time updates
  useEffect(() => {
    // Create subscriptions for all relevant tables
    const subscriptions: RealtimeSubscription[] = [];

    try {
      // Subscribe to gear requests changes
      const requestsSub = subscribeToTable('gear_requests', '*', () => {
        logger.info('Gear requests changed, refreshing data...', 'Reports');
        fetchData();
      });
      if (requestsSub) subscriptions.push(requestsSub);

      // Subscribe to gear maintenance/damage changes
      const maintenanceSub = subscribeToTable('gear_maintenance', '*', () => {
        logger.info('Gear maintenance changed, refreshing data...', 'Reports');
        fetchData();
      });
      if (maintenanceSub) subscriptions.push(maintenanceSub);

      // Subscribe to gear activity log changes
      const activityLogSub = subscribeToTable('gear_activity_log', '*', () => {
        logger.info('Activity log changed, refreshing data...', 'Reports');
        fetchData();
      });
      if (activityLogSub) subscriptions.push(activityLogSub);
    } catch (error) {
      logger.error(error, 'Error setting up realtime subscriptions for reports page');
      toast({
        title: "Realtime updates unavailable",
        description: "You'll need to refresh manually to see the latest data.",
        variant: "destructive"
      });
    }

    // Return cleanup function
    return () => {
      subscriptions.forEach(unsubscribeFromTable);
    };
  }, []);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 container mx-auto py-8"
      >
        {/* Enhanced Header with Help */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            </div>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(!showHelp)}
                  className="h-8 w-8 p-0"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for help understanding these reports</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="flex items-center gap-2">
            <DatePickerWithRange
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="ml-2 h-10 w-10 p-0"
                  aria-label="Refresh data"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh data to get the latest information</p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Understanding Your Reports</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="space-y-2 text-sm">
                <p><strong>📊 Overview Cards:</strong> Show total requests, damage reports, and most popular gear for your selected time period.</p>
                <p><strong>📈 Weekly Trends:</strong> Blue bars show gear requests, red line shows damage reports. Higher bars/lines indicate more activity.</p>
                <p><strong>🏆 Popular Gear:</strong> Lists the 5 most requested items. Use this to identify high-demand equipment.</p>
                <p><strong>📋 Activity Log:</strong> Shows recent actions like check-outs, returns, and maintenance requests with user details.</p>
                <p><strong>💡 Tip:</strong> Use the date picker to analyze different time periods and identify trends in your organization's gear usage.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 border border-destructive/20">
            <p className="font-medium">{error}</p>
            <p className="text-sm mt-1">Please try refreshing the data or contact support if the issue persists.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Total Requests Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold">{analytics.totalRequests}</div>
              )}
            </CardContent>
          </Card>

          {/* Total Damage Reports Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Damage Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold">{analytics.totalDamageReports}</div>
              )}
            </CardContent>
          </Card>

          {/* Most Popular Gear Card */}
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Popular Gear</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
              ) : analytics.popularGears.length > 0 ? (
                <div>
                  <div className="text-2xl font-bold truncate">
                    {analytics.popularGears[0].name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.popularGears[0].count} requests
                  </div>
                </div>
              ) : (
                <div className="text-lg font-semibold text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Categorized Reports per HIG: Overview, Trends, Activity */}
        <Tabs defaultValue="overview" className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Total Requests Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                  ) : (
                    <div className="text-3xl font-bold">{analytics.totalRequests}</div>
                  )}
                </CardContent>
              </Card>

              {/* Total Damage Reports Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Damage Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                  ) : (
                    <div className="text-3xl font-bold">{analytics.totalDamageReports}</div>
                  )}
                </CardContent>
              </Card>

              {/* Most Popular Gear Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Most Popular Gear</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
                  ) : analytics.popularGears.length > 0 ? (
                    <div>
                      <div className="text-2xl font-bold truncate">
                        {analytics.popularGears[0].name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {analytics.popularGears[0].count} requests
                      </div>
                    </div>
                  ) : (
                    <div className="text-lg font-semibold text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Weekly Usage Trends */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10"></line>
                        <line x1="12" y1="20" x2="12" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="14"></line>
                      </svg>
                      <CardTitle className="text-base">Weekly Usage Trends</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Requests vs. Damage Reports over the selected period</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center bg-muted/20 p-6">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-muted-foreground">Loading chart data...</p>
                      </div>
                    </div>
                  ) : analytics.weeklyTrends.length > 0 ? (
                    <div className="h-[300px] px-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={analytics.weeklyTrends} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="weekLabel" className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.5rem',
                              color: 'hsl(var(--foreground))'
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: 10 }} />
                          <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" barSize={40} radius={[4, 4, 0, 0]} />
                          <Line
                            type="monotone"
                            dataKey="damages"
                            stroke="hsl(var(--destructive))"
                            name="Damages"
                            strokeWidth={2}
                            dot={{ strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }}
                            activeDot={{ strokeWidth: 0, r: 6, fill: 'hsl(var(--destructive))' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-6">
                      <p>No usage data available for the selected period</p>
                      <Button variant="link" onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}>
                        View Last 90 Days
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Most Popular Gears */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <CardTitle className="text-base">Most Popular Gears</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Top 5 most requested gears in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-5 bg-muted rounded animate-pulse w-32"></div>
                          <div className="h-6 bg-muted rounded animate-pulse w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : analytics.popularGears.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.popularGears.map((gear, index) => (
                        <div key={index} className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-md transition-colors">
                          <span className="font-medium">{gear.name}</span>
                          <Badge variant="secondary" className="group-hover:bg-background">{gear.count} requests</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <p>No gear request data available for the selected period</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            {/* Weekly Activity Report */}
            <Card className="overflow-hidden mb-6">
              <WeeklyActivityReport dateRange={dateRange} />
            </Card>

            {/* Recent Activity Log */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 7.8L8 5v10l4 2.8L16 15V5l-4 2.8z" />
                      <path d="M8 15l4 2.8" />
                      <path d="M16 15l-4 2.8" />
                      <path d="M12 4v3.8" />
                      <path d="M12 15v4" />
                    </svg>
                    <CardTitle className="text-base">Recent Activity Log</CardTitle>
                  </div>
                </div>
                <CardDescription>Latest gear activities from the system</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Filters */}
                <div className="p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="Check-in">Check-in</SelectItem>
                      <SelectItem value="Check-out">Check-out</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Request">Request</SelectItem>
                      <SelectItem value="Status Change">Status Change</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search user, gear, status..."
                    value={activityQuery}
                    onChange={(e) => setActivityQuery(e.target.value)}
                    className="sm:max-w-sm"
                  />
                </div>

                {/* Grouped list by day */}
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-6 bg-muted rounded animate-pulse w-40"></div>
                    ))}
                  </div>
                ) : filteredActivity.length > 0 ? (
                  <div className="px-6 pb-4">
                    {activityByDay.map(([day, items]) => (
                      <div key={day} className="mb-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{day}</div>
                        <div className="divide-y divide-border rounded-md border">
                          {items.map((activity) => (
                            <div key={activity.id} className="py-3 px-3 flex items-start gap-3">
                              {activity.userAvatar ? (
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0">
                                  <Image src={activity.userAvatar} alt={activity.userName} width={32} height={32} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                  {activity.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm">
                                    <span className="font-medium">{activity.userName}</span>{' '}
                                    <span className="text-muted-foreground">
                                      {activity.type === 'Check-out' && 'checked out'}
                                      {activity.type === 'Check-in' && 'returned'}
                                      {activity.type === 'Maintenance' && 'sent for maintenance'}
                                      {activity.type === 'Request' && 'requested'}
                                      {activity.type === 'Status Change' && 'changed status of'}
                                    </span>{' '}
                                    <span className="font-medium">{activity.gearName}</span>
                                  </p>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                {activity.notes && (
                                  <div className="mt-1 text-xs text-muted-foreground">{activity.notes}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-10 text-muted-foreground">No activity for filters</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </TooltipProvider>
  );
}
