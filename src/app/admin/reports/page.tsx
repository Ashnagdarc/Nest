"use client"

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, Package, AlertTriangle, Calendar, Sheet as SheetIcon, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import { useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage[]>([]);
  const [popularGears, setPopularGears] = useState<PopularGear[]>([]);
  const [checkoutLog, setCheckoutLog] = useState<CheckoutLog[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  async function fetchReportData() {
    // Fetch weekly usage data
    const { data: usageData, error: usageError } = await supabase
      .from('requests')
      .select('created_at, status')
      .order('created_at', { ascending: true });

    if (!usageError && usageData) {
      const weeklyData = (dateRange && dateRange.from && dateRange.to)
        ? processWeeklyData(usageData, dateRange)
        : processWeeklyData(usageData);
      setWeeklyUsage(weeklyData);
    }

    // Fetch popular gears
    const { data: gearData, error: gearError } = await supabase
      .from('requests')
      .select('gear_id, gears(name), created_at')
      .order('created_at', { ascending: false });

    if (!gearError && gearData) {
      const popularData = (dateRange && dateRange.from && dateRange.to)
        ? processPopularGears(gearData, dateRange)
        : processPopularGears(gearData);
      setPopularGears(popularData);
    }

    // Fetch checkout log
    const { data: logData, error: logError } = await supabase
      .from('requests')
      .select(`
        id,
        user_id,
        gear_id,
        reason,
        created_at,
        due_date,
        status,
        checked_in_at,
        users:profiles (
          full_name
        ),
        gears (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (!logError && logData) {
      // Process log data
      const processedLog = logData.map(log => ({
        id: log.id,
        userName: log.users?.full_name || 'Unknown',
        gearName: log.gears?.name || 'Unknown',
        reason: log.reason,
        checkoutDate: new Date(log.created_at),
        dueDate: new Date(log.due_date),
        status: log.status,
        checkinDate: log.checked_in_at ? new Date(log.checked_in_at) : null,
      }));
      setCheckoutLog(processedLog);
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


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <DateRangePicker date={dateRange} onDateChange={handleDateChange} />
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests (Period)</CardTitle>
              <Package className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{weeklyUsage.reduce((sum, w) => sum + w.requests, 0)}</div></CardContent>
          </Card>
        </motion.div>
        <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Damage Reports (Period)</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">6</div></CardContent> {/* Mock Value */}
          </Card>
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most Popular Gear</CardTitle>
              <BarChartIcon className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent><div className="text-lg font-bold">Canon R5</div></CardContent> {/* Mock Value */}
          </Card>
        </motion.div>
      </div>


      {/* Weekly Usage Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-primary" />
              Weekly Usage Trends
            </CardTitle>
            <CardDescription>Requests vs. Damage Reports over the last 4 weeks.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={weeklyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: 'Requests', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} label={{ value: 'Damages', angle: -90, position: 'insideRight', fill: 'hsl(var(--foreground))' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }} />
                <Bar yAxisId="left" dataKey="requests" name="Requests" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="damage" name="Damages" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--chart-4))' }} activeDot={{ r: 6, fill: 'hsl(var(--chart-4))' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>


      {/* Popular Gears Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5 text-primary" />
              Most Popular Gears
            </CardTitle>
            <CardDescription>Top 5 most requested gears in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={popularGears} layout="vertical" margin={{ right: 30 }}> {/* Changed to ComposedChart and vertical */}
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} interval={0} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="requests" name="Requests" fill="hsl(var(--chart-2))" barSize={20} radius={[0, 4, 4, 0]} /> {/* Vertical bar */}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Gear Checkout Log Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SheetIcon className="h-5 w-5 text-primary" /> {/* Excel Sheet Icon */}
                Gear Checkout Log
              </CardTitle>
              <CardDescription>Detailed log of gear checkouts and check-ins for the selected period.</CardDescription>
            </div>
            <Button onClick={downloadCheckoutLogCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export to CSV
            </Button>
          </CardHeader>
          <CardContent>
            <motion.div
              variants={tableContainerVariants}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto"
            >
              <Table>
                <TableCaption>A log of recent gear checkouts and check-ins.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Gear</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Checkout Time</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkoutLog.length > 0 ? (
                    checkoutLog.map((log) => (
                      <tr key={log.id}>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>{log.gearName}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{log.reason}</TableCell>
                        <TableCell>{format(log.checkoutDate, 'PPp')}</TableCell>
                        <TableCell>{log.dueDate ? format(log.dueDate, 'PP') : 'N/A'}</TableCell>
                        <TableCell>{log.checkinDate ? format(log.checkinDate, 'PPp') : 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </tr>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No logs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>


    </motion.div>
  );
}
