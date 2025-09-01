"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, RefreshCw, Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from '@/components/ui/button';
// import dynamic from 'next/dynamic';
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// import { createSystemNotification } from '@/lib/notifications';
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { apiGet } from '@/lib/apiClient';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";
// import RequestHeader from '@/components/admin/requests/RequestHeader';
import RequestFilters from '@/components/admin/requests/RequestFilters';
import RequestTable, { type GearRequest as TableGearRequest } from '@/components/admin/requests/RequestTable';
import RequestEmptyState from '@/components/admin/requests/RequestEmptyState';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PageHeader from '@/components/foundation/PageHeader';
import FiltersBar from '@/components/foundation/FiltersBar';
import TableToolbar from '@/components/foundation/TableToolbar';

// Animations not used after UI refactor

// --- Import the notification sound ---
const NOTIFICATION_SOUND_URL = '/sounds/notification-bell.mp3';

// Add a function to determine if a request has been attended to
const isAttendedRequest = (status: string) => {
  const attendedStatuses = ['approved', 'rejected', 'checked out', 'returned', 'overdue'];
  return attendedStatuses.includes(status.toLowerCase());
};

// Add timeline components
const Timeline = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-4">
    {children}
  </div>
);

const TimelineItem = ({
  status,
  date,
  note,
  changedBy
}: {
  status: string;
  date: Date;
  note?: string;
  changedBy?: string;
}) => (
  <div className="flex gap-4 items-start">
    <div className="mt-1">
      <div className={cn(
        "h-3 w-3 rounded-full",
        status.toLowerCase() === 'approved' ? "bg-green-500" :
          status.toLowerCase() === 'rejected' ? "bg-red-500" :
            status.toLowerCase() === 'checked out' ? "bg-blue-500" :
              status.toLowerCase() === 'checked in' ? "bg-purple-500" :
                "bg-gray-500"
      )} />
    </div>
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{status}</p>
        <p className="text-xs text-muted-foreground">{format(date, 'PPp')}</p>
      </div>
      {changedBy && (
        <p className="text-xs text-muted-foreground">by {changedBy}</p>
      )}
      {note && (
        <p className="text-sm text-muted-foreground">{note}</p>
      )}
    </div>
  </div>
);

// Add type definitions
interface GearRequest {
  id: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  gearNames: string[];
  requestDate: Date;
  duration: string;
  reason?: string;
  destination?: string;
  status: string;
  adminNotes?: string | null;
  checkoutDate?: Date | null;
  dueDate?: Date | null;
  checkinDate?: Date | null;
  updatedAt?: Date;
  gear_request_gears?: Array<{
    gear_id: string;
    gears: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      serial_number: string | null;
    };
  }>;
}

interface StatusHistoryItem {
  status: string;
  changed_at: string;
  note?: string;
  profiles?: {
    full_name: string;
  };
}

