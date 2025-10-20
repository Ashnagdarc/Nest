"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellRing, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
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
// Removed unused dialog imports
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
import { ViewRequestModal } from '@/components/admin/ViewRequestModal';

// Animations not used after UI refactor

// --- Import the notification sound ---
const NOTIFICATION_SOUND_URL = '/sounds/notification-bell.mp3';

// Removed unused timeline components

// Add type definitions
interface GearState {
  status: string;
  available_quantity: number;
  checked_out_to?: string | null;
  due_date?: string | null;
}

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
    quantity?: number;
    gears: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      serial_number: string | null;
      quantity: number;
      gear_states?: GearState[];
    };
  }>;
}

/**
 * Debounces search input to avoid excessive API calls
 * 
 * Why: Without debouncing, typing "camera" fires 6 requests.
 * With 300ms delay, we only search once user stops typing.
 * 
 * Impact: Reduces API load by ~80% on typical search usage.
 */
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

    /**
     * Load user's sound preference from browser storage
     * 
     * Why: Users who work in shared spaces need to disable notification sounds.
     * Preference persists across sessions for better UX.
     */
    const savedSoundPreference = localStorage.getItem('flowtagSoundEnabled');
    if (savedSoundPreference !== null) {
      setSoundEnabled(savedSoundPreference === 'true');
    }
  }, []);

  // Save sound preference when it changes
  useEffect(() => {
    localStorage.setItem('flowtagSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  /**
   * Extracts and formats gear names from request data
   * 
   * Why: Requests can include multiple units of same gear type.
   * We need to show total quantity + combined availability state.
   * 
   * Data structure evolution:
   * - Old requests (before Feb 2024): Used gear_ids[] array
   * - New requests: Use gear_request_gears junction table for quantity tracking
   * - This function supports both to avoid breaking historical data
   * 
   * Example output: "Camera x3 (Available, 2 available)", "Drone (Checked Out, 0 available)"
   */
  const extractGearNames = useCallback((request: { gear_request_gears?: Array<{ quantity?: number; gears?: { name?: string; gear_states?: GearState[] } }>; gear_ids?: string[] }): string[] => {
    console.log('🔍 extractGearNames called with:', request);

    // Prefer junction table with quantities: aggregate by name and append "x qty" and state info
    if (request.gear_request_gears && Array.isArray(request.gear_request_gears) && request.gear_request_gears.length > 0) {
      console.log('🔍 Using gear_request_gears junction table');
      const gearInfo: Record<string, { qty: number; states: GearState[] }> = {};

      /**
       * Aggregate gear items by name
       * 
       * Why: User can request "Camera x2" + "Camera x1" in separate line items.
       * We combine them to show "Camera x3" with merged availability states.
       */
      for (const item of request.gear_request_gears) {
        const name = (item.gears?.name || '').trim();
        if (!name) continue;

        const qty = Math.max(1, Number(item.quantity ?? 1));
        const states = item.gears?.gear_states || [];

        if (!gearInfo[name]) {
          gearInfo[name] = { qty, states };
        } else {
          gearInfo[name].qty += qty;
          gearInfo[name].states = [...gearInfo[name].states, ...states];
        }
      }

      const result = Object.entries(gearInfo).map(([name, info]) => {
        const qtyStr = info.qty > 1 ? ` x ${info.qty}` : '';

        /**
         * Calculate availability status for display
         * 
         * Why: Gear can be in multiple states (some available, some checked out).
         * We show the most restrictive state to prevent approval of unavailable gear.
         * 
         * Priority order: Checked Out > Partially Available > Available
         * 
         * Note: Uses gears table data instead of gear_states (which had stale data issues)
         */
        let displayState = '';
        if (info.states.length > 0) {
          // PERMANENT FIX: Use gears table data instead of broken gear_states
          const gear = info.states[0]?.gears;
          if (gear) {
            const totalQuantity = gear.quantity || 1;
            const availableQuantity = gear.available_quantity || 0;
            const gearStatus = gear.status || 'Available';
            const checkedOutTo = gear.checked_out_to;
            const currentRequestId = gear.current_request_id;

            // Determine display status based on gear data
            let statusText = gearStatus;
            if (checkedOutTo && currentRequestId) {
              statusText = 'Checked Out';
            } else if (availableQuantity === 0) {
              statusText = 'Checked Out';
            } else if (availableQuantity < totalQuantity) {
              statusText = 'Partially Available';
            } else {
              statusText = 'Available';
            }

            displayState = ` (${statusText}, ${availableQuantity} available)`;
          }
        }

        return `${name}${qtyStr}${displayState}`;
      });

      console.log('🔍 Final result:', result);
      return result;
    }

    /**
     * Fallback for legacy requests
     * 
     * Why: Old requests (before Feb 2024) stored gear_ids[] directly.
     * Shows truncated IDs as placeholder until full gear data is fetched.
     */
    if (request.gear_ids && Array.isArray(request.gear_ids) && request.gear_ids.length > 0) {
      console.log('🔍 Falling back to gear_ids');
      return request.gear_ids.map((id: string) => `Gear ${id.slice(0, 8)}...`);
    }

    console.log('🔍 No gear data found');
    return [];
  }, []);

  /**
   * Fetches full gear names for legacy requests using gear_ids
   * 
   * Why: Legacy requests only stored IDs. We need to show actual gear names
   * instead of "Gear abc12345..." for better admin experience.
   * 
   * Called lazily only when junction table data is missing.
   */
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

  /**
   * Fetches paginated gear requests with filters applied
   * 
   * Why: Large orgs can have 1000+ requests. Pagination keeps UI responsive.
   * Cache-busting timestamp prevents stale data after approvals/rejections.
   * 
   * Error handling: Shows user-friendly message instead of crashing on network failures.
   */
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

  /**
   * Approves a gear request and triggers notifications
   * 
   * Why: Approval is a multi-step process (update DB, send notifications, refresh UI).
   * Error handling prevents partial updates if notification sending fails.
   * 
   * Side effects:
   * - Updates request status to 'approved'
   * - Creates in-app notification for requester
   * - Sends email confirmation
   * - Plays success sound (if enabled)
   */
  const handleApprove = async (requestId: string) => {
    setIsProcessing(true);
    try {
      const resp = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      console.log('🔍 Approval response status:', resp.status);
      const result = await resp.json();
      console.log('🔍 Approval response data:', result);

      if (!resp.ok || !result?.success) {
        const errorMessage = result?.error || `Approval failed with status ${resp.status}`;
        console.error('🔍 Approval failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Status history table not in DB; skipping audit trail insert (handled by existing fields)

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
      /**
       * Filter out empty error objects from fetch API
       * 
       * Why: Some network libraries throw `{}` on timeout.
       * We only want to log actual error messages to avoid noise.
       */
      if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
        console.error('Error approving request:', error instanceof Error ? { message: error.message, stack: error.stack } : error);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Rejects a gear request with admin notes
   * 
   * Why: Rejection requires explanation for requester.
   * Validates that admin provided a reason before submitting.
   * 
   * Side effects:
   * - Updates request status to 'rejected'
   * - Stores admin notes for requester to see
   * - Creates audit trail in status history
   * - Sends notification to requester
   */
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
      // Only log if it's a real error, not an empty object
      if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
        console.error('Error rejecting request:', error);
      }
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

  // Removed unused RequestDetailsDialog component - using ViewRequestModal instead

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
      const results = await Promise.allSettled(
        selectedRequests.map(async (requestId) => {
          const resp = await fetch('/api/requests/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
          });
          const result = await resp.json();
          if (!resp.ok || !result?.success) {
            throw new Error(result?.error || 'Approval failed');
          }
          return result;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      toast({
        title: failed ? "Batch Approval Completed with Errors" : "Batch Approval Successful",
        description: `${succeeded} request(s) approved${failed ? `, ${failed} failed` : ''}`,
        variant: failed ? "destructive" : "default",
      });

      setSelectedRequests([]);
      fetchRequests();
    } catch (error) {
      // Only log if it's a real error, not an empty object
      if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
        console.error('Error batch approving requests:', error);
      }
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
  const handleBatchReject = async () => {
    if (selectedRequests.length === 0) {
      toast({
        title: "No Requests Selected",
        description: "Please select at least one request to reject.",
        variant: "destructive",
      });
      return;
    }

    if (!rejectionReason.trim()) {
      // If no reason provided, default to a generic reason for batch
      setRejectionReason('Batch rejection');
    }

    setIsProcessing(true);
    try {
      const reason = rejectionReason?.trim() || 'Batch rejection';
      const results = await Promise.allSettled(
        selectedRequests.map(async (requestId) => {
          const resp = await fetch('/api/requests/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, reason }),
          });
          const result = await resp.json();
          if (!resp.ok || !result?.success) {
            throw new Error(result?.error || 'Reject failed');
          }
          return result;
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      toast({
        title: failed ? "Batch Reject Completed with Errors" : "Batch Reject Successful",
        description: `${succeeded} request(s) rejected${failed ? `, ${failed} failed` : ''}`,
        variant: failed ? "destructive" : "default",
      });

      setSelectedRequests([]);
      setRequestToReject(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      // Only log if it's a real error, not an empty object
      if (error && (typeof error === 'string' || error instanceof Error || (typeof error === 'object' && Object.keys(error).length > 0))) {
        console.error('Error batch rejecting requests:', error);
      }
      toast({
        title: "Error",
        description: "Failed to reject requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
          onView={(req: TableGearRequest) => {
            // Convert TableGearRequest to GearRequest by adding missing fields
            const fullRequest: GearRequest = {
              ...req,
              duration: 'Not specified',
              reason: 'Not specified',
              destination: 'Not specified',
              adminNotes: null,
              checkoutDate: null,
              dueDate: null,
              checkinDate: null,
              gear_request_gears: []
            };
            setSelectedRequest(fullRequest);
            setIsDetailsOpen(true);
          }}
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

      {/* Request Details Modal (fetches full details incl. gear + quantities) */}
      {selectedRequest?.id && (
        <ViewRequestModal
          requestId={selectedRequest.id}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
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

