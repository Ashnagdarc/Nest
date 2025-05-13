"use client"

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChartIcon, Package, AlertTriangle, Calendar, SheetIcon, Download, CheckCircle, RefreshCw, Filter, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { format, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Input } from "@/components/ui/input";
import { PostgrestError } from '@supabase/supabase-js';

interface GearCheckout {
  id: string;
  gear_id: string;
  checkout_date: string;
  checkin_date: string | null;
  gears?: {
    name: string;
  };
}

interface GearRequest {
  id: number;
  created_at: string;
  status: string;
}

interface GearMaintenance {
  id: number;
  gear_id: string;
  status: string;
  description: string;
  performed_at: string;
  performed_by: string;
  created_at: string;
  maintenance_type: string;
}

interface Profile {
  id: string;
  status: string;
}

interface GearData {
  id: string;
  name: string;
  category?: string;
  created_at: string;
}

type WeeklyUsage = {
  week: string;
  requests: number;
  damage: number;
};

type PopularGear = {
  name: string;
  requests: number;
};

interface RawCheckoutLog {
  id: string;
  checkout_date: string;
  status: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  gears?: {
    name: string;
  };
}

interface CheckoutLog {
  id: string;
  userName: string;
  gearName: string;
  checkoutDate: Date;
  status: string;
  user?: {
    full_name: string;
    email: string;
  };
  gears?: Array<{
    name: string;
  }>;
}

// Update the type definitions at the top of the file
type RealtimePayload = {
  [key: string]: any;
  type: string;
  table: string;
  schema: string;
  commit_timestamp: string;
  eventType: string;
  new: { [key: string]: any };
  old: { [key: string]: any };
};

// Add these type definitions
type GearRequestPayload = RealtimePostgresChangesPayload<{
  old: GearRequest | null;
  new: GearRequest;
}>;

type GearPayload = RealtimePostgresChangesPayload<{
  old: GearData | null;
  new: GearData;
}>;

// Add new interface for activity log
interface GearActivityLog {
  id: number;
  gear_id: string;
  user_id: string;
  created_at: string;
  gears?: {
    name: string;
  };
}