// Performance optimization: Debounced search
const useDebouncedSearch = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function ManageRequestsContent() {
  const supabase = createClient();
  const { toast } = useToast();
  const { showSuccessFeedback } = useSuccessFeedback();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // State management
  const [requests, setRequests] = useState<GearRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<GearRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [gearFilter, setGearFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Performance states
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounced search for better performance
  const debouncedKeyword = useDebouncedSearch(keyword, 300);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);

    // Check for user preference in localStorage
    const savedSoundPreference = localStorage.getItem('flowtagSoundEnabled');
    if (savedSoundPreference !== null) {
      setSoundEnabled(savedSoundPreference === 'true');
    }
  }, []);

  // Save sound preference when it changes
  useEffect(() => {
    localStorage.setItem('flowtagSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Optimized gear name extraction function with fallback support
  const extractGearNames = useCallback((request: { gear_request_gears?: Array<{ gears?: { name?: string } }>; gear_ids?: string[] }): string[] => {
    const gearNames: string[] = [];

    // First, try to extract from gear_request_gears junction table
    if (request.gear_request_gears && Array.isArray(request.gear_request_gears)) {
      const junctionNames = request.gear_request_gears
        .map((item) => item.gears?.name)
        .filter((name): name is string => Boolean(name && name.trim() !== ''))
        .map((name) => name.trim());

      if (junctionNames.length > 0) {
        gearNames.push(...junctionNames);
      }
    }

    // If no names found from junction table, try to extract from gear_ids array
    if (gearNames.length === 0 && request.gear_ids && Array.isArray(request.gear_ids)) {
      // For gear_ids, we'll return placeholder names since we don't have the actual names
      // This will be handled by the API or we can fetch them separately
      gearNames.push(...request.gear_ids.map((id: string) => `Gear ${id.slice(0, 8)}...`));
    }

    // If still no names, return empty array
    return gearNames;
  }, []);

  // Function to fetch gear names for requests that don't have them in the junction table
  const fetchMissingGearNames = useCallback(async (request: { gear_ids?: string[] }): Promise<string[]> => {
    if (!request.gear_ids || !Array.isArray(request.gear_ids) || request.gear_ids.length === 0) {
      return [];
    }

    try {
      const { data: gearsData, error } = await supabase
        .from('gears')
        .select('id, name')
        .in('id', request.gear_ids);

      if (error) {
        console.error('Error fetching gear names:', error);
        return [];
      }

      return (gearsData || []).map(gear => gear.name).filter(Boolean);
    } catch (error) {
      console.error('Error fetching gear names:', error);
      return [];
    }
  }, [supabase]);

  // Update fetchRequests to use pagination and filters with better error handling
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setIsRefreshing(true);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      // Add timestamp to prevent caching
      params.set('_t', String(Date.now()));

      const response = await apiGet<{ data: Record<string, unknown>[]; total: number; error: string | null }>(`/api/requests?${params.toString()}&_t=${Date.now()}`);

      const { data: requestsData, total: totalCount, error: requestsError } = response;
      if (requestsError) {
        console.error('Error fetching gear requests:', requestsError);
        setFetchError('Failed to load gear requests. Please try refreshing.');
        setRequests([]);
        setTotal(0);
        return;
      }

      setTotal(totalCount || 0);

      // Process requests with better error handling
      const processedRequests = await Promise.all((requestsData || []).map(async (request: Record<string, unknown>) => {
        try {
          let gearNames = extractGearNames(request);

          // If no gear names found from junction table, try to fetch them from gear_ids
          if (gearNames.length === 0 || (gearNames.length > 0 && gearNames[0].startsWith('Gear '))) {
            const fetchedNames = await fetchMissingGearNames(request);
            if (fetchedNames.length > 0) {
              gearNames = fetchedNames;
            }
          }

          // Extract first name from full_name with fallback
          let firstName = 'Unknown User';
          if (typeof request.profiles === 'object' && request.profiles && 'full_name' in request.profiles && typeof request.profiles.full_name === 'string') {
            firstName = request.profiles.full_name.split(' ')[0] || request.profiles.full_name;
          }

          return {
            id: request.id as string,
            userName: firstName,
            userEmail: request.profiles && typeof request.profiles === 'object' && 'email' in request.profiles ? request.profiles.email as string : undefined,
            avatarUrl: request.profiles && typeof request.profiles === 'object' && 'avatar_url' in request.profiles ? request.profiles.avatar_url as string : undefined,
            userId: request.user_id as string,
            gearNames: gearNames,
            requestDate: new Date(request.created_at as string),
            duration: (request.expected_duration as string) || 'Not specified',
            reason: (request.reason as string) || 'Not specified',
            destination: (request.destination as string) || 'Not specified',
            status: (request.status as string) || 'Pending',
            adminNotes: (request.admin_notes as string) || null,
            checkoutDate: request.checkout_date ? new Date(request.checkout_date as string) : null,
            dueDate: request.due_date ? new Date(request.due_date as string) : null,
            checkinDate: request.checkin_date ? new Date(request.checkin_date as string) : null,
            teamMembers: request.team_members || null,
            gear_request_gears: request.gear_request_gears
          };
        } catch (error) {
          console.error('Error processing request:', error, request);
          return null;
        }
      }));

      const validRequests = processedRequests.filter(Boolean) as GearRequest[];

      setRequests(validRequests);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching gear requests:', error);
      setFetchError('Failed to load gear requests. Please check your connection and try again.');
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, filterStatus, extractGearNames, fetchMissingGearNames]);

  // Refetch when page, pageSize, or filterStatus changes
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Force refresh function with visual feedback
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refreshing requests...');
    setPage(1); // Reset to first page
    fetchRequests();
  }, [fetchRequests]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [filterStatus, userFilter, gearFilter, debouncedKeyword, dateRange]);

  // Fetch status history when a request is selected
  useEffect(() => {
    if (selectedRequest?.id) {
      supabase
        .from('request_status_history')
        .select(`
          status, 
          changed_at, 
          note, 
          changed_by,
          profiles!changed_by(full_name)
        `)
        .eq('request_id', selectedRequest.id)
        .order('changed_at', { ascending: true })
        .then((res) => {
          if (Array.isArray(res.data)) {
            setStatusHistory(res.data.map((item) => ({
              status: item.status,
              changed_at: item.changed_at,
              note: item.note,
              profiles: (() => {
                if (!item.profiles) return undefined;
                if (Array.isArray(item.profiles) && item.profiles[0]?.full_name) {
                  return { full_name: item.profiles[0].full_name };
                }
                if (typeof item.profiles === 'object' && 'full_name' in item.profiles) {
                  return { full_name: (item.profiles as { full_name?: string }).full_name || '' };
                }
                return undefined;
              })(),
            })));
          } else {
            setStatusHistory([]);
          }
        })
        ;
    } else {
      setStatusHistory([]);
    }
  }, [selectedRequest?.id, supabase]);

  // Handle approve request with better error handling
  const handleApprove = async (requestId: string) => {
    setIsProcessing(true);
    try {
      // Update the request status - the database trigger will handle gear updates
      const { error } = await supabase
        .from('gear_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Add to status history
      await supabase
        .from('request_status_history')
        .insert({
          request_id: requestId,
          status: 'approved',
          changed_at: new Date().toISOString(),
          note: 'Request approved by admin'
        });

      toast({
        title: "Request Approved",
        description: "The gear request has been approved successfully.",
        variant: "default",
      });

      // Play success sound if enabled
      if (soundEnabled && audioRef.current) {
        const p: unknown = audioRef.current.play();
        if (p && typeof (p as Promise<void>).then === 'function') {
          (p as Promise<void>).catch(() => { });
        }
      }

      // Show success feedback
      showSuccessFeedback({
        toast: {
          title: "Request Approved",
          description: "The gear request has been approved successfully.",
          variant: "default",
        }
      });

      // Refresh the requests list
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject request with better validation
  const handleReject = async () => {
    if (!requestToReject || !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('gear_requests')
        .update({
          status: 'rejected',
          admin_notes: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestToReject);

      if (error) throw error;

      // Add to status history
      await supabase
        .from('request_status_history')
        .insert({
          request_id: requestToReject,
          status: 'rejected',
          changed_at: new Date().toISOString(),
          note: rejectionReason
        });

      toast({
        title: "Request Rejected",
        description: "The gear request has been rejected.",
        variant: "default",
      });

      // Play success sound if enabled
      if (soundEnabled && audioRef.current) {
        const p: unknown = audioRef.current.play();
        if (p && typeof (p as Promise<void>).then === 'function') {
          (p as Promise<void>).catch(() => { });
        }
      }

      // Show success feedback
      showSuccessFeedback({
        toast: {
          title: "Request Rejected",
          description: "The gear request has been rejected.",
          variant: "default",
        }
      });

      // Reset state
      setRequestToReject(null);
      setRejectionReason('');

      // Refresh the requests list
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced status badge with tooltips
  const getStatusBadge = useCallback((status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: "⏳" },
      approved: { color: "bg-green-500", icon: "✅" },
      rejected: { color: "bg-red-500", icon: "❌" },
      "checked out": { color: "bg-blue-500", icon: "📤" },
      "checked in": { color: "bg-purple-500", icon: "📥" },
      completed: { color: "bg-gray-500", icon: "✅" },
      cancelled: { color: "bg-gray-500", icon: "🚫" },
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || { color: "bg-gray-500", icon: "❓" };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge className={cn("capitalize flex items-center gap-1", config.color)}>
              <span>{config.icon}</span>
              {status}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Status: {status}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, []);

  // Enhanced RequestDetailsDialog with better layout
  const RequestDetailsDialog = ({ request, open, onOpenChange }: { request: GearRequest | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    if (!request) return null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Request Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the gear request
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requested By</span>
                    <span className="font-medium">{request.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requested On</span>
                    <span className="font-medium">{format(request.requestDate, 'PPP p')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-medium">{request.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Status</span>
                    <div>{getStatusBadge(request.status)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gear Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {request.gearNames.length > 0 ? (
                    request.gearNames.map((gear: string, index: number) => (
                      <div key={index} className="p-3 rounded-md border bg-muted/50">
                        <p className="font-medium text-sm">{gear}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-md border bg-muted/50">
                      <p className="text-sm text-muted-foreground">No gear details available</p>
                    </div>
                  )}
                  {request.reason && (
                    <div>
                      <span className="text-sm text-muted-foreground">Reason:</span>
                      <p className="text-sm mt-1">{request.reason}</p>
                    </div>
                  )}
                  {request.destination && (
                    <div>
                      <span className="text-sm text-muted-foreground">Destination:</span>
                      <p className="text-sm mt-1">{request.destination}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline>
                    {/* Add initial request status */}
                    <TimelineItem
                      status="Requested"
                      date={request.requestDate}
                      changedBy={request.userName}
                    />

                    {/* Add status history items */}
                    {statusHistory.map((history: StatusHistoryItem, index: number) => (
                      <TimelineItem
                        key={index}
                        status={history.status}
                        date={new Date(history.changed_at)}
                        note={history.note}
                        changedBy={history.profiles?.full_name}
                      />
                    ))}
                  </Timeline>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            {!isAttendedRequest(request.status) && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleApprove(request.id);
                    onOpenChange(false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Request
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRequestToReject(request.id);
                    onOpenChange(false);
                  }}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Request
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Computed values with memoization for performance
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Apply user filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(req => req.userName.toLowerCase().includes(userFilter.toLowerCase()));
    }

    // Apply gear filter
    if (gearFilter !== 'all') {
      filtered = filtered.filter(req =>
        req.gearNames.some(gear => gear.toLowerCase().includes(gearFilter.toLowerCase()))
      );
    }

    // Apply keyword search (using debounced value)
    if (debouncedKeyword) {
      const searchTerm = debouncedKeyword.toLowerCase();
      filtered = filtered.filter(req =>
        req.userName.toLowerCase().includes(searchTerm) ||
        req.reason?.toLowerCase().includes(searchTerm) ||
        req.destination?.toLowerCase().includes(searchTerm) ||
        req.gearNames.some(gear => gear.toLowerCase().includes(searchTerm))
      );
    }

    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(req => req.requestDate >= dateRange.from!);
    }
    if (dateRange?.to) {
      filtered = filtered.filter(req => req.requestDate <= dateRange.to!);
    }

    return filtered;
  }, [requests, filterStatus, userFilter, gearFilter, debouncedKeyword, dateRange]);

  const uniqueUserNames = useMemo(() => {
    const names = [...new Set(requests.map(req => req.userName))];
    return names.sort();
  }, [requests]);

  const uniqueGearNames = useMemo(() => {
    const allGearNames = requests.flatMap(req => req.gearNames);
    const names = [...new Set(allGearNames)];
    return names.sort();
  }, [requests]);

  const hasActiveFilters = filterStatus !== 'all' || (userFilter && userFilter !== 'all') || (gearFilter && gearFilter !== 'all') || !!keyword || !!dateRange;

  const filterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    if (filterStatus !== 'all') {
      chips.push({
        label: `Status: ${filterStatus}`,
        onRemove: () => setFilterStatus('all')
      });
    }

    if (userFilter !== 'all') {
      chips.push({
        label: `User: ${userFilter}`,
        onRemove: () => setUserFilter('all')
      });
    }

    if (gearFilter !== 'all') {
      chips.push({
        label: `Gear: ${gearFilter}`,
        onRemove: () => setGearFilter('all')
      });
    }

    if (keyword) {
      chips.push({
        label: `Search: ${keyword}`,
        onRemove: () => setKeyword('')
      });
    }

    if (dateRange?.from) {
      chips.push({
        label: `Date: ${format(dateRange.from, 'MMM dd')}${dateRange.to ? ` - ${format(dateRange.to, 'MMM dd')}` : ''}`,
        onRemove: () => setDateRange(undefined)
      });
    }

    return chips;
  }, [filterStatus, userFilter, gearFilter, keyword, dateRange]);

  // Export functions with better error handling
  const downloadRequestsCSV = () => {
    try {
      const headers = ['User', 'Gear', 'Request Date', 'Status', 'Reason', 'Destination'];
      const csvContent = [
        headers.join(','),
        ...filteredRequests.map(req => [
          req.userName,
          req.gearNames.join('; '),
          format(req.requestDate, 'yyyy-MM-dd HH:mm'),
          req.status,
          req.reason || '',
          req.destination || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gear-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "CSV file has been downloaded.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadRequestsPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text('Gear Requests Report', 14, 22);

      // Add date
      doc.setFontSize(12);
      doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 32);

      // Prepare table data
      const tableData = filteredRequests.map(req => [
        req.userName,
        req.gearNames.join(', '),
        format(req.requestDate, 'MMM dd, yyyy'),
        req.status,
        req.reason || '',
        req.destination || ''
      ]);

      // Add table
      autoTable(doc, {
        head: [['User', 'Gear', 'Request Date', 'Status', 'Reason', 'Destination']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [66, 139, 202]
        }
      });

      doc.save(`gear-requests-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({
        title: "Export Successful",
        description: "PDF file has been downloaded.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle batch approve with better validation
  const handleBatchApprove = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No Requests Selected",
        description: "Please select at least one request to approve.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Update the requests status - the database trigger will handle gear updates
      const { error } = await supabase
        .from('gear_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', selectedRequests);

      if (error) throw error;

      toast({
        title: "Batch Approval Successful",
        description: `${selectedRequests.length} request(s) have been approved.`,
        variant: "default",
      });

      setSelectedRequests([]);
      fetchRequests();
    } catch (error) {
      console.error('Error batch approving requests:', error);
      toast({
        title: "Error",
        description: "Failed to approve requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch reject
  const handleBatchReject = () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No Requests Selected",
        description: "Please select at least one request to reject.",
        variant: "destructive",
      });
      return;
    }

    setRequestToReject(selectedRequests[0]); // For now, just reject the first one
    setRejectionReason('Batch rejection');
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    setFilterStatus('all');
    setUserFilter('all');
    setGearFilter('all');
    setKeyword('');
    setDateRange(undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 p-2 sm:p-6"
    >
      {/* Header with status and actions */}
      <PageHeader
        title="Manage Gear Requests"
        lastUpdated={lastRefreshTime ? format(lastRefreshTime, 'MMM dd, yyyy HH:mm:ss') : undefined}
        actions={(
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={forceRefresh}
                    className="flex items-center gap-2"
                    disabled={isRefreshing}
                    aria-label="Refresh requests"
                  >
                    <RefreshCw className={cn("icon-16", isRefreshing && "animate-spin")} />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh the data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="flex items-center gap-2"
                    aria-label={soundEnabled ? 'Disable notification sounds' : 'Enable notification sounds'}
                  >
                    {soundEnabled ? (
                      <>
                        <BellRing className="icon-16 text-primary" />
                        Sound On
                      </>
                    ) : (
                      <>
                        <Bell className="icon-16" />
                        Sound Off
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{soundEnabled ? "Disable" : "Enable"} notification sounds</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      />

      {/* Table Toolbar - export actions */}
      <TableToolbar onExportCSV={downloadRequestsCSV} onExportPDF={downloadRequestsPDF} />

      {/* Filters */}
      <FiltersBar>
        <RequestFilters
          userFilter={userFilter}
          setUserFilter={setUserFilter}
          gearFilter={gearFilter}
          setGearFilter={setGearFilter}
          keyword={keyword}
          setKeyword={setKeyword}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          dateRange={dateRange}
          setDateRange={setDateRange}
          uniqueUserNames={uniqueUserNames}
          uniqueGearNames={uniqueGearNames}
          hasActiveFilters={hasActiveFilters}
          filterChips={filterChips as { label: string; onRemove: () => void }[]}
          handleClearAllFilters={handleClearAllFilters}
        />
      </FiltersBar>

      {/* Table or Empty State */}
      {loading ? (
        <LoadingState />
      ) : fetchError ? (
        <ErrorState message={fetchError} onRetry={forceRefresh} />
      ) : filteredRequests.length === 0 ? (
        <RequestEmptyState onRefresh={fetchRequests} onClearFilters={handleClearAllFilters} hasActiveFilters={hasActiveFilters} />
      ) : (
        <RequestTable
          requests={filteredRequests}
          loading={loading}
          selectedRequests={selectedRequests}
          setSelectedRequests={setSelectedRequests}
          onApprove={handleApprove}
          onReject={(id) => { setRequestToReject(id); setRejectionReason(''); }}
          onView={(req: TableGearRequest) => { setSelectedRequest(req as GearRequest); setIsDetailsOpen(true); }}
          isProcessing={isProcessing}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* Enhanced Pagination Controls */}
      {!loading && total > 0 && (
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous Page"
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                disabled={page >= Math.ceil(total / pageSize)}
                aria-label="Next Page"
              >
                Next
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Batch Actions */}
      {selectedRequests.length > 0 && (
        <div className="fixed bottom-4 right-4 flex gap-2 z-50">
          <Button
            onClick={handleBatchApprove}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Approve Selected ({selectedRequests.length})
          </Button>
          <Button
            variant="destructive"
            onClick={handleBatchReject}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject Selected ({selectedRequests.length})
          </Button>
        </div>
      )}

      {/* Enhanced Reject Dialog */}
      <AlertDialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request. This will be recorded in the request history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "gap-2"
              )}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Reject Request
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request Details Dialog */}
      <RequestDetailsDialog
        request={selectedRequest}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Requests</CardTitle>
          <CardDescription>Loading gear requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Skeleton className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManageRequestsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ManageRequestsContent />
    </Suspense>
  );
}

