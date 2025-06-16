"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Filter, ThumbsUp, ThumbsDown, Download, Package, RotateCcw, AlertCircle, CheckCircle, XCircle, Bell, BellRing, Loader2 } from 'lucide-react';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createSystemNotification } from '@/lib/notifications';
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { notifyGoogleChat, NotificationEventType } from '@/utils/googleChat';

// --- Dynamically import Lottie ---
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// --- Import actual Lottie animation JSON ---
import successAnimation from "@/../public/animations/success.json";
import rejectAnimation from "@/../public/animations/reject.json";

// --- Import the notification sound ---
const NOTIFICATION_SOUND_URL = '/sounds/notification-bell.mp3'; // Add this sound file to your public folder

type StatusHistory = { status: string; timestamp: Date; note?: string }[];
type GearDetail = { name: string; description: string; specs: string };

// Add these types at the top of the file
type GearCheckout = {
  gear_id: string;
  user_id: string;
  request_id: string;
  checkout_date: string;
  due_date: string;
  status: string;
};

type GearInfo = {
  id: string;
  name: string;
};

// Add these types at the top of the file
type GearStatus = {
  id: string;
  status: string;
  checked_out_to: string | null;
};

// Add these types at the top of the file
type UpdatedGear = {
  id: string;
  status: string;
  checked_out_to: string | null;
};

// Mock Data - Replace with actual data fetching
// Added more diverse statuses and dates
const mockRequests = [
  { id: 'req1', userName: 'Alice Smith', gearNames: ['Canon EOS R5', 'Tripod X'], requestDate: new Date(2024, 6, 20, 10, 30), duration: '3 days', reason: 'Client Photoshoot', destination: 'Studio A', status: 'Pending', adminNotes: null, checkoutDate: null, dueDate: null, checkinDate: null },
  { id: 'req2', userName: 'Bob Johnson', gearNames: ['DJI Mavic 3'], requestDate: new Date(2024, 6, 19, 14, 0), duration: '1 day', reason: 'Property Survey', destination: 'Site B', status: 'Approved', adminNotes: 'Approved, pickup ready.', checkoutDate: new Date(2024, 6, 20), dueDate: new Date(2024, 6, 21), checkinDate: null },
  { id: 'req3', userName: 'Charlie Brown', gearNames: ['Sony A7 IV', 'Rode Mic'], requestDate: new Date(2024, 6, 18, 9, 0), duration: '5 days', reason: 'Video Interview', destination: 'Office Conf Room', status: 'Checked In', adminNotes: 'Returned.', checkoutDate: new Date(2024, 6, 18), dueDate: new Date(2024, 6, 23), checkinDate: new Date(2024, 6, 23) },
  { id: 'req4', userName: 'David Lee', gearNames: ['Lens Kit'], requestDate: new Date(2024, 6, 21, 11, 0), duration: '2 hours', reason: 'Testing', destination: 'Tech Lab', status: 'Rejected', adminNotes: 'Duplicate request.', checkoutDate: null, dueDate: null, checkinDate: null },
  { id: 'req5', userName: 'Alice Smith', gearNames: ['Aputure Light Dome'], requestDate: new Date(2024, 5, 15, 10, 0), duration: '1 week', reason: 'Internal Project', destination: 'Studio C', status: 'Checked In', adminNotes: 'Returned with minor wear.', checkoutDate: new Date(2024, 5, 16), dueDate: new Date(2024, 5, 23), checkinDate: new Date(2024, 5, 22) },
  { id: 'req6', userName: 'Eve Davis', gearNames: ['Manfrotto Tripod'], requestDate: new Date(2024, 6, 22, 15, 0), duration: '2 days', reason: 'Outdoor Shoot', destination: 'Park Area', status: 'Pending', adminNotes: null, checkoutDate: null, dueDate: null, checkinDate: null },
  { id: 'req7', userName: 'Bob Johnson', gearNames: ['Canon R5'], requestDate: new Date(2024, 4, 10), duration: '3 days', reason: 'Archived Project', destination: 'Site X', status: 'Checked In', adminNotes: 'Archived', checkoutDate: new Date(2024, 4, 11), dueDate: new Date(2024, 4, 14), checkinDate: new Date(2024, 4, 14) }, // Older request
];

