"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Clock, XCircle, AlertCircle, Package,
  RotateCcw, Loader2, Search, Filter, Eye, Calendar,
  BarChart3, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// Removed unused import
import { apiGet } from '@/lib/apiClient';

interface GearState {
  status: string;
  available_quantity: number;
  checked_out_to?: string | null;
  due_date?: string | null;
}

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
      gear_states?: GearState[];
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
  currentState?: GearState;
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
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'checked out':
        return <Badge variant="secondary"><Package className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'checked in':
      case 'completed':
      case 'returned':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground border-dashed"><RotateCcw className="mr-1 h-3 w-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
  const formatTeamMembers = (request: GearRequestWithExtras) => {
    if (!request.teamMemberProfiles || request.teamMemberProfiles.length === 0) {
      return 'None';
    }

    return request.teamMemberProfiles.map((member: { full_name?: string; email?: string }) =>
      member.full_name || member.email || 'Unknown user'
    ).join(', ');
  };

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
      className="space-y-6"
    >
      <>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">My Gear Requests</h1>
          <Button
            onClick={() => router.push('/user/request')}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            New Request
          </Button>
        </div>



        {/* Summary Cards (minimal: Pending, Approved) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 rounded-lg shadow-sm w-full max-w-full">
            <CardContent className="py-2 px-3 sm:p-4 flex flex-row items-center gap-3">
              <Package className="h-6 w-6 text-blue-400 dark:text-blue-300 flex-shrink-0" />
              <div className="flex flex-col items-start justify-center">
                <div className="text-base sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{requestStats.total}</div>
                <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">Total Requests</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 rounded-lg shadow-sm w-full max-w-full">
            <CardContent className="py-2 px-3 sm:p-4 flex flex-row items-center gap-3">
              <Clock className="h-6 w-6 text-amber-400 dark:text-amber-300 flex-shrink-0" />
              <div className="flex flex-col items-start justify-center">
                <div className="text-base sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{requestStats.pending}</div>
                <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 rounded-lg shadow-sm w-full max-w-full">
            <CardContent className="py-2 px-3 sm:p-4 flex flex-row items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400 dark:text-green-300 flex-shrink-0" />
              <div className="flex flex-col items-start justify-center">
                <div className="text-base sm:text-2xl font-bold text-green-600 dark:text-green-400">{requestStats.approved}</div>
                <div className="text-xs sm:text-sm text-green-700 dark:text-green-300">Approved</div>
              </div>
            </CardContent>
          </Card>

        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
            <CardDescription>Track the status of your gear checkout requests.</CardDescription>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mt-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search gear, location, reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
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
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <p>Loading your requests...</p>
              </div>
            ) : filteredRequests.length > 0 ? (
              <>
                {/* Card/List view for mobile, table for sm+ */}
                <div className="block sm:hidden space-y-3 mt-4">
                  {filteredRequests.map((req) => (
                    <Card key={req.id} className="rounded-lg shadow-sm p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-base truncate max-w-[60%]">
                          {req.gears && req.gears.length > 0 && req.gears.some(gear => (gear.name || gear.id)) ? (
                            <div className="space-y-1">
                              {req.gears.map((gear, idx) => (
                                <div key={gear.id ?? idx} className="space-y-1">
                                  <div>
                                    {gear.name || 'Unnamed Gear'}
                                    <span className="font-bold text-primary">
                                      x {gear.quantity}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {gear.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {gear.category}
                                      </Badge>
                                    )}
                                    {gear.currentState && (
                                      <Badge variant="secondary" className="text-xs">
                                        {gear.currentState.status} • {gear.currentState.available_quantity} available
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            'No gear selected'
                          )}
                        </div>
                        {getStatusBadge(req.status || 'Unknown')}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">Requested: {formatDate(req.created_at)}</div>
                      <div className="text-xs text-muted-foreground mb-1">Duration: {formatDuration(req)}</div>
                      <div className="text-xs text-muted-foreground mb-1">Destination: {req.destination || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground mb-1">Team: {formatTeamMembers(req)}</div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewRequestDetails(req)}
                          className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {req.status?.toLowerCase() === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelRequest(req.id)}
                            className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            loading={cancellingRequestId === req.id}
                            disabled={cancellingRequestId === req.id}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" /> Cancel
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                {/* Table view for larger screens */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requested Gear(s)</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Team Members</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">
                            {req.gears && req.gears.length > 0 && req.gears.some(gear => (gear.name || gear.id)) ? (
                              <div className="space-y-1">
                                {req.gears.map((gear, idx) => (
                                  <div key={gear.id ?? idx} className="flex items-center gap-1">
                                    <span>{gear.name || 'Unnamed Gear'}</span>
                                    <span className="font-bold text-primary">x {gear.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              'No gear selected'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(req.created_at)}
                          </TableCell>
                          <TableCell>
                            {formatDuration(req)}
                          </TableCell>
                          <TableCell>
                            {req.destination || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(req.status || 'Unknown')}
                          </TableCell>
                          <TableCell>
                            {formatTeamMembers(req)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewRequestDetails(req)}
                                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {req.status?.toLowerCase() === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelRequest(req.id)}
                                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                  loading={cancellingRequestId === req.id}
                                  disabled={cancellingRequestId === req.id}
                                >
                                  <RotateCcw className="mr-1 h-3 w-3" /> Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-12 px-4"
              >
                <div className="bg-muted/30 inline-flex items-center justify-center w-16 h-16 rounded-full mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No gear requests found</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search filters to find what you're looking for."
                    : "You haven't made any gear requests yet. Get started by requesting the gear you need."}
                </p>



                {searchTerm || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => router.push('/user/request')}>
                    Request Gear
                  </Button>
                )}
              </motion.div>
            )}
          </CardContent>

          {!loading && filteredRequests.length > 0 && (
            <CardFooter className="flex justify-between items-center border-t px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredRequests.length} of {requests.length} requests
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/user/request')}>
                <Package className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Request Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Detailed information about your gear request.
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-muted-foreground" /> Request Information
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="col-span-2">{getStatusBadge(selectedRequest.status)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="text-muted-foreground">Requested:</span>
                        <span className="col-span-2">{formatDate(selectedRequest.created_at)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="col-span-2">{selectedRequest.expected_duration}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="col-span-2">{selectedRequest.destination || 'Not specified'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-sm">
                        <span className="text-muted-foreground">Reason:</span>
                        <span className="col-span-2">{selectedRequest.reason || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center">
                      <Package className="h-4 w-4 mr-1 text-muted-foreground" /> Requested Gear
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      {selectedRequest.gears && selectedRequest.gears.length > 0 ? (
                        <div className="space-y-3">
                          {selectedRequest.gears?.map((gear, index) => (
                            <div key={gear.id ?? index} className={`${index > 0 ? 'pt-2 border-t border-muted' : ''}`}>
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {gear.name}
                                  <span className="font-bold text-primary">
                                    x {gear.quantity}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {gear.category || 'No category'}
                                  </Badge>
                                  {gear.currentState && (
                                    <Badge variant="secondary" className="text-xs">
                                      {gear.currentState.status} • {gear.currentState.available_quantity} available
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ID: {gear.id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No gear information available</div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center">
                    <Users className="h-4 w-4 mr-1 text-muted-foreground" /> Team Members
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-3">
                    {selectedRequest.teamMemberProfiles && selectedRequest.teamMemberProfiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.teamMemberProfiles.map((member: { id?: string; full_name?: string; email?: string }) => (
                          <Badge key={member.id} variant="secondary">
                            {member.full_name || member.email || 'Unknown user'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No team members assigned</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
              {selectedRequest?.status === 'Pending' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleCancelRequest(selectedRequest.id);
                    setShowDetailsModal(false);
                  }}
                  loading={cancellingRequestId === selectedRequest.id}
                  disabled={cancellingRequestId === selectedRequest.id}
                >
                  Cancel Request
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Loading your gear requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
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
