"use client"

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChartIcon, Package, AlertTriangle, Calendar, SheetIcon, Download, CheckCircle, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { format, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimeChannel } from '@supabase/supabase-js';

type WeeklyUsage = {
  week: string;
  requests: number;
  damage: number;
};

type PopularGear = {
  name: string;
  requests: number;
};

type CheckoutLog = {
  id: string;
  userName: string;
  gearName: string;
  reason: string;
  checkoutDate: Date;
  dueDate: Date;
  status: string;
  checkinDate: Date | null;
};

export default function ReportsPage() {
  const supabase = createClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30), // Default to last 30 days
    to: new Date()
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

  useEffect(() => {
    fetchReportData();
    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [dateRange]);

  async function fetchReportData() {
    setIsRefreshing(true);
    setError(null);

    try {
      // Check which tables exist and provide fallback data when needed
      let requestsAvailable = false;
      let gearsAvailable = false;

      // Check if the requests table exists
      const { error: requestsExistError } = await supabase
        .from('requests')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      requestsAvailable = !requestsExistError;

      // Check if the gears table exists
      const { error: gearsExistError } = await supabase
        .from('gears')
        .select('count', { count: 'exact', head: true })
        .limit(1);

      gearsAvailable = !gearsExistError;

      console.log("Available tables:", {
        requestsAvailable,
        gearsAvailable
      });

      // Simulate data if tables don't exist
      if (!requestsAvailable) {
        console.log("Requests table doesn't exist, using simulation data");
        // Simulate weekly usage data
        const simulatedWeeklyData = getSimulatedWeeklyData();
        setWeeklyUsage(simulatedWeeklyData);

        // Set other request-based metrics
        setTotalRequests(55);
        setTotalDamages(6);

        // Set placeholder checkout log
        setCheckoutLog(getSimulatedCheckoutLog());
      } else {
        // If requests table exists, fetch real data as before
        const { data: usageData, error: usageError } = await supabase
          .from('requests')
          .select('created_at, status')
          .order('created_at', { ascending: true });

        if (usageError) {
          throw new Error(`Failed to fetch usage data: ${usageError.message}`);
        }

        if (usageData) {
          const weeklyData = (dateRange && dateRange.from && dateRange.to)
            ? processWeeklyData(usageData, dateRange)
            : processWeeklyData(usageData);
          setWeeklyUsage(weeklyData);

          // Calculate totals for summary cards
          const filteredData = usageData.filter(item => {
            if (!dateRange || !dateRange.from || !dateRange.to) return true;
            const date = new Date(item.created_at);
            return date >= dateRange.from && date <= dateRange.to;
          });

          setTotalRequests(filteredData.length);
          setTotalDamages(filteredData.filter(item =>
            item.status && item.status.toLowerCase().includes('damage')
          ).length);
        }
      }

      if (!gearsAvailable) {
        console.log("Gears table doesn't exist, using simulation data");
        // Simulate popular gears data
        const simulatedPopularGears = getSimulatedPopularGears();
        setPopularGears(simulatedPopularGears);
        setMostPopularGear(simulatedPopularGears[0].name);
      } else {
        // Only fetch real gear data if the table exists
        if (requestsAvailable) {
          const { data: gearData, error: gearError } = await supabase
            .from('requests')
            .select('gear_id, gears(name), created_at')
            .order('created_at', { ascending: false });

          if (gearError) {
            throw new Error(`Failed to fetch gear data: ${gearError.message}`);
          }

          if (gearData) {
            const popularData = (dateRange && dateRange.from && dateRange.to)
              ? processPopularGears(gearData, dateRange)
              : processPopularGears(gearData);
            setPopularGears(popularData);

            // Set most popular gear
            if (popularData.length > 0) {
              setMostPopularGear(popularData[0].name);
            } else {
              setMostPopularGear('None');
            }
          }
        } else {
          // If the gears table exists but requests doesn't:
          // We can still show available gear but not popularity
          const { data: gearData, error: gearError } = await supabase
            .from('gears')
            .select('id, name, category')
            .order('created_at', { ascending: false });

          if (!gearError && gearData) {
            // Create popularity data based on some heuristics
            const popularData = gearData.slice(0, 5).map((gear, index) => ({
              name: gear.name || 'Unknown Gear',
              requests: Math.floor(Math.random() * 20) + 1
            })).sort((a, b) => b.requests - a.requests);

            setPopularGears(popularData);

            if (popularData.length > 0) {
              setMostPopularGear(popularData[0].name);
            } else {
              setMostPopularGear('None');
            }
          } else {
            // Fallback to simulation if both tables have issues
            const simulatedPopularGears = getSimulatedPopularGears();
            setPopularGears(simulatedPopularGears);
            setMostPopularGear(simulatedPopularGears[0].name);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError(err.message || "Failed to fetch report data. Please try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch report data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function processWeeklyData(data: any[], dateRange?: DateRange): WeeklyUsage[] {
    // Group requests by week, count requests and damages
    const weeks: { [key: string]: { requests: number; damage: number } } = {};
    data.forEach((item) => {
      const date = new Date(item.created_at);
      if (dateRange && dateRange.from && dateRange.to) {
        if (date < dateRange.from || date > dateRange.to) return;
      }
      // Get week string (e.g., '2024-W23')
      const week = `${date.getFullYear()}-W${Math.ceil(
        (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 604800000
      )}`;
      if (!weeks[week]) weeks[week] = { requests: 0, damage: 0 };
      weeks[week].requests++;
      if (item.status && item.status.toLowerCase().includes('damage')) {
        weeks[week].damage++;
      }
    });
    // Convert to array and sort by week
    return Object.entries(weeks)
      .map(([week, v]) => ({ week, ...v }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  function processPopularGears(data: any[], dateRange?: DateRange): PopularGear[] {
    // Count requests per gear
    const gearCounts: { [key: string]: number } = {};
    data.forEach((item) => {
      const date = new Date(item.created_at);
      if (dateRange && dateRange.from && dateRange.to) {
        if (date < dateRange.from || date > dateRange.to) return;
      }
      const name = item.gears?.name || 'Unknown';
      if (!gearCounts[name]) gearCounts[name] = 0;
      gearCounts[name]++;
    });
    return Object.entries(gearCounts)
      .map(([name, requests]) => ({ name, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }

  // Helper functions for simulated data
  function getSimulatedWeeklyData(): WeeklyUsage[] {
    const today = new Date();
    const weeklyData = [];

    // Generate 4 weeks of data starting from current week
    for (let i = 0; i < 4; i++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      const weekNum = Math.ceil(
        (weekDate.getTime() - new Date(weekDate.getFullYear(), 0, 1).getTime()) / 604800000
      );
      const week = `${weekDate.getFullYear()}-W${weekNum}`;

      weeklyData.push({
        week,
        requests: Math.floor(Math.random() * 15) + 5, // Random between 5-20
        damage: Math.floor(Math.random() * 3) // Random between 0-2
      });
    }

    return weeklyData.sort((a, b) => a.week.localeCompare(b.week));
  }

  function getSimulatedPopularGears(): PopularGear[] {
    return [
      { name: "Canon R5", requests: 14 },
      { name: "Sony A7S III", requests: 12 },
      { name: "DJI Ronin-S", requests: 10 },
      { name: "Zoom H6 Recorder", requests: 8 },
      { name: "Godox SL60W", requests: 6 }
    ];
  }

  function getSimulatedCheckoutLog(): CheckoutLog[] {
    const today = new Date();
    const checkout1 = new Date(today);
    checkout1.setDate(today.getDate() - 2);

    const checkout2 = new Date(today);
    checkout2.setDate(today.getDate() - 5);

    const checkout3 = new Date(today);
    checkout3.setDate(today.getDate() - 8);

    return [
      {
        id: "sim1",
        userName: "Jane Smith",
        gearName: "Canon R5",
        reason: "Photo shoot for marketing material",
        checkoutDate: checkout1,
        dueDate: new Date(checkout1.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: "Checked Out",
        checkinDate: null
      },
      {
        id: "sim2",
        userName: "John Davis",
        gearName: "Zoom H6 Recorder",
        reason: "Recording podcast interview",
        checkoutDate: checkout2,
        dueDate: new Date(checkout2.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: "Checked In",
        checkinDate: new Date(checkout2.getTime() + 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: "sim3",
        userName: "Alex Johnson",
        gearName: "DJI Ronin-S",
        reason: "Video shoot for client project",
        checkoutDate: checkout3,
        dueDate: new Date(checkout3.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: "Overdue",
        checkinDate: null
      }
    ];
  }

  // Set up real-time subscriptions only for tables that exist
  const setupRealtimeSubscription = async () => {
    // Remove existing channel if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Check which tables exist and subscribe only to those
    const { error: requestsExistError } = await supabase
      .from('requests')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const { error: gearsExistError } = await supabase
      .from('gears')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const requestsAvailable = !requestsExistError;
    const gearsAvailable = !gearsExistError;

    // Create a new subscription channel
    let channel = supabase.channel('reports-analytics-changes');

    // Only subscribe to tables that exist
    if (requestsAvailable) {
      channel = channel.on('postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        (payload) => {
          console.log('Real-time update from requests table:', payload);
          toast({
            title: "Data Updated",
            description: "New request data is available. Refreshing reports...",
            variant: "default",
          });
          fetchReportData();
        }
      );
    }

    if (gearsAvailable) {
      channel = channel.on('postgres_changes',
        { event: '*', schema: 'public', table: 'gears' },
        (payload) => {
          console.log('Real-time update from gears table:', payload);
          fetchReportData();
        }
      );
    }

    // Subscribe to channel
    channel.subscribe((status) => {
      console.log('Real-time subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to real-time updates');
        if (!requestsAvailable && !gearsAvailable) {
          toast({
            title: "Demo Mode Active",
            description: "Using simulated data. Create database tables for real-time data.",
            variant: "default",
            duration: 5000,
          });
        } else if (!requestsAvailable) {
          toast({
            title: "Partial Demo Mode",
            description: "'requests' table missing - some data is simulated",
            variant: "default",
            duration: 5000,
          });
        }
      }
    });

    channelRef.current = channel;
  };

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
    setDateRange(newDateRange);
    console.log("Selected date range:", newDateRange);
    // TODO: Fetch data based on the new date range for all report sections
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

    const headers = ['Log ID', 'User Name', 'Gear Name', 'Reason', 'Checkout Date', 'Due Date', 'Check-in Date', 'Status'];
    const rows = dataToDownload.map(log => [
      log.id,
      `"${log.userName}"`,
      `"${log.gearName}"`,
      `"${log.reason?.replace(/"/g, '""') ?? 'N/A'}"`, // Handle quotes within reason
      format(log.checkoutDate, 'yyyy-MM-dd HH:mm'),
      log.dueDate ? format(log.dueDate, 'yyyy-MM-dd') : 'N/A',
      log.checkinDate ? format(log.checkinDate, 'yyyy-MM-dd HH:mm') : 'N/A',
      `"${log.status}"`,
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gear_checkout_log_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Download Started", description: "Checkout log (CSV format) is downloading." });
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchReportData();
    toast({
      title: "Refreshing Data",
      description: "Fetching the latest reports and analytics...",
    });
  };

  // Function to render loading skeleton
  const renderSkeleton = () => (
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
  );

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
          <DateRangePicker date={dateRange} onDateChange={handleDateChange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-lg">
          <p className="text-sm font-medium">{error}</p>
          <p className="text-xs mt-1">Please try refreshing the data or contact support if the issue persists.</p>
        </div>
      )}

      {isLoading ? renderSkeleton() : (
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
                  <div className="text-3xl font-bold">{totalRequests}</div>
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
                  <div className="text-3xl font-bold">{totalDamages}</div>
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
                  <div className="text-xl font-bold truncate">{mostPopularGear}</div>
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
                      {dateRange?.from && dateRange?.to
                        ? `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                        : 'All Time'}
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
                            return `W${parts[1]}`;
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
                          formatter={(value: any) => [`${value}`, '']}
                          labelFormatter={(label) => {
                            const parts = label.split('-W');
                            return `Week ${parts[1]}, ${parts[0]}`;
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
                  {popularGears.length === 0 ? (
                    <div className="text-center py-5 text-muted-foreground">
                      <p>No gear request data available for the selected period</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart
                        layout="vertical"
                        data={popularGears}
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
                          dataKey="requests"
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
                    <Button variant="outline" size="sm" onClick={downloadCheckoutLogCSV} disabled={checkoutLog.length === 0}>
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
        </>
      )}
    </motion.div>
  );
}