// Mock gear details
const gearDetails: Record<string, GearDetail> = {
  'Canon EOS R5': { name: 'Canon EOS R5', description: 'High-res mirrorless camera', specs: '45MP, 8K video' },
  'Tripod X': { name: 'Tripod X', description: 'Sturdy tripod', specs: 'Max height: 180cm' },
  'DJI Mavic 3': { name: 'DJI Mavic 3', description: 'Professional drone', specs: '4/3 CMOS, 46min flight' },
  'Sony A7 IV': { name: 'Sony A7 IV', description: 'Full-frame mirrorless', specs: '33MP, 4K60p' },
  'Rode Mic': { name: 'Rode Mic', description: 'Shotgun microphone', specs: 'Supercardioid' },
  'Lens Kit': { name: 'Lens Kit', description: 'Assorted lenses', specs: '24-70mm, 70-200mm' },
  'Aputure Light Dome': { name: 'Aputure Light Dome', description: 'Softbox for lighting', specs: '34.8" diameter' },
  'Manfrotto Tripod': { name: 'Manfrotto Tripod', description: 'Lightweight tripod', specs: 'Max height: 160cm' },
  'Canon R5': { name: 'Canon R5', description: 'Mirrorless camera', specs: '45MP, 8K video' },
  'LED Panel': { name: 'LED Panel', description: 'Bi-color LED light', specs: '3200-5600K' },
};

// Update the isNewRequest function to check for pending status
const isNewRequest = (status: string) => {
  return status.toLowerCase() === 'pending';
};

// Add a function to determine if a request has been attended to
const isAttendedRequest = (status: string) => {
  const attendedStatuses = ['approved', 'rejected', 'checked out', 'checked in', 'completed', 'cancelled'];
  return attendedStatuses.includes(status.toLowerCase());
};

// Add priority calculation function
const getRequestPriority = (requestDate: Date): { level: 'low' | 'medium' | 'high', label: string } => {
  const now = new Date();
  const hoursSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60));

  if (hoursSinceRequest >= 24) {
    return { level: 'high', label: 'High Priority' };
  } else if (hoursSinceRequest >= 12) {
    return { level: 'medium', label: 'Medium Priority' };
  }
  return { level: 'low', label: 'Low Priority' };
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
        <time className="text-xs text-muted-foreground">
          {format(date, 'MMM d, yyyy h:mm a')}
        </time>
      </div>
      {note && (
        <p className="text-sm text-muted-foreground">{note}</p>
      )}
      {changedBy && (
        <p className="text-xs text-muted-foreground">by {changedBy}</p>
      )}
    </div>
  </div>
);

// Add type definitions
interface GearRequest {
  id: string;
  userName: string;
  userEmail?: string;
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
}

interface StatusHistoryItem {
  status: string;
  changed_at: string;
  note?: string;
  profiles?: {
    full_name: string;
  };
}

function ManageRequestsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const [requests, setRequests] = useState<GearRequest[]>([]); // Now fetched from DB
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState(statusParam || 'all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [gearFilter, setGearFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const { toast } = useToast(); // Initialize toast
  const [requestToReject, setRequestToReject] = useState<string | null>(null); // For rejection confirmation
  const [showAnimation, setShowAnimation] = useState<{ type: 'approve' | 'reject'; id: string | null }>({ type: 'approve', id: null }); // State for animations
  const [selectedRequest, setSelectedRequest] = useState<GearRequest | null>(null); // For details modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // For details modal
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]); // For audit trail
  const [previousRequestCount, setPreviousRequestCount] = useState<number>(0);
  const [newRequestNotification, setNewRequestNotification] = useState<GearRequest | null>(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true); // Default sound on
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

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

  // Add this before the useEffect hooks
  const fetchRequests = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      // Fetch gear requests from the gear_requests table
      const { data: requestsData, error: requestsError } = await supabase
        .from('gear_requests')
        .select('*, profiles:user_id(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('Error fetching gear requests:', requestsError);
        setFetchError('Failed to load gear requests.');
        setRequests([]);
        return;
      }

      // Process and map the data to the format expected by the UI
      const processedRequests = await Promise.all(requestsData.map(async (request: any) => {
        // Fetch gear details for gear_ids array
        let gearNames: string[] = [];
        if (request.gear_ids && request.gear_ids.length > 0) {
          const { data: gearData } = await supabase
            .from('gears')
            .select('id, name')
            .in('id', request.gear_ids);

          gearNames = gearData ? gearData.map((gear: any) => gear.name) : [];
        }

        return {
          id: request.id,
          userName: request.profiles?.full_name || 'Unknown User',
          userEmail: request.profiles?.email,
          userId: request.user_id,
          gearNames: gearNames,
          requestDate: new Date(request.created_at),
          duration: request.expected_duration || 'Not specified',
          reason: request.reason || 'Not specified',
          destination: request.destination || 'Not specified',
          status: request.status || 'Pending',
          adminNotes: request.admin_notes || null,
          checkoutDate: request.checkout_date ? new Date(request.checkout_date) : null,
          dueDate: request.due_date ? new Date(request.due_date) : null,
          checkinDate: request.checkin_date ? new Date(request.checkin_date) : null,
          teamMembers: request.team_members || null
        };
      }));

      // Check for new requests
      if (previousRequestCount > 0 && processedRequests.length > previousRequestCount) {
        // Find the newest request (should be at index 0 if sorted by created_at desc)
        const newestRequest = processedRequests[0];

        // Only show notification for Pending requests
        if (newestRequest && newestRequest.status === 'Pending') {
          setNewRequestNotification(newestRequest);
          setShowNotificationPopup(true);

          // Play sound if enabled
          if (soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.error('Error playing notification sound:', e));
          }

          // Create notifications for all admin users
          const { data: adminUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'Admin');

          if (adminUsers && adminUsers.length > 0) {
            // Create notification for each admin
            for (const admin of adminUsers) {
              await createSystemNotification(
                admin.id,
                'New Gear Request',
                `${newestRequest.userName} has requested ${newestRequest.gearNames.join(', ')}`
              );
            }
          }
        }
      }

      // Update request count for next comparison
      setPreviousRequestCount(processedRequests.length);

      console.log('Processed requests:', processedRequests);
      setRequests(processedRequests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      setFetchError(error.message);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to use the fetchRequests function
  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('public:gear_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gear_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch status history when a request is selected
  useEffect(() => {
    if (selectedRequest?.id) {
      supabase
        .from('request_status_history')
        .select('status, changed_at, note, profiles:changed_by(full_name)')
        .eq('request_id', selectedRequest.id)
        .order('changed_at', { ascending: true })
        .then(({ data }: { data: any[] | null }) => {
          if (data) {
            setStatusHistory(data);
          } else {
            setStatusHistory([]);
          }
        });
    } else {
      setStatusHistory([]);
    }
  }, [selectedRequest, supabase]);

  // Fetch current user's role for role-based access
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: any } }) => {
      if (user?.id) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setCurrentUserRole(data?.role || '');
      }
    });
  }, [supabase]);

  // Get unique gear and user names for filters
  const uniqueGearNames = Array.from(new Set(requests.flatMap(r => r.gearNames))).sort();
  const uniqueUserNames = Array.from(new Set(requests.map(r => r.userName))).sort();

  // Advanced filter logic
  const filteredRequests = requests.filter(req => {
    const userMatch = !userFilter || req.userName === userFilter;
    const gearMatch = !gearFilter || req.gearNames.includes(gearFilter);
    const statusMatch = filterStatus === 'all' || req.status.toLowerCase() === filterStatus.toLowerCase();
    const keywordMatch = !keyword || [req.reason, req.destination].join(' ').toLowerCase().includes(keyword.toLowerCase());
    let dateMatch = true;
    if (dateRange?.from && dateRange?.to && req.requestDate instanceof Date) {
      dateMatch = req.requestDate >= dateRange.from && req.requestDate <= dateRange.to;
    }
    return userMatch && gearMatch && statusMatch && keywordMatch && dateMatch;
  });

  // Approve handler: update DB and state, and insert status history and notification
  const handleApprove = async (requestId: string) => {
    try {
      setIsProcessing(true);

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('gear_requests')
        .select('*, profiles:user_id(id, full_name, email)')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      const { user_id, gear_ids } = request;
      const now = new Date();
      const formattedCheckoutDate = now.toISOString();

      // Calculate due date based on expected_duration
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + parseInt(request.expected_duration || '7'));
      const formattedDueDate = dueDate.toISOString();

      // Update gear status to Checked Out
      const { error: gearStatusError } = await supabase
        .from('gears')
        .update({
          status: 'Checked Out',
          checked_out_to: user_id,
          current_request_id: requestId,
          last_checkout_date: formattedCheckoutDate,
          due_date: formattedDueDate
        })
        .in('id', gear_ids);

      if (gearStatusError) throw gearStatusError;

      // Create checkout records - now using a transaction to ensure all records are created
      const checkoutRecords = gear_ids.map((gearId: string) => ({
        gear_id: gearId,
        user_id: user_id,
        request_id: requestId,
        checkout_date: formattedCheckoutDate,
        expected_return_date: formattedDueDate,
        status: 'Checked Out'
      }));

      // First, mark any existing active checkouts for these gears as returned
      const { error: updateOldCheckoutsError } = await supabase
        .from('gear_checkouts')
        .update({ status: 'Returned', expected_return_date: formattedCheckoutDate })
        .in('gear_id', gear_ids)
        .eq('status', 'Checked Out');

      if (updateOldCheckoutsError) throw updateOldCheckoutsError;

      // Then insert new checkout records
      const { error: checkoutError } = await supabase
        .from('gear_checkouts')
        .insert(checkoutRecords);

      if (checkoutError) throw checkoutError;

      // Update gear_requests status to Checked Out (not just Approved)
      const { error: requestUpdateError } = await supabase
        .from('gear_requests')
        .update({
          status: 'Checked Out', // Changed from 'Approved' to 'Checked Out'
          approved_at: now.toISOString(),
          checkout_date: formattedCheckoutDate,
          due_date: formattedDueDate
        })
        .eq('id', requestId);

      if (requestUpdateError) throw requestUpdateError;

      // Create notification for the user
      await createSystemNotification(
        user_id,
        'Gear Request Approved',
        `Your gear request has been approved and checked out. You can now pick up your equipment.`
      );

      // Show success animation
      setShowAnimation({ type: 'approve', id: requestId });
      setTimeout(() => setShowAnimation({ type: 'approve', id: null }), 2000);

      // Show success toast
      toast({
        title: "Request Approved",
        description: "The gear request has been approved and checked out successfully.",
      });

      // Send approval email to the user (if email is available)
      const userEmail = request?.profiles?.email;
      const userName = request?.profiles?.full_name || '';
      const gearList = Array.isArray(request.gearNames) ? request.gearNames.join(', ') : '';
      if (userEmail) {
        try {
          await fetch('/api/send-approval-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: userEmail,
              userName,
              gearList,
              dueDate: formattedDueDate,
            }),
          });
        } catch (emailError) {
          console.warn('Failed to send approval email:', emailError);
        }
      }

      // Fetch admin profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      // Fetch user profile
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user_id)
        .single();
      // Fetch gear names
      const { data: gearData } = await supabase
        .from('gears')
        .select('name')
        .in('id', gear_ids);
      const gearNames = gearData ? gearData.map((g: any) => g.name) : [];
      // Send Google Chat notification for approval
      await fetch('/api/notifications/google-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'ADMIN_APPROVE_REQUEST',
          payload: {
            adminName: adminProfile?.full_name || 'Unknown Admin',
            adminEmail: adminProfile?.email || 'Unknown Email',
            userName: userProfile?.full_name || 'Unknown User',
            userEmail: userProfile?.email || 'Unknown Email',
            gearNames,
            dueDate: formattedDueDate,
          }
        })
      });

      // Refresh the requests list
      fetchRequests();

    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve the request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Update the handleReject function
  const handleReject = async () => {
    if (!requestToReject || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Request ID and rejection reason are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(`Authentication error: ${userError.message}`);
      }

      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Get the current request to verify it exists and can be rejected
      const { data: currentRequest, error: requestError } = await supabase
        .from('gear_requests')
        .select('status')
        .eq('id', requestToReject)
        .single();

      if (requestError) {
        throw new Error(`Failed to fetch request: ${requestError.message}`);
      }

      if (!currentRequest) {
        throw new Error('Request not found');
      }

      if (currentRequest.status !== 'Pending') {
        throw new Error(`Cannot reject request with status: ${currentRequest.status}`);
      }

      // Update request status with the correct column names
      const { error: updateError } = await supabase
        .from('gear_requests')
        .update({
          status: 'Rejected',
          admin_notes: rejectionReason, // Using admin_notes instead of rejection_reason
          updated_at: new Date().toISOString(), // Using updated_at instead of rejected_at
          updated_by: user.id // Using updated_by instead of rejected_by
        })
        .eq('id', requestToReject);

      if (updateError) {
        throw new Error(`Failed to update request: ${updateError.message}`);
      }

      // Add to status history
      const { error: historyError } = await supabase
        .from('request_status_history')
        .insert({
          request_id: requestToReject,
          status: 'Rejected',
          changed_by: user.id,
          note: rejectionReason,
          changed_at: new Date().toISOString()
        });

      if (historyError) {
        console.warn('Failed to add status history:', historyError);
        // Don't throw here as the main rejection was successful
      }

      // Get request details for notification
      const { data: requestDetails, error: detailsError } = await supabase
        .from('gear_requests')
        .select('user_id, gear_ids')
        .eq('id', requestToReject)
        .single();

      if (!detailsError && requestDetails) {
        // Fetch admin profile
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id)
          .single();
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', requestDetails.user_id)
          .single();
        // Fetch gear names
        const { data: gearData } = await supabase
          .from('gears')
          .select('name')
          .in('id', requestDetails.gear_ids || []);
        const gearNames = gearData ? gearData.map((g: any) => g.name) : [];
        // Send Google Chat notification for rejection
        await fetch('/api/notifications/google-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType: 'ADMIN_REJECT_REQUEST',
            payload: {
              adminName: adminProfile?.full_name || 'Unknown Admin',
              adminEmail: adminProfile?.email || 'Unknown Email',
              userName: userProfile?.full_name || 'Unknown User',
              userEmail: userProfile?.email || 'Unknown Email',
              gearNames,
              reason: rejectionReason,
            }
          })
        });
      }

      // Show success animation and toast
      setShowAnimation({ type: 'reject', id: requestToReject });
      toast({
        title: "Request Rejected",
        description: "The request has been rejected successfully.",
      });

      // Refresh requests
      await fetchRequests();

    } catch (error: any) {
      console.error('Error rejecting request:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      toast({
        title: "Error",
        description: error.message || "Failed to reject the request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setRequestToReject(null);
      setRejectionReason('');
      setIsDetailsOpen(false);
    }
  };

  // Add getStatusBadge function
  const getStatusBadge = (status: string) => {
    const statusColor = {
      pending: "bg-yellow-500",
      approved: "bg-green-500",
      rejected: "bg-red-500",
      "checked out": "bg-blue-500",
      "checked in": "bg-purple-500",
      completed: "bg-gray-500",
      cancelled: "bg-gray-500",
    }[status.toLowerCase()] || "bg-gray-500";

    return (
      <Badge className={cn("capitalize", statusColor)}>
        {status}
      </Badge>
    );
  };

  // Move RequestDetailsDialog inside main component to access shared state
  const RequestDetailsDialog = ({ request, open, onOpenChange }: { request: GearRequest | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
    if (!request) return null;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Complete information about the gear request
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Request Information</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-muted-foreground">Requested By</label>
                  <p className="font-medium">{request.userName}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Requested On</label>
                  <p className="font-medium">{format(request.requestDate, 'PPP p')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Duration</label>
                  <p className="font-medium">{request.duration}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Current Status</label>
                  <div className="mt-1">{getStatusBadge(request.status)}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Gear Details</h4>
              <div className="space-y-2">
                {request.gearNames.map((gear: string, index: number) => (
                  <div key={index} className="p-2 rounded-md border">
                    <p className="font-medium">{gear}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-medium mb-4">Request Timeline</h4>
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
          </div>

          <DialogFooter>
            {isNewRequest(request.status) && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleApprove(request.id);
                    onOpenChange(false);
                  }}
                >
                  Approve Request
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRequestToReject(request.id);
                    onOpenChange(false);
                  }}
                >
                  Reject Request
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // Function to handle CSV download (simulating PDF)
  const downloadRequestsCSV = () => {
    if (filteredRequests.length === 0) {
      toast({ title: "No Data", description: "There are no requests to download.", variant: "destructive" });
      return;
    }
    // TODO: Replace this CSV generation with actual PDF generation using a library like jsPDF and jsPDF-AutoTable
    console.warn("PDF download simulated with CSV format. Integrate a PDF library for actual PDF generation.");

    const headers = ['Request ID', 'User Name', 'Gear Name(s)', 'Request Date', 'Duration', 'Reason', 'Destination', 'Status', 'Admin Notes', 'Checkout Date', 'Due Date', 'Check-in Date'];
    const rows = filteredRequests.map(req => [
      req.id,
      `"${req.userName}"`, // Enclose strings in quotes
      `"${req.gearNames.join(', ')}"`,
      req.requestDate && req.requestDate instanceof Date ? format(req.requestDate, 'yyyy-MM-dd HH:mm') : 'N/A',
      `"${req.duration}"`,
      `"${req.reason?.replace(/"/g, '""') ?? 'N/A'}"`, // Handle quotes within reason
      `"${req.destination?.replace(/"/g, '""') ?? 'N/A'}"`,
      `"${req.status}"`,
      `"${req.adminNotes?.replace(/"/g, '""') ?? 'N/A'}"`,
      req.checkoutDate ? format(req.checkoutDate, 'yyyy-MM-dd HH:mm') : 'N/A',
      req.dueDate ? format(req.dueDate, 'yyyy-MM-dd') : 'N/A',
      req.checkinDate ? format(req.checkinDate, 'yyyy-MM-dd HH:mm') : 'N/A',
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gear_requests_${format(new Date(), 'yyyyMMdd')}.csv`); // Simulating PDF with CSV
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Download Started", description: "Request history (CSV format) is downloading." });
  };

  // PDF Export
  const downloadRequestsPDF = () => {
    if (filteredRequests.length === 0) {
      toast({ title: "No Data", description: "There are no requests to export.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    const headers = ['User', 'Gear(s)', 'Requested On', 'Duration', 'Reason', 'Destination', 'Status'];
    const rows = filteredRequests.map(req => [
      req.userName,
      req.gearNames.join(', '),
      req.requestDate && req.requestDate instanceof Date ? format(req.requestDate, 'PPp') : '',
      req.duration,
      req.reason,
      req.destination,
      req.status
    ]);
    // @ts-ignore
    doc.autoTable({ head: [headers], body: rows });
    doc.save(`gear_requests_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast({ title: "Download Started", description: "Request history (PDF format) is downloading." });
  };

  // Memoize the Lottie animation component
  const ActionAnimation = useMemo(() => {
    if (!showAnimation.id) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md z-10"
      >
        <Lottie
          animationData={showAnimation.type === 'approve' ? successAnimation : rejectAnimation}
          loop={false}
          style={{ width: 40, height: 40 }}
          aria-label={showAnimation.type === 'approve' ? 'Request approved animation' : 'Request rejected animation'}
        />
      </motion.div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnimation.id, showAnimation.type]);

  // Enhanced handleApprove/handleReject for modal
  const handleApproveModal = async (requestId: string) => {
    setIsProcessing(true);
    await handleApprove(requestId);
    setIsProcessing(false);
    setIsDetailsOpen(false);
  };
  const handleRejectModal = async () => {
    setIsProcessing(true);
    // Optionally update the request with rejection reason
    setRequests(prev => prev.map(r => r.id === requestToReject ? { ...r, status: 'Rejected', rejectionReason } : r));
    await handleReject();
    setIsProcessing(false);
    setIsDetailsOpen(false);
    setRejectionReason('');
  };

  // Handler to view the notification request details
  const handleViewNotification = () => {
    if (newRequestNotification) {
      setSelectedRequest(newRequestNotification);
      setIsDetailsOpen(true);
      setShowNotificationPopup(false);
    }
  };

  // Update the table row rendering
  const renderTableRow = (req: GearRequest) => {
    const isNew = isNewRequest(req.status);
    const isAttended = isAttendedRequest(req.status);
    const priority = isNew ? getRequestPriority(req.requestDate) : null;

    return (
      <motion.tr
        key={req.id}
        variants={itemVariants}
        className={cn(
          "relative cursor-pointer transition-all",
          isNew ? "bg-primary/5 border-l-4 border-primary" :
            isAttended ? "bg-muted/10 hover:bg-muted/20" :
              "hover:bg-muted/10"
        )}
        onClick={() => { setSelectedRequest(req); setIsDetailsOpen(true); }}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {isNew && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  New
                </Badge>
                {priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      priority.level === 'high' ? "border-red-500 text-red-500" :
                        priority.level === 'medium' ? "border-yellow-500 text-yellow-500" :
                          "border-green-500 text-green-500"
                    )}
                  >
                    {priority.label}
                  </Badge>
                )}
              </div>
            )}
            {isAttended && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Processed
              </Badge>
            )}
            <div>
              <div>{req.userName}</div>
              {req.userEmail && (
                <div className="text-xs text-muted-foreground">{req.userEmail}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {req.gearNames.map((gear: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {gear}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span>{req.requestDate instanceof Date ? format(req.requestDate, 'MMM d, yyyy') : ''}</span>
            <span className="text-xs text-muted-foreground">
              {req.requestDate instanceof Date ? format(req.requestDate, 'h:mm a') : ''}
            </span>
          </div>
        </TableCell>
        <TableCell>{req.duration}</TableCell>
        <TableCell className="max-w-[200px]">
          <div className="truncate" title={req.reason}>{req.reason}</div>
        </TableCell>
        <TableCell>{req.destination}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {getStatusBadge(req.status)}
            {isNew && (
              <span className="animate-pulse text-primary">•</span>
            )}
          </div>
        </TableCell>
        <TableCell className="text-right space-x-2">
          {showAnimation.id === req.id && ActionAnimation}
          {!showAnimation.id && isNewRequest(req.status) && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(req.id);
                }}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setRequestToReject(req.id);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {!showAnimation.id && isAttendedRequest(req.status) && (
            <Badge variant="outline" className="ml-2">
              {format(new Date(req.updatedAt || req.requestDate), 'MMM d, yyyy')}
            </Badge>
          )}
        </TableCell>
      </motion.tr>
    );
  };

  // Add batch action handlers
  const handleBatchApprove = async () => {
    setIsProcessing(true);
    try {
      for (const requestId of selectedRequests) {
        await handleApprove(requestId);
      }
      toast({
        title: "Success",
        description: `Approved ${selectedRequests.length} requests successfully.`,
      });
    } catch (error) {
      console.error('Error in batch approve:', error);
      toast({
        title: "Error",
        description: "Failed to approve some requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setSelectedRequests([]);
    }
  };

  const handleBatchReject = () => {
    setRequestToReject(selectedRequests[0]); // Open rejection dialog for first request
  };

  useEffect(() => {
    if (statusParam && statusParam !== filterStatus) {
      setFilterStatus(statusParam);
    }
  }, [statusParam]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-6"
    >
      {/* Sound toggle button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-2"
        >
          {soundEnabled ? (
            <>
              <BellRing className="h-4 w-4 text-primary" />
              Sound On
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              Sound Off
            </>
          )}
        </Button>
      </div>

      {/* New Request Notification Popup */}
      <AnimatePresence>
        {showNotificationPopup && newRequestNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 right-4 z-50 max-w-md"
          >
            <Card className="border-primary border-2 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BellRing className="h-5 w-5 text-primary animate-pulse" />
                  New Gear Request
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-1"><span className="font-semibold">From:</span> {newRequestNotification.userName}</p>
                <p className="mb-1"><span className="font-semibold">Gear:</span> {newRequestNotification.gearNames.join(', ')}</p>
                <p className="mb-3"><span className="font-semibold">Requested:</span> {format(newRequestNotification.requestDate, 'PPp')}</p>
                <div className="flex justify-between gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={handleViewNotification}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowNotificationPopup(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <div className="text-center py-10">Loading requests...</div>}
      {fetchError && <div className="text-center text-destructive py-10">{fetchError}</div>}
      {!loading && !fetchError && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Manage Gear Requests</h1>
            <Button onClick={downloadRequestsCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={downloadRequestsPDF} variant="outline">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Request History</CardTitle>
                  <CardDescription>Review and manage all gear checkout requests.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-3 w-3 rounded-full bg-primary/20 border-2 border-primary"></div>
                    <span>New Requests (Pending)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-3 w-3 rounded-full bg-muted"></div>
                    <span>Processed Requests</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Filter by user name..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="max-w-xs"
                  list="user-names"
                />
                <datalist id="user-names">
                  {uniqueUserNames.map(name => <option key={name} value={name} />)}
                </datalist>
                <Input
                  placeholder="Filter by gear..."
                  value={gearFilter}
                  onChange={(e) => setGearFilter(e.target.value)}
                  className="max-w-xs"
                  list="gear-names"
                />
                <datalist id="gear-names">
                  {uniqueGearNames.map(name => <option key={name} value={name} />)}
                </datalist>
                <DatePickerWithRange dateRange={dateRange} onDateRangeChange={setDateRange} />
                <Input
                  placeholder="Search reason/destination..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">New (Pending)</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Checked Out">Checked Out</SelectItem>
                    <SelectItem value="Checked In">Checked In</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" disabled> {/* Placeholder */}
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">More Filters</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium">{filteredRequests.filter(r => isNewRequest(r.status)).length}</span> new requests
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{filteredRequests.filter(r => isAttendedRequest(r.status)).length}</span> processed
                  </div>
                </div>
                {selectedRequests.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequests([])}
                      className="text-muted-foreground"
                    >
                      Clear Selection ({selectedRequests.length})
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleBatchApprove}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Approve Selected</>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchReject}
                      disabled={isProcessing || selectedRequests.length !== 1}
                    >
                      Reject Selected
                    </Button>
                  </div>
                )}
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="overflow-x-auto"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredRequests.length > 0 &&
                            selectedRequests.length === filteredRequests.filter(r => isNewRequest(r.status)).length
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRequests(
                                filteredRequests
                                  .filter(r => isNewRequest(r.status))
                                  .map(r => r.id)
                              );
                            } else {
                              setSelectedRequests([]);
                            }
                          }}
                          aria-label="Select all new requests"
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Gear</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          {isNewRequest(req.status) && (
                            <Checkbox
                              checked={selectedRequests.includes(req.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRequests([...selectedRequests, req.id]);
                                } else {
                                  setSelectedRequests(selectedRequests.filter(id => id !== req.id));
                                }
                              }}
                              aria-label={`Select request ${req.id}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {req.userName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {req.gearNames.map((gear: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {gear}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{req.requestDate instanceof Date ? format(req.requestDate, 'MMM d, yyyy') : ''}</span>
                            <span className="text-xs text-muted-foreground">
                              {req.requestDate instanceof Date ? format(req.requestDate, 'h:mm a') : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(req.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {showAnimation.id === req.id && ActionAnimation}
                          {!showAnimation.id && isNewRequest(req.status) && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(req.id);
                                }}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRequestToReject(req.id);
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {!showAnimation.id && isAttendedRequest(req.status) && (
                            <Badge variant="outline" className="ml-2">
                              {format(new Date(req.updatedAt || req.requestDate), 'MMM d, yyyy')}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            </CardContent>
          </Card>

          {/* Rejection Dialog */}
          <AlertDialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Request</AlertDialogTitle>
                <AlertDialogDescription>
                  Please provide a reason for rejecting this request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full"
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
                      <X className="h-4 w-4" />
                      Reject Request
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Request Details Modal */}
          <RequestDetailsDialog
            request={selectedRequest}
            open={isDetailsOpen}
            onOpenChange={setIsDetailsOpen}
          />
        </>
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
            <div className="mr-2 h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
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

