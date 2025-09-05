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

        // Fetch gear requests and check-ins from existing tables
        const [requestsResponse, checkinsResponse] = await Promise.all([
          supabase
            .from('gear_requests')
            .select(`
              id,
              status,
              reason,
              destination,
              created_at,
              updated_at,
              approved_at,
              admin_notes,
              gear_request_gears(
                gear_id,
                quantity,
                gears(
                  id,
                  name,
                  category
                )
              )
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
              gears(
                id,
                name,
                category
              )
            `)
            .eq('user_id', user.id)
            .order('checkin_date', { ascending: false })
        ]);

        const requestsError = requestsResponse.error;
        const checkinsError = checkinsResponse.error;
        const requestsData = requestsResponse.data || [];
        const checkinsData = checkinsResponse.data || [];

        if (requestsError) {
          console.error("Error fetching gear requests:", requestsError);
        }

        if (checkinsError) {
          console.error("Error fetching check-ins:", checkinsError);
        }

        // Process gear requests data
        const requestItems = requestsData.map((request: any) => {
          const gearNames = request.gear_request_gears?.map((grg: any) => 
            grg.gears?.name || `Gear ${grg.gear_id?.slice(0, 8) || 'Unknown'}`
          ).join(', ') || 'Unknown Gear';

          return {
            id: request.id,
            activityType: 'Request' as const,
            gearName: gearNames,
            date: new Date(request.created_at),
            status: request.status,
            details: request.reason || 'Gear requested'
          };
        });

        // Process check-ins data
        const checkinItems = checkinsData.map((checkin: any) => ({
          id: checkin.id,
          activityType: 'Check-in' as const,
          gearName: checkin.gears?.name || `Gear ${checkin.gear_id?.slice(0, 8) || 'Unknown'}`,
          date: new Date(checkin.checkin_date),
          status: checkin.condition || checkin.status || 'Unknown',
          details: checkin.notes || 'Gear checked in'
        }));

        // Combine and sort all history items
        const combinedHistory = [...requestItems, ...checkinItems]
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
    const gearRequestsChannel = supabase
      .channel('gear_requests_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'gear_requests' },
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
      supabase.removeChannel(gearRequestsChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, [toast]);


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
    (activeTab === "check-in" && item.activityType === "Check-in") ||
    (activeTab === "request" && item.activityType === "Request") ||
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
      className="container mx-auto py-8 space-y-8 max-w-7xl"
    >
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Activity History</h1>
        <p className="text-muted-foreground text-lg">Track your gear requests, check-ins, and other activities.</p>
      </div>

      <Card className="border-2">
        <CardHeader className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
            <div>
              <CardTitle className="text-2xl">Gear Activity Log</CardTitle>
              <CardDescription className="text-base mt-2">Your past requests and check-ins.</CardDescription>
            </div>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  All
                </TabsTrigger>
                <TabsTrigger value="request" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Requests
                </TabsTrigger>
                <TabsTrigger value="check-in" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Check-ins
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Maintenance
                </TabsTrigger>
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
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <History className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No Activity Found</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                You haven't performed any gear-related activities yet. Start by requesting some equipment.
              </p>
              <Button asChild size="lg" className="px-8">
                <a href="/user/browse">
                  <Package className="mr-2 h-4 w-4" />
                  Browse Available Gear
                </a>
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
