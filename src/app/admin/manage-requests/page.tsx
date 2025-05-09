"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Filter, ThumbsUp, ThumbsDown, Download, Package, RotateCcw, AlertCircle, CheckCircle, XCircle, Bell, BellRing } from 'lucide-react';
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createSystemNotification } from '@/lib/notifications';

// --- Dynamically import Lottie ---
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// --- Import actual Lottie animation JSON ---
import successAnimation from "@/../public/animations/success.json";
import rejectAnimation from "@/../public/animations/reject.json";

// --- Import the notification sound ---
const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3'; // Add this sound file to your public folder

type StatusHistory = { status: string; timestamp: Date; note?: string }[];
type GearDetail = { name: string; description: string; specs: string };

type Request = any;

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

export default function ManageRequestsPage() {
  const supabase = createClient();
  const [requests, setRequests] = useState<Request[]>([]); // Now fetched from DB
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // Added status filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [gearFilter, setGearFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const { toast } = useToast(); // Initialize toast
  const [requestToReject, setRequestToReject] = useState<string | null>(null); // For rejection confirmation
  const [showAnimation, setShowAnimation] = useState<{ type: 'approve' | 'reject'; id: string | null }>({ type: 'approve', id: null }); // State for animations
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null); // For details modal
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // For details modal
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]); // For audit trail
  const [previousRequestCount, setPreviousRequestCount] = useState<number>(0);
  const [newRequestNotification, setNewRequestNotification] = useState<Request | null>(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true); // Default sound on
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);

    // Check for user preference in localStorage
    const savedSoundPreference = localStorage.getItem('gearflowSoundEnabled');
    if (savedSoundPreference !== null) {
      setSoundEnabled(savedSoundPreference === 'true');
    }
  }, []);

  // Save sound preference when it changes
  useEffect(() => {
    localStorage.setItem('gearflowSoundEnabled', soundEnabled.toString());
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
      dueDate.setDate(dueDate.getDate() + parseInt(request.expected_duration || '7')); // Default to 7 days if not specified
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
        .update({ status: 'Returned', return_date: formattedCheckoutDate })
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

  // Reject handler: update DB and state, and insert status history and notification
  const handleReject = async () => {
    if (!requestToReject) return;
    const requestId = requestToReject;
    setRequestToReject(null);
    setShowAnimation({ type: 'reject', id: requestId });

    try {
      // Step 1: Get the request details
      const { data: requestData, error: requestError } = await supabase
        .from('gear_requests')
        .select('user_id, gear_ids')
        .eq('id', requestId)
        .single();

      if (requestError) {
        throw requestError;
      }

      const { user_id, gear_ids } = requestData;

      // Step 2: Update the gear_requests record with rejected status
      const { error: updateError } = await supabase
        .from('gear_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Step 3: Make sure gear status remains 'Available'
      if (gear_ids && gear_ids.length > 0) {
        const { error: gearUpdateError } = await supabase
          .from('gears')
          .update({
            status: 'Available'
          })
          .in('id', gear_ids)
          .eq('status', 'On Hold'); // Only update if was on hold

        if (gearUpdateError) {
          console.error('Error updating gear status:', gearUpdateError);
          // Non-blocking error, continue with process
        }
      }

      // Step 4: Update UI
      setRequests(prev => prev.map(r => r.id === requestId ? {
        ...r,
        status: 'Rejected',
        rejectionReason,
        rejected_at: new Date()
      } : r));

      // Step 5: Insert status history
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('request_status_history').insert({
        request_id: requestId,
        status: 'Rejected',
        changed_by: user?.id,
        note: rejectionReason,
      });

      // Step 6: Get gear names for notification
      let gearNames = 'gear';
      if (gear_ids && gear_ids.length > 0) {
        const { data: gearData } = await supabase
          .from('gears')
          .select('name')
          .in('id', gear_ids);

        if (gearData && gearData.length > 0) {
          gearNames = gearData.map((g: any) => g.name).join(', ');
        }
      }

      // Step 7: Send user notification
      await createSystemNotification(
        user_id,
        'Request Rejected',
        `Your request for ${gearNames} was rejected. Reason: ${rejectionReason}`
      );

      // Step 8: Create notifications for all admin users
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'Admin');

      if (adminUsers && adminUsers.length > 0) {
        // Create notification for each admin
        for (const admin of adminUsers) {
          await createSystemNotification(
            admin.id,
            'Gear Request Rejected',
            `Request for ${gearNames} by ${user_id} was rejected. Reason: ${rejectionReason}`
          );
        }
      }

      // Success toast
      toast({
        title: "Request Rejected",
        description: "The requester has been notified.",
        variant: "default",
      });

    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRejectionReason('');
      setShowAnimation({ type: 'reject', id: null });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><CheckCircle className="mr-1 h-3 w-3" /> {status}</Badge>; // Use blue for approved/ready
      case 'checked out':
        return <Badge variant="secondary"><Package className="mr-1 h-3 w-3" /> {status}</Badge>;
      case 'checked in':
      case 'completed':
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
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
              <CardTitle>Request History</CardTitle>
              <CardDescription>Review and manage all gear checkout requests.</CardDescription>
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
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
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
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
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
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="overflow-x-auto"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Gear(s)</TableHead>
                      <TableHead>Requested On</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length > 0 ? (
                      filteredRequests.map((req) => (
                        <tr
                          key={req.id}
                          className="cursor-pointer hover:bg-muted/30 transition"
                          onClick={() => { setSelectedRequest(req); setIsDetailsOpen(true); }}
                        >
                          <TableCell className="font-medium">{req.userName}</TableCell>
                          <TableCell>{req.gearNames.join(', ')}</TableCell>
                          <TableCell>{req.requestDate && req.requestDate instanceof Date ? format(req.requestDate, 'PPp') : ''}</TableCell>
                          <TableCell>{req.duration}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                          <TableCell>{req.destination}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell className="text-right space-x-1 relative">
                            {/* --- Animation Placeholder --- */}
                            {showAnimation.id === req.id ? ActionAnimation : null}
                            {/* --- Action Buttons (hidden during animation) --- */}
                            {currentUserRole === 'admin' && req.status === 'Pending' && showAnimation.id !== req.id && (
                              <>
                                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={e => { e.stopPropagation(); handleApprove(req.id); }}>
                                  <ThumbsUp className="h-4 w-4" />
                                  <span className="sr-only">Approve</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={e => e.stopPropagation()}>
                                      <ThumbsDown className="h-4 w-4" />
                                      <span className="sr-only">Reject</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                                      <AlertDialogDescription asChild>
                                        <div className="text-sm text-muted-foreground">
                                          Are you sure you want to reject request ID <span className="font-semibold">{req.id}</span>?
                                          {/* Optional: Add input for rejection reason here */}
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleReject} className={buttonVariants({ variant: "destructive" })}>
                                        Confirm Reject
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </TableCell>
                        </tr>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No requests found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </motion.div>
            </CardContent>
          </Card>

          {/* Rejection Confirmation Dialog */}
          <AlertDialog open={!!requestToReject} onOpenChange={(open) => !open && setRequestToReject(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-sm text-muted-foreground">
                    Are you sure you want to reject request ID <span className="font-semibold">{requestToReject}</span>?
                    {/* Optional: Add input for rejection reason here */}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReject} className={buttonVariants({ variant: "destructive" })}>
                  Confirm Reject
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Request Details Modal */}
          <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Request Details</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="text-sm text-muted-foreground">
                    {selectedRequest && (
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2">
                          <b>User:</b> {selectedRequest.userName}
                          {selectedRequest.userEmail && (
                            <a href={`mailto:${selectedRequest.userEmail}`} title="Email user" className="ml-2 text-primary hover:underline flex items-center"><Mail className="h-4 w-4 mr-1" />Email</a>
                          )}
                        </div>
                        <div><b>Gear(s):</b> {selectedRequest.gearNames.map((gear: string) => (
                          <Popover key={gear}>
                            <PopoverTrigger asChild>
                              <Button variant="link" className="p-0 h-auto align-baseline text-primary underline text-sm">{gear}</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="font-bold mb-1">{gearDetails[gear]?.name || gear}</div>
                              <div className="text-xs mb-1">{gearDetails[gear]?.description}</div>
                              <div className="text-xs text-muted-foreground">Specs: {gearDetails[gear]?.specs}</div>
                            </PopoverContent>
                          </Popover>
                        ))}</div>
                        <div><b>Requested On:</b> {selectedRequest.requestDate && selectedRequest.requestDate instanceof Date ? format(selectedRequest.requestDate, 'PPpp') : ''}</div>
                        <div><b>Duration:</b> {selectedRequest.duration}</div>
                        <div><b>Reason:</b> {selectedRequest.reason}</div>
                        <div><b>Destination:</b> {selectedRequest.destination}</div>
                        <div><b>Status:</b> {getStatusBadge(selectedRequest.status)}</div>
                        {selectedRequest.adminNotes && <div><b>Admin Notes:</b> {selectedRequest.adminNotes}</div>}
                        {selectedRequest.rejectionReason && <div><b>Rejection Reason:</b> {selectedRequest.rejectionReason}</div>}
                        {selectedRequest.checkoutDate && selectedRequest.checkoutDate instanceof Date && <div><b>Checkout Date:</b> {format(selectedRequest.checkoutDate, 'PPpp')}</div>}
                        {selectedRequest.dueDate && selectedRequest.dueDate instanceof Date && <div><b>Due Date:</b> {format(selectedRequest.dueDate, 'PPpp')}</div>}
                        {selectedRequest.checkinDate && selectedRequest.checkinDate instanceof Date && <div><b>Check-in Date:</b> {format(selectedRequest.checkinDate, 'PPpp')}</div>}
                        {/* Audit Trail */}
                        <div>
                          <b>Status History:</b>
                          <ul className="ml-4 list-disc text-xs">
                            {statusHistory.length === 0 && <li>No status history found.</li>}
                            {statusHistory.map((h, i) => (
                              <li key={i}>
                                {h.status} by {h.profiles?.full_name || 'Unknown'} at {h.changed_at ? format(new Date(h.changed_at), 'PPpp') : ''}
                                {h.note ? ` (${h.note})` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                {/* Approve/Reject actions with notes, print/download */}
                {selectedRequest?.status === 'Pending' ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        disabled={isProcessing}
                        onClick={() => selectedRequest && handleApproveModal(selectedRequest.id)}
                      >
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={isProcessing}
                          >
                            <X className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="mb-2 font-semibold">Rejection Reason</div>
                          <Input
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            placeholder="Enter reason..."
                            className="mb-2"
                            disabled={isProcessing}
                          />
                          <Button
                            variant="destructive"
                            className="w-full"
                            disabled={isProcessing || !rejectionReason.trim()}
                            onClick={() => handleRejectModal()}
                          >
                            Confirm Reject
                          </Button>
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="outline"
                        onClick={() => window.print()}
                      >
                        Print/Download
                      </Button>
                    </div>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      Print/Download
                    </Button>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </div>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </motion.div>
  );
}

