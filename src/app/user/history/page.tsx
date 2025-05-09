"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, Package, Calendar, CheckCircle, XCircle, AlertCircle, Loader2, Clock, Wrench, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Define types for our history items
type HistoryItem = {
  id: string;
  activityType: 'Request' | 'Check-in' | 'Check-out' | 'Maintenance' | 'Status Change';
  gearName: string;
  date: Date;
  status: string;
  details: string;
};

export default function UserHistoryPage() {
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);

      try {
        console.log("Initializing history fetch...");

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error("Auth error:", {
            message: userError.message,
            name: userError.name,
            stack: userError.stack
          });
          toast({
            title: "Authentication Error",
            description: "Failed to verify user authentication. Please try logging in again.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (!user) {
          console.error("No user is logged in");
          toast({
            title: "Authentication Error",
            description: "Please log in to view your activity history.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        console.log("Authenticated user:", user.id);

        // Fetch both activity log and check-ins
        const [activityResponse, checkinsResponse] = await Promise.all([
          supabase
            .from('gear_activity_log')
            .select(`
              id,
              activity_type,
              status,
              notes,
              details,
              created_at,
              gear_id,
              gear:gears(*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('checkins')
            .select(`
              id,
              checkin_date,
              status,
              condition,
              notes,
              gear_id,
              gear:gears(*)
            `)
            .eq('user_id', user.id)
            .order('checkin_date', { ascending: false })
        ]);

        const activityError = activityResponse.error;
        const checkinsError = checkinsResponse.error;
        const activityData = activityResponse.data || [];
        const checkinsData = checkinsResponse.data || [];

        if (activityError) {
          console.error("Error fetching activity log:", {
            error: activityError,
            message: activityError.message,
            details: activityError.details,
            hint: activityError.hint,
            code: activityError.code,
            status: activityError.status,
            name: activityError?.name,
            stack: activityError?.stack
          });
        }

        if (checkinsError) {
          console.error("Error fetching check-ins:", {
            error: checkinsError,
            message: checkinsError.message
          });
        }

        // Process activity data
        const activityItems = activityData.map((activity: any) => ({
          id: activity.id,
          activityType: activity.activity_type,
          gearName: activity.gear?.name || `Gear ${activity.gear_id?.slice(0, 8) || 'Unknown'}`,
          date: new Date(activity.created_at),
          status: activity.status || 'Unknown',
          details: formatActivityDetails(activity)
        }));

        // Process check-ins data
        const checkinItems = checkinsData.map((checkin: any) => ({
          id: checkin.id,
          activityType: 'Check-in' as const,
          gearName: checkin.gear?.name || `Gear ${checkin.gear_id?.slice(0, 8) || 'Unknown'}`,
          date: new Date(checkin.checkin_date),
          status: checkin.condition || checkin.status || 'Unknown',
          details: checkin.notes || 'Gear checked in'
        }));

        // Combine and sort all history items
        const combinedHistory = [...activityItems, ...checkinItems]
          .sort((a, b) => b.date.getTime() - a.date.getTime());

        setHistory(combinedHistory);
      } catch (error) {
        console.error("Unexpected error in fetchHistory:", {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading your history.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();

    // Set up real-time subscriptions for both tables
    const gearActivityChannel = supabase
      .channel('gear_activity_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gear_activity_log' },
        () => fetchHistory()
      )
      .subscribe();

    const checkinsChannel = supabase
      .channel('checkins_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'checkins' },
        () => fetchHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(gearActivityChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, [toast]);

  const formatActivityDetails = (activity: any): string => {
    switch (activity.activity_type) {
      case 'Request':
        return activity.notes || 'Gear requested';
      case 'Check-in':
        return activity.notes || 'Gear checked in';
      case 'Check-out':
        return activity.notes || 'Gear checked out';
      case 'Maintenance':
        return activity.notes || 'Maintenance performed';
      case 'Status Change':
        if (activity.details) {
          const details = typeof activity.details === 'string'
            ? JSON.parse(activity.details)
            : activity.details;
          return `Status changed from ${details.old_status} to ${details.new_status}`;
        }
        return 'Status updated';
      default:
        return activity.notes || 'No additional details';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Request':
        return <Package className="h-4 w-4" />;
      case 'Check-in':
        return <CheckCircle className="h-4 w-4" />;
      case 'Check-out':
        return <Clock className="h-4 w-4" />;
      case 'Maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'Status Change':
        return <RefreshCcw className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusLower = status.toLowerCase();
    const Icon = getActivityIcon(type);

    switch (statusLower) {
      case 'approved':
      case 'completed':
      case 'good':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
            {Icon}
            <span className="ml-1">{status}</span>
          </Badge>
        );

      case 'checked out':
        return (
          <Badge variant="secondary">
            {Icon}
            <span className="ml-1">Checked Out</span>
          </Badge>
        );

      case 'overdue':
        return (
          <Badge variant="destructive">
            {Icon}
            <span className="ml-1">Overdue</span>
          </Badge>
        );

      case 'rejected':
        return (
          <Badge variant="destructive">
            {Icon}
            <span className="ml-1">{status}</span>
          </Badge>
        );

      case 'damaged':
      case 'completed (damaged)':
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            {Icon}
            <span className="ml-1">{status}</span>
          </Badge>
        );

      case 'pending':
        return (
          <Badge variant="outline">
            {Icon}
            <span className="ml-1">Pending</span>
          </Badge>
        );

      default:
        return (
          <Badge variant="outline">
            {Icon}
            <span className="ml-1">{status}</span>
          </Badge>
        );
    }
  };

  const filteredHistory = history.filter(item =>
    activeTab === "all" ||
    (activeTab === "check-ins" && item.activityType === "Check-in") ||
    (activeTab === "requests" && item.activityType === "Request") ||
    (activeTab === "maintenance" && item.activityType === "Maintenance")
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-6 space-y-6 max-w-7xl"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Activity History</h1>
        <p className="text-muted-foreground">Track your gear requests, check-ins, and other activities.</p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Gear Activity Log</CardTitle>
              <CardDescription>Your past requests and check-ins.</CardDescription>
            </div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="request">Requests</TabsTrigger>
                <TabsTrigger value="check-in">Check-ins</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-10 w-10 animate-spin mr-2 text-primary" />
              <p className="text-muted-foreground">Loading your activity history...</p>
            </div>
          ) : filteredHistory.length > 0 ? (
            <ScrollArea className="h-[600px] rounded-md">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Gear Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((item) => (
                      <motion.tr key={item.id} variants={itemVariants}>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {getActivityIcon(item.activityType)}
                            <span className="ml-1">{item.activityType}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.gearName}</TableCell>
                        <TableCell>{format(item.date, 'PPp')}</TableCell>
                        <TableCell>{getStatusBadge(item.status, item.activityType)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.details}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            </ScrollArea>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-10"
            >
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Activity Found</h3>
              <p className="text-muted-foreground mb-4">You haven't performed any gear-related activities yet.</p>
              <Button asChild>
                <a href="/user/browse">Browse Available Gear</a>
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
