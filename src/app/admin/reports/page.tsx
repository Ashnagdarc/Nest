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
import { SimpleReport } from "@/components/reports/SimpleReport";
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
import { subDays } from 'date-fns';
import PageHeader from '@/components/foundation/PageHeader';

interface PopularGear {
  name: string;
  count: number;
  fullName: string;
  category?: string;
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

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching analytics data...');

      // Use the new analytics API
      const response = await fetch(`/api/admin/analytics?from=${dateRange?.from?.toISOString() || ''}&to=${dateRange?.to?.toISOString() || ''}`);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('No data received from analytics API');
      }

      // Update analytics state with the API response
      setAnalytics(result.data);

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
      console.error('Error loading analytics:', errorMessage);

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

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 container mx-auto py-8"
      >
        <PageHeader
          title="Reports & Analytics"
          actions={(
            <div className="flex items-center gap-2">
              <DatePickerWithRange dateRange={dateRange} onDateRangeChange={setDateRange} />
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
                      <RefreshCw className="icon-16 animate-spin" />
                    ) : (
                      <RefreshCw className="icon-16" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh data to get the latest information</p>
                </TooltipContent>
              </UITooltip>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(!showHelp)} className="h-8 w-8 p-0" aria-label="Toggle help panel">
                <HelpCircle className="icon-16" />
              </Button>
            </div>
          )}
        />

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
                <div className="text-lg font-semibold text-muted-foreground">
                  {analytics.totalRequests === 0 ? 'No requests yet' : 'No popular gear data'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="icon-16" />
                      <CardTitle className="text-base">Weekly Usage Trends</CardTitle>
                    </div>
                  </div>
                  <CardDescription>Requests vs. Damage Reports over the selected period</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center bg-muted/20 p-6">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
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

              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                      {analytics.popularGears.map((gear: any, index: number) => (
                        <div key={index} className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-md transition-colors">
                          <div className="flex flex-col">
                            <span className="font-medium">{gear.name}</span>
                            {gear.category && (
                              <span className="text-xs text-muted-foreground">{gear.category}</span>
                            )}
                          </div>
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
            <Card className="overflow-hidden mb-6">
              <SimpleReport dateRange={dateRange} />
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Recent Activity Log</CardTitle>
                  </div>
                </div>
                <CardDescription>Latest gear activities from the system</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
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

                {isLoading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-6 bg-muted rounded animate-pulse w-40"></div>
                    ))}
                  </div>
                ) : filteredActivity.length > 0 ? (
                  <div className="px-6 pb-4">
                    {activityByDay.map(([day, items]) => (
                      <div key={day} className="mb-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{day}</div>
                        <div className="divide-y divide-border rounded-md border">
                          {items.map((activity: any) => (
                            <div key={activity.id} className="py-3 px-3 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                {activity.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm">
                                      <span className="font-medium">{activity.userName}</span>{' '}
                                      <span className="text-muted-foreground">
                                        {activity.notes || `${activity.type.toLowerCase()} ${activity.gearName}`}
                                      </span>
                                    </p>
                                    {activity.status && activity.status !== 'Unknown' && (
                                      <Badge
                                        variant={
                                          activity.status === 'approved' ? 'default' :
                                            activity.status === 'rejected' ? 'destructive' :
                                              activity.status === 'pending' ? 'secondary' : 'outline'
                                        }
                                        className="text-xs"
                                      >
                                        {activity.status}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(activity.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                {activity.gearCategory && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Category: {activity.gearCategory}
                                  </div>
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