// Update AnalyticsData interface
interface AnalyticsData {
  totalRequests: number;
  totalCheckouts: number;
  totalCheckins: number;
  totalDamageReports: number;
  totalRepairs: number;
  activeUsers: number;
  popularGears: Array<{ name: string; count: number }>;
  weeklyTrends: Array<{
    week: string;
    requests: number;
    checkouts: number;
    damages: number;
    activities: number;
  }>;
  recentActivities: Array<{
    id: number;
    gearName: string;
    userName: string;
    actionType: string;
    description: string;
    timestamp: string;
  }>;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), // Last 30 days
    to: new Date() // Current date
  });
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage[]>([]);
  const [popularGears, setPopularGears] = useState<PopularGear[]>([]);
  const [checkoutLog, setCheckoutLog] = useState<CheckoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalDamages, setTotalDamages] = useState(0);
  const [mostPopularGear, setMostPopularGear] = useState<string>('None');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRequests: 0,
    totalCheckouts: 0,
    totalCheckins: 0,
    totalDamageReports: 0,
    totalRepairs: 0,
    activeUsers: 0,
    popularGears: [],
    weeklyTrends: [],
    recentActivities: []
  });

  // Define initializeData at the component level so it's accessible to all effects and handlers
  const initializeData = async () => {
    setIsLoading(true);
    console.log('Initializing data fetch with date range:', dateRange);
    try {
      // First check if tables exist
      const { data: tablesExist, error: checkError } = await supabase
        .from('gear_requests')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      if (checkError) {
        console.error('Error checking tables:', checkError);
        throw new Error('Failed to check database tables');
      }

      // Fetch all data first, then process errors
      console.log('Fetching data from all tables...');

      const [
        requestsResult,
        damageResult,
        usersResult,
        checkoutsResult,
        activityLogResult
      ] = await Promise.all([
        supabase
          .from('gear_requests')
          .select('id, created_at, status')
          .gte('created_at', dateRange?.from?.toISOString() || '')
          .lte('created_at', dateRange?.to?.toISOString() || ''),

        supabase
          .from('gear_maintenance')
          .select(`
            id,
            gear_id,
            status,
            description,
            performed_at,
            performed_by,
            created_at,
            maintenance_type,
            gears!gear_maintenance_gear_id_fkey (
              name
            )
          `)
          .gte('created_at', dateRange?.from?.toISOString() || '')
          .lte('created_at', dateRange?.to?.toISOString() || ''),

        supabase
          .from('profiles')
          .select('id, status')
          .eq('status', 'active'),

        supabase
          .from('gear_checkouts')
          .select(`
            id,
            checkout_date,
            status,
            profiles!gear_checkouts_user_id_fkey (
              full_name,
              email
            ),
            gears!gear_checkouts_gear_id_fkey (
              name
            )
          `)
          .gte('checkout_date', dateRange?.from?.toISOString() || '')
          .lte('checkout_date', dateRange?.to?.toISOString() || '')
          .order('checkout_date', { ascending: false }),

        supabase
          .from('gear_activity_log')
          .select(`
            id,
            gear_id,
            user_id,
            created_at,
            gears!gear_activity_log_gear_id_fkey (
              name
            )
          `)
          .gte('created_at', dateRange?.from?.toISOString() || '')
          .lte('created_at', dateRange?.to?.toISOString() || '')
          .order('created_at', { ascending: false })
      ]);

      // Log all responses for debugging
      console.log('API Responses:', {
        requests: requestsResult,
        damage: damageResult,
        users: usersResult,
        checkouts: checkoutsResult,
        activityLog: activityLogResult
      });

      // Check for errors in any response
      const errors = [];
      if (requestsResult.error) errors.push(`Requests: ${requestsResult.error.message}`);
      if (damageResult.error) errors.push(`Maintenance: ${damageResult.error.message}`);
      if (usersResult.error) errors.push(`Users: ${usersResult.error.message}`);
      if (checkoutsResult.error) errors.push(`Checkouts: ${checkoutsResult.error.message}`);
      if (activityLogResult.error) errors.push(`Activity Log: ${activityLogResult.error.message}`);

      if (errors.length > 0) {
        throw new Error(`Data fetch errors:\n${errors.join('\n')}`);
      }

      // Process analytics data
      const gearCounts = new Map<string, number>();
      (checkoutsResult.data || []).forEach((checkout: any) => {
        const gearName = checkout.gears?.name || 'Unknown Gear';
        gearCounts.set(gearName, (gearCounts.get(gearName) || 0) + 1);
      });

      const popularGears = Array.from(gearCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Process activity log data
      const recentActivities = (activityLogResult.data || []).map((log: GearActivityLog) => ({
        id: log.id,
        gearName: log.gears?.name || 'Unknown Gear',
        userName: 'Unknown User',
        actionType: 'Activity',
        description: 'N/A',
        timestamp: log.created_at
      }));

      // Process weekly trends
      const weeklyData = new Map<string, { requests: number; checkouts: number; damages: number; activities: number }>();

      (requestsResult.data || []).forEach((request: GearRequest) => {
        const week = format(new Date(request.created_at), 'yyyy-ww');
        const current = weeklyData.get(week) || { requests: 0, checkouts: 0, damages: 0, activities: 0 };
        weeklyData.set(week, { ...current, requests: current.requests + 1 });
      });

      (checkoutsResult.data || []).forEach((checkout: any) => {
        const week = format(new Date(checkout.checkout_date), 'yyyy-ww');
        const current = weeklyData.get(week) || { requests: 0, checkouts: 0, damages: 0, activities: 0 };
        weeklyData.set(week, { ...current, checkouts: current.checkouts + 1 });
      });

      (damageResult.data || []).forEach((damage: GearMaintenance) => {
        const week = format(new Date(damage.created_at), 'yyyy-ww');
        const current = weeklyData.get(week) || { requests: 0, checkouts: 0, damages: 0, activities: 0 };
        weeklyData.set(week, { ...current, damages: current.damages + 1 });
      });

      // Add activity log to weekly trends
      (activityLogResult.data || []).forEach((activity: GearActivityLog) => {
        const week = format(new Date(activity.created_at), 'yyyy-ww');
        const current = weeklyData.get(week) || { requests: 0, checkouts: 0, damages: 0, activities: 0 };
        weeklyData.set(week, { ...current, activities: current.activities + 1 });
      });

      const weeklyTrends = Array.from(weeklyData.entries())
        .map(([week, data]) => ({ week, ...data }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Update state
      setAnalytics({
        totalRequests: requestsResult.data?.length || 0,
        totalCheckouts: checkoutsResult.data?.length || 0,
        totalCheckins: 0,
        totalDamageReports: (damageResult.data || []).filter((d: GearMaintenance) => d.maintenance_type === 'Damage Report')?.length || 0,
        totalRepairs: (damageResult.data || []).filter((d: GearMaintenance) => d.status === 'Under Repair')?.length || 0,
        activeUsers: usersResult.data?.length || 0,
        popularGears,
        weeklyTrends,
        recentActivities: recentActivities.slice(0, 10) // Show only the 10 most recent activities
      });

      // Process checkout logs
      const processedLogs: CheckoutLog[] = (checkoutsResult.data || []).map((log: any) => ({
        id: log.id,
        userName: log.profiles?.full_name || 'Unknown User',
        gearName: log.gears?.name || 'Unknown Gear',
        checkoutDate: new Date(log.checkout_date),
        status: log.status || 'Unknown',
        user: log.profiles,
        gears: log.gears ? [log.gears] : []
      }));

      setCheckoutLog(processedLogs);
      console.log('Data processing completed successfully');

    } catch (error) {
      console.error('Error during data initialization:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      console.error('Detailed error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Data fetching effect
  useEffect(() => {
    initializeData();
  }, [dateRange]);

  // Update the realtime subscription handlers
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      if (channelRef.current) {
        console.log('Removing existing realtime subscription');
        await supabase.removeChannel(channelRef.current);
      }

      console.log('Setting up new realtime subscription');
      const channel = supabase.channel('reports-analytics-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'gear_requests' },
          (payload: RealtimePostgresChangesPayload<RealtimePayload>) => {
            console.log('Realtime update from gear_requests:', payload);
            toast({
              title: "Data Updated",
              description: "New request data available. Refreshing reports...",
            });
            initializeData();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'gear_checkouts' },
          (payload: RealtimePostgresChangesPayload<RealtimePayload>) => {
            console.log('Realtime update from gear_checkouts:', payload);
            initializeData();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'gear_maintenance' },
          (payload: RealtimePostgresChangesPayload<RealtimePayload>) => {
            console.log('Realtime update from gear_maintenance:', payload);
            initializeData();
          }
        );

      await channel.subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        console.log('Realtime subscription status:', status);
      });

      channelRef.current = channel;
    };

    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

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

  const tableContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1, // Delay children animation slightly
      }
    }
  };

  const tableRowVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Function to handle date range changes
  const handleDateChange = (newDateRange: DateRange | undefined) => {
    // Ensure we don't allow future dates
    const now = new Date();
    const adjustedRange = newDateRange ? {
      from: newDateRange.from,
      to: newDateRange.to && newDateRange.to > now ? now : newDateRange.to
    } : undefined;

    setDateRange(adjustedRange);
    console.log("Selected date range:", adjustedRange);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'checked out':
        return <Badge variant="secondary"><Package className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'checked in':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Function to handle CSV download for checkout log
  const downloadCheckoutLogCSV = () => {
    const dataToDownload = checkoutLog; // Use actual data

    if (dataToDownload.length === 0) {
      toast({ title: "No Data", description: "There is no checkout log data to download.", variant: "destructive" });
      return;
    }

    const headers = ['Log ID', 'User Name', 'Gear Name', 'Checkout Date', 'Status'];

    const csvData = checkoutLog.map(log => [
      `"${log.id}"`,
      `"${log.userName}"`,
      `"${log.gearName}"`,
      format(log.checkoutDate, 'yyyy-MM-dd HH:mm'),
      `"${log.status}"`
    ]);

    const csvContent = [
      headers,
      ...csvData
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `checkout_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({ title: "Download Started", description: "Checkout log (CSV format) is downloading." });
  };

  // Manual refresh handler
  const handleRefresh = () => {
    initializeData();
    toast({
      title: "Refreshing Data",
      description: "Fetching the latest reports and analytics...",
    });
  };

  const exportToCSV = () => {
    const csvData = checkoutLog.map(log => [
      `"${log.id}"`,
      `"${log.userName}"`,
      `"${log.gearName}"`,
      format(log.checkoutDate, 'yyyy-MM-dd HH:mm'),
      `"${log.status}"`
    ]);

    const csvContent = [
      ['Log ID', 'User Name', 'Gear Name', 'Checkout Date', 'Status'],
      ...csvData
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `checkout_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
          <DatePickerWithRange dateRange={dateRange} onDateRangeChange={handleDateChange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Refresh Data"
          >
            <RefreshCw className={isRefreshing || isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs mt-1">Please try refreshing the data or contact support if the issue persists.</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-4" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Summary Cards - Top Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="overflow-hidden">
                <div className="h-1 bg-blue-500"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChartIcon className="h-4 w-4 text-blue-500" />
                    Total Requests (Period)
                  </CardTitle>
                  <CardDescription>Equipment requested during selected timeframe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.totalRequests}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="overflow-hidden">
                <div className="h-1 bg-orange-500"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Damage Reports (Period)
                  </CardTitle>
                  <CardDescription>Reported damages during selected timeframe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.totalDamageReports}</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="overflow-hidden">
                <div className="h-1 bg-purple-500"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4 text-purple-500" />
                    Most Popular Gear
                  </CardTitle>
                  <CardDescription>Most requested item during selected timeframe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold truncate">{analytics.popularGears[0]?.name || 'None'}</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Usage Trends Chart */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-primary" />
                        Weekly Usage Trends
                      </CardTitle>
                      <CardDescription>Requests vs. Damage Reports over the selected period</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {dateRange?.from && dateRange?.to ? (
                        format(dateRange.from, 'MMM d, yyyy') + ' - ' + format(dateRange.to, 'MMM d, yyyy')
                      ) : (
                        'All Time'
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  {weeklyUsage.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <p className="mb-2">No usage data available for the selected period</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({
                          from: subDays(new Date(), 90),
                          to: new Date()
                        })}
                      >
                        View Last 90 Days
                      </Button>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart
                        data={weeklyUsage}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const parts = value.split('-W');
                            return `W${parts[1]} `;
                          }}
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => (value === 0 ? '0' : value)}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => (value === 0 ? '0' : value)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--background)',
                            borderColor: 'var(--border)',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value: any) => [`${value} `, '']}
                          labelFormatter={(label) => {
                            const parts = label.split('-W');
                            return `Week ${parts[1]}, ${parts[0]} `;
                          }}
                        />
                        <Legend formatter={(value) => value === 'requests' ? 'Equipment Requests' : 'Damage Reports'} />
                        <Bar
                          yAxisId="left"
                          dataKey="requests"
                          fill="var(--primary)"
                          opacity={0.8}
                          radius={[4, 4, 0, 0]}
                          name="requests"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="damage"
                          stroke="var(--destructive)"
                          strokeWidth={3}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6, stroke: 'var(--destructive)', strokeWidth: 2 }}
                          name="damage"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Popular Gears */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Most Popular Gears */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChartIcon className="h-5 w-5 text-primary" />
                    Most Popular Gears
                  </CardTitle>
                  <CardDescription>Top 5 most requested gears in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.popularGears.length === 0 ? (
                    <div className="text-center py-5 text-muted-foreground">
                      <p>No gear request data available for the selected period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart
                        layout="vertical"
                        data={analytics.popularGears}
                        margin={{ top: 10, right: 10, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 12 }}
                          width={120}
                          tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--background)',
                            borderColor: 'var(--border)',
                            borderRadius: '8px'
                          }}
                          formatter={(value: any) => [`${value} requests`, '']}
                          labelFormatter={(label) => label}
                        />
                        <Bar
                          dataKey="count"
                          fill="var(--primary)"
                          radius={[0, 4, 4, 0]}
                          label={{
                            position: 'right',
                            fill: 'var(--foreground)',
                            fontSize: 12
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Gear Checkout Log */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <SheetIcon className="h-5 w-5 text-primary" />
                        Gear Checkout Log
                      </CardTitle>
                      <CardDescription>Detailed log of gear checkouts for the selected period</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={checkoutLog.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      <span>Export CSV</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {checkoutLog.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground px-6">
                      <p>No checkout data available for the selected period</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Gear</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {checkoutLog.slice(0, 5).map((log, index) => (
                            <TableRow key={log.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{log.userName}</TableCell>
                              <TableCell>{log.gearName}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {format(log.checkoutDate, 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">{getStatusBadge(log.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        {checkoutLog.length > 5 && (
                          <TableCaption className="px-4">
                            <Button variant="ghost" size="sm" className="w-full">
                              View all {checkoutLog.length} entries
                            </Button>
                          </TableCaption>
                        )}
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity Log */}
          {!isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SheetIcon className="h-5 w-5 text-primary" />
                    Recent Activity Log
                  </CardTitle>
                  <CardDescription>Latest gear-related activities across the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.recentActivities.length === 0 ? (
                    <div className="text-center py-5 text-muted-foreground">
                      <p>No recent activities found for the selected period</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analytics.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.gearName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.actionType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                by {activity.userName} • {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
