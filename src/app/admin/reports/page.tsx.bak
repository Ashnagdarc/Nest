"use client";

import { motion, type Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, LineChartIcon, Package, AlertTriangle, Calendar, SheetIcon, Download, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line } from 'recharts';
import { useState, useEffect, useRef } from 'react';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface AnalyticsData {
  totalRequests: number;
  totalDamageReports: number;
  popularGears: Array<{
    name: string;
    count: number;
    fullName: string;
  }>;
  weeklyTrends: Array<{
    week: string;
    weekLabel: string;
    requests: number;
    damages: number;
  }>;
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
    weeklyTrends: []
  });
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [requestsResult, damageResult] = await Promise.all([
          supabase
            .from('gear_requests')
            .select('*')
            .gte('created_at', dateRange?.from?.toISOString() || '')
            .lte('created_at', dateRange?.to?.toISOString() || ''),
          supabase
            .from('gear_maintenance')
            .select('*')
            .eq('maintenance_type', 'Damage Report')
            .gte('created_at', dateRange?.from?.toISOString() || '')
            .lte('created_at', dateRange?.to?.toISOString() || '')
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (damageResult.error) throw damageResult.error;

        setAnalytics({
          totalRequests: requestsResult.data?.length || 0,
          totalDamageReports: damageResult.data?.length || 0,
          popularGears: generateMockPopularGears(),
          weeklyTrends: generateMockWeeklyTrends()
        });

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  function generateMockWeeklyTrends() {
    return Array.from({ length: 8 }, (_, i) => ({
      week: `2024-${String(i + 1).padStart(2, '0')}`,
      weekLabel: `W${i + 1}`,
      requests: Math.floor(Math.random() * 50) + 10,
      damages: Math.floor(Math.random() * 10)
    }));
  }

  function generateMockPopularGears() {
    const gears = [
      'Camera Kit A',
      'Tripod Pro',
      'Lighting Set',
      'Audio Equipment',
      'Drone Kit'
    ];

    return gears.map(name => ({
      name,
      fullName: name,
      count: Math.floor(Math.random() * 50) + 10
    }));
  }

  const handleRefresh = () => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [requestsResult, damageResult] = await Promise.all([
          supabase
            .from('gear_requests')
            .select('*')
            .gte('created_at', dateRange?.from?.toISOString() || '')
            .lte('created_at', dateRange?.to?.toISOString() || ''),
          supabase
            .from('gear_maintenance')
            .select('*')
            .eq('maintenance_type', 'Damage Report')
            .gte('created_at', dateRange?.from?.toISOString() || '')
            .lte('created_at', dateRange?.to?.toISOString() || '')
        ]);

        if (requestsResult.error) throw requestsResult.error;
        if (damageResult.error) throw damageResult.error;

        setAnalytics({
          totalRequests: requestsResult.data?.length || 0,
          totalDamageReports: damageResult.data?.length || 0,
          popularGears: generateMockPopularGears(),
          weeklyTrends: generateMockWeeklyTrends()
        });

        toast({
          title: "Data Refreshed",
          description: "Latest analytics data has been loaded.",
        });

      } catch (error) {
        console.error('Error refreshing data:', error);
        setError('Failed to refresh analytics data');
        toast({
          title: "Refresh Failed",
          description: "There was an error refreshing the data.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="container max-w-7xl mx-auto space-y-6 pb-8"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6 pb-3 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">View and analyze equipment usage</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <DatePickerWithRange 
              dateRange={dateRange} 
              onDateRangeChange={setDateRange} 
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh Data"
              className="shrink-0 h-10 w-10"
            >
              <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 px-4 md:px-8 py-6">
        {error && (
          <div className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[200px]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalRequests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Damage Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalDamageReports}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold truncate">
                    {analytics.popularGears[0]?.name || 'No data'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Trends</CardTitle>
                <CardDescription>Equipment requests and damage reports over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.weeklyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="weekLabel" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requests" fill="#8884d8" name="Requests" />
                      <Line type="monotone" dataKey="damages" stroke="#ff0000" name="Damages" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Popular Equipment */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Equipment</CardTitle>
                <CardDescription>Most frequently requested items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      layout="vertical"
                      data={analytics.popularGears}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  );
}
