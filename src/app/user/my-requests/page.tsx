"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Package,
  RotateCcw, Loader2, Search, Filter, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


interface GearRequest {
  id: string;
  created_at: string;
  reason?: string;
  destination?: string;
  expected_duration?: string;
  status: string;
  user_id: string;
  team_members?: string;
  gear_request_gears?: Array<{
    quantity?: number;
    gear_id?: string;
    gears?: {
      id: string;
      name?: string;
      category?: string;
      description?: string | null;
      serial_number?: string | null;
      quantity: number;
    };
  }>;
}

// Removed unused type

// Extend GearRequest locally to include gears and teamMemberProfiles for UI
type GearWithExtras = {
  id: string;
  name?: string;
  category?: string;
  quantity: number;
};
interface TeamMemberProfile {
  id?: string;
  full_name?: string;
  email?: string;
}

type GearRequestWithExtras = GearRequest & {
  gears?: GearWithExtras[];
  teamMemberProfiles?: TeamMemberProfile[];
  gear_request_gears?: Array<{
    quantity?: number;
    gear_id?: string;
    gears?: {
      id: string;
      name?: string;
      category?: string;
      description?: string | null;
      serial_number?: string | null;
    };
  }>;
};

function MyRequestsContent() {
  const [requests, setRequests] = useState<GearRequestWithExtras[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<GearRequestWithExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<GearRequestWithExtras | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightRequestId = searchParams.get('id');
  const [requestStats, setRequestStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  });

  // keep stats in sync with requests
  useEffect(() => {
    setRequestStats(calculateRequestStats(requests as any));
  }, [requests]);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);


  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/requests/user', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Continue processing even with unauthorized errors
      if (response.status === 401) {
        // Continue without logging
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch requests: ${response.status} ${response.statusText}`);
      }
      const responseData = await response.json();


      // Extract the data array from the response
      const data = responseData.data;

      if (!data || !Array.isArray(data)) {
        console.error('Invalid data format received:', responseData);
        throw new Error('Invalid data format received from server');
      }

      // Process the requests data
      const processedRequests = data.map((req: any) => {
        // Process gear_request_gears data
        let gears: any[] = [];



        if (req.gear_request_gears && Array.isArray(req.gear_request_gears)) {
          // Map gear_request_gears to gears with quantity
          gears = req.gear_request_gears.map((grg: any) => {
            // Case 1: If grg.gears is a full gear object
            if (grg.gears && typeof grg.gears === 'object' && grg.gears.name) {

              return {
                ...grg.gears,
                quantity: grg.quantity || 1,
              };
            }
            // Case 2: If we have a gear_id, create a minimal gear object
            else if (grg.gear_id) {

              return {
                id: grg.gear_id,
                name: `Gear ID: ${grg.gear_id}`,
                quantity: grg.quantity || 1,
              };
            }
            // Case 3: Fallback with minimal info
            else {

              return {
                id: grg.id || `unknown-${Math.random().toString(36).substring(7)}`,
                name: 'Unknown Gear',
                quantity: grg.quantity || 1,
              };
            }
          });
        }

        const validGears = gears.filter(gear => gear.name || gear.id);


        // Process team member profiles
        let teamMemberProfiles: any[] = [];
        if (req.gear_request_team_members && Array.isArray(req.gear_request_team_members)) {
          teamMemberProfiles = req.gear_request_team_members
            .map((member: any) => member.profiles)
            .filter(Boolean);
        }

        return {
          ...req,
          gears,
          teamMemberProfiles,
        };
      });

      setRequests(processedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch gear requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel>;
    const setupRealtimeSubscription = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          console.warn('No authenticated user found for real-time subscription');
          return;
        }

        // Set up real-time subscription for both gear requests and gear_request_gears
        channel = supabase
          .channel('gear_requests_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'gear_requests'
          }, async () => {

            if (mounted) {
              await fetchRequests();
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'gear_request_gears'
          }, async () => {

            if (mounted) {
              await fetchRequests();
            }
          })
          .subscribe();

        return () => {
          if (channel) {
            supabase.removeChannel(channel);
          }
        };

      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Apply filters
  useEffect(() => {
    if (!requests.length) {
      setFilteredRequests([]);
      return;
    }

    let result = [...requests];

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(req =>
        req.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(req =>
        req.gears?.some((gear) => gear?.name?.toLowerCase().includes(term)) ||
        req.destination?.toLowerCase().includes(term) ||
        req.reason?.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(result);
  }, [requests, statusFilter, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <Badge variant="outline" className="rounded-full bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20 px-3 py-1 transition-colors">
            <Clock className="mr-1.5 h-3.5 w-3.5" /> Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 px-3 py-1 transition-colors">
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approved
          </Badge>
        );
      case 'checked out':
        return (
          <Badge variant="secondary" className="rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 px-3 py-1 transition-colors">
            <Package className="mr-1.5 h-3.5 w-3.5" /> Checked Out
          </Badge>
        );
      case 'checked in':
      case 'completed':
      case 'returned':
        return (
          <Badge variant="outline" className="rounded-full bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/50 px-3 py-1 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Returned
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="rounded-full bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20 px-3 py-1 shadow-none transition-colors">
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Rejected
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="rounded-full bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 border border-red-200 transition-colors">
            <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> Overdue
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="rounded-full text-muted-foreground border-dashed bg-muted/50 px-3 py-1 transition-colors">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="rounded-full px-3 py-1 transition-colors">
            {status}
          </Badge>
        );
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId);
    try {
      // Get the request details first
      const { data: request, error: requestError } = await supabase
        .from('gear_requests')
        .select(`
          id,
          status,
          user_id
        `)
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request:', requestError);
        throw new Error(`Failed to fetch request details: ${requestError.message}`);
      }

      // Check if request can be cancelled
      if (!request || request.status?.toLowerCase() !== 'pending') {
        toast({
          title: "Cannot Cancel Request",
          description: "Only pending requests can be cancelled.",
          variant: "destructive"
        });
        return;
      }

      // Start a transaction using RPC
      const { error: cancelError } = await supabase.rpc('cancel_gear_request', {
        p_request_id: requestId
      });

      if (cancelError) {
        console.error('Error in cancel_gear_request RPC:', cancelError);
        throw new Error(`Failed to cancel request: ${cancelError.message}`);
      }

      // Update local state
      setRequests(requests.map(r =>
        r.id === requestId ? { ...r, status: 'Cancelled' } : r
      ));

      // Show success message
      toast({
        title: "Request Cancelled",
        description: "Your gear request has been cancelled successfully."
      });

    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCancellingRequestId(null);
    }
  };

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

  // Format duration directly from expected_duration field
  const formatDuration = (request: GearRequestWithExtras) => {
    if (request.expected_duration) {
      return request.expected_duration;
    }
    return 'N/A';
  };

  // Helpers for rendering


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Stats for summary cards
  const calculateRequestStats = (requests: GearRequestWithExtras[]) => {
    return requests.reduce((stats, request) => {
      const status = request.status?.toLowerCase() || '';

      // Increment total
      stats.total++;

      // Count by status
      if (status === 'pending') {
        stats.pending++;
      } else if (status === 'approved' || status === 'checked out') {
        stats.approved++;
      } else if (status === 'rejected') {
        stats.rejected++;
      } else if (status === 'completed' || status === 'checked in' || status === 'returned') {
        stats.completed++;
      }

      return stats;
    }, {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    });
  };

  const viewRequestDetails = (request: GearRequestWithExtras) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full min-h-screen"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
          <div className="space-y-1">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">My Requests</h1>
            <p className="text-muted-foreground text-lg">Manage and track your equipment usage.</p>
          </div>
          <Button
            onClick={() => router.push('/user/request')}
            className="h-10 px-6 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-all shadow-md"
          >
            <Package className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Stats Grid - Minimalist & Clean */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-accent/20 p-6 shadow-sm border border-border/40 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{requestStats.total}</h3>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-accent/20 p-6 shadow-sm border border-border/40 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{requestStats.pending}</h3>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-accent/20 p-6 shadow-sm border border-border/40 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <h3 className="text-3xl font-bold tracking-tight text-foreground">{requestStats.approved}</h3>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-accent/5 p-2 rounded-2xl border border-border/20 backdrop-blur-sm">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-xl bg-background border-none shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="All Statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="checked out">Checked Out</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="returned">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List/Table View */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading requests...</p>
              </div>
            ) : filteredRequests.length > 0 ? (
              <>
                {/* Desktop View */}
                <div className="hidden sm:block rounded-3xl border border-border/40 overflow-hidden bg-background/50 backdrop-blur-md shadow-sm">
                  <Table>
                    <TableHeader className="bg-accent/10">
                      <TableRow className="border-border/40 hover:bg-transparent">
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pl-6 h-12">Gear Items</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Request Date</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Details</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pr-6 text-right h-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req, idx) => (
                        <TableRow
                          key={req.id}
                          className={`border-border/40 hover:bg-accent/5 transition-colors duration-200 cursor-pointer ${idx % 2 === 0 ? 'bg-background/20' : ''}`}
                          onClick={() => viewRequestDetails(req)}
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                {req.gears && req.gears.length > 0 && req.gears.some(g => (g.name || g.id)) ? (
                                  <>
                                    <span className="font-medium text-sm text-foreground">
                                      {req.gears[0].name || 'Unnamed Gear'}
                                      {req.gears[0].quantity > 1 && <span className="ml-1 text-xs text-muted-foreground">×{req.gears[0].quantity}</span>}
                                    </span>
                                    {req.gears.length > 1 && (
                                      <span className="text-xs text-muted-foreground">
                                        + {req.gears.length - 1} more items
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground italic">No gear details</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{formatDate(req.created_at)}</span>
                              <span className="text-xs text-muted-foreground">{formatDuration(req)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col max-w-[200px]">
                              <span className="text-sm truncate font-medium text-foreground">{req.destination || 'No location'}</span>
                              <span className="text-xs text-muted-foreground truncate">{req.reason || 'No reason specified'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            {getStatusBadge(req.status || 'Unknown')}
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              {req.status?.toLowerCase() === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleCancelRequest(req.id); }}
                                  loading={cancellingRequestId === req.id}
                                  disabled={cancellingRequestId === req.id}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                onClick={(e) => { e.stopPropagation(); viewRequestDetails(req); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-4">
                  {filteredRequests.map((req) => (
                    <motion.div
                      key={req.id}
                      variants={itemVariants}
                      className="rounded-2xl bg-background/50 border border-border/40 p-5 shadow-sm active:scale-[0.98] transition-all"
                      onClick={() => viewRequestDetails(req)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-foreground">
                              {req.gears && req.gears.length > 0 ? req.gears[0].name : 'Request'}
                              {req.gears && req.gears.length > 1 && <span className="text-xs text-muted-foreground ml-1">(+{req.gears.length - 1} more)</span>}
                            </h4>
                            <p className="text-xs text-muted-foreground">{formatDate(req.created_at)}</p>
                          </div>
                        </div>
                        {getStatusBadge(req.status || 'Unknown')}
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground mb-4 pl-13">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider opacity-70">Duration</span>
                          <span className="text-foreground">{formatDuration(req)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-wider opacity-70">Location</span>
                          <span className="text-foreground truncate">{req.destination || '-'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <Button
                          className="flex-1 h-9 rounded-xl bg-accent/10 hover:bg-accent/20 text-muted-foreground hover:text-foreground border-none"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); viewRequestDetails(req); }}
                        >
                          View Details
                        </Button>
                        {req.status?.toLowerCase() === 'pending' && (
                          <Button
                            className="flex-1 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 border-none"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleCancelRequest(req.id); }}
                            disabled={!!cancellingRequestId}
                          >
                            {cancellingRequestId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24 px-4 bg-accent/5 rounded-3xl border border-dashed border-border/40"
              >
                <div className="bg-background inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 shadow-sm ring-1 ring-border/20">
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No requests found</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search criteria to find what you're looking for."
                    : "You haven't made any requests yet. Start by selecting gear for your next project."}
                </p>
                {searchTerm || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                    className="rounded-full px-6 h-10 border-border/40 hover:bg-background"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button
                    onClick={() => router.push('/user/request')}
                    className="rounded-full px-8 h-10 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    New Request
                  </Button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Details Modal - Clean & Modern */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl bg-background/80 backdrop-blur-xl sm:rounded-3xl">
          {selectedRequest && (
            <>
              <div className="p-6 border-b border-border/40">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold flex items-center gap-3">
                    Request Details
                    {getStatusBadge(selectedRequest.status || 'Unknown')}
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    ID: <span className="font-mono text-xs bg-accent/20 px-2 py-0.5 rounded">{selectedRequest.id?.substring(0, 8)}...</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto max-h-[60vh]">
                {/* Gear Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requested Equipment</h4>
                  {selectedRequest.gears && selectedRequest.gears.length > 0 ? (
                    <div className="grid gap-3">
                      {selectedRequest.gears.map((gear, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl bg-accent/5 border border-border/30">
                          <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm truncate">{gear.name || 'Unknown Item'}</h5>
                            <p className="text-xs text-muted-foreground">{gear.category || 'Gear'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-background text-foreground shadow-sm">x{gear.quantity}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No equipment listed.</p>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h4>
                    <p className="text-sm font-medium">{formatDate(selectedRequest.created_at)}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequest.expected_duration || 'Duration not set'}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destination</h4>
                    <p className="text-sm font-medium">{selectedRequest.destination || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-accent/5 p-3 rounded-xl border border-border/20">
                      {selectedRequest.reason || 'No reason provided.'}
                    </p>
                  </div>
                </div>

                {/* Team Section */}
                {selectedRequest.teamMemberProfiles && selectedRequest.teamMemberProfiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Members</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.teamMemberProfiles.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 pr-3 py-1 pl-1 rounded-full bg-accent/10 border border-border/20">
                          <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-[10px] font-bold shadow-sm">
                            {(m.full_name || m.email || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium">{m.full_name || m.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-accent/5 border-t border-border/40 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowDetailsModal(false)} className="rounded-full hover:bg-background">
                  Dismiss
                </Button>
                {selectedRequest?.status?.toLowerCase() === 'pending' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleCancelRequest(selectedRequest.id);
                      setShowDetailsModal(false);
                    }}
                    disabled={cancellingRequestId === selectedRequest.id}
                    className="rounded-full shadow-lg shadow-red-500/10"
                  >
                    {cancellingRequestId === selectedRequest.id ? 'Cancelling...' : 'Cancel Request'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading your dashboard...</p>
      </div>
    </div>
  );
}

export default function MyRequestsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MyRequestsContent />
    </Suspense>
  );
}
