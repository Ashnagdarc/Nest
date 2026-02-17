"use client";

import { useState, useMemo, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle, XCircle, Clock, Search, FileText } from 'lucide-react';
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
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import { apiGet } from '@/lib/apiClient';
import { createClient } from '@/lib/supabase/client';
import RequestFilters from '@/components/admin/requests/RequestFilters';
import RequestTable from '@/components/admin/requests/RequestTable';
import { ViewRequestModal } from '@/components/admin/ViewRequestModal';

const NOTIFICATION_SOUND_URL = '/sounds/notification-bell.mp3';


interface GearRequest {
  id: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  userId: string;
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
  teamMembers?: string | null;
  gear_request_gears?: any[];
}

const useDebouncedSearch = (value: string, delay: number = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

function ManageRequestsContent() {
  const supabase = createClient();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [requests, setRequests] = useState<GearRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<GearRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [requestToReject, setRequestToReject] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [gearFilter, setGearFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedKeyword = useDebouncedSearch(keyword, 300);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    const saved = localStorage.getItem('nestbyeden.appSoundEnabled');
    if (saved !== null) setSoundEnabled(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('nestbyeden.appSoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  const extractGearNames = useCallback((request: any): string[] => {
    if (request.gear_request_gears && Array.isArray(request.gear_request_gears) && request.gear_request_gears.length > 0) {
      return request.gear_request_gears.map((item: any) => {
        const name = item.gears?.name || 'Unknown Gear';
        const qty = item.quantity > 1 ? ` x ${item.quantity}` : '';
        return `${name}${qty}`;
      });
    }
    return [];
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      params.set('_t', String(Date.now()));

      const response = await apiGet<{ data: any[]; total: number; error: string | null }>(`/api/requests?${params.toString()}`);
      if (response.error) throw new Error(response.error);

      const processed = response.data.map((request: any) => {
        const gearNames = extractGearNames(request);
        const firstName = request.profiles?.full_name?.split(' ')[0] || request.profiles?.full_name || 'User';
        return {
          id: request.id,
          userName: firstName,
          userEmail: request.profiles?.email,
          avatarUrl: request.profiles?.avatar_url,
          userId: request.user_id,
          gearNames,
          requestDate: new Date(request.created_at),
          duration: request.expected_duration || 'Not specified',
          reason: request.reason || 'Not specified',
          destination: request.destination || 'Not specified',
          status: request.status || 'Pending',
          adminNotes: request.admin_notes || null,
          checkoutDate: request.checkout_date ? new Date(request.checkout_date) : null,
          dueDate: request.due_date ? new Date(request.due_date) : null,
          checkinDate: request.checkin_date ? new Date(request.checkin_date) : null,
          teamMembers: request.team_members || null,
          gear_request_gears: request.gear_request_gears
        };
      });

      setRequests(processed);
      setTotal(response.total || 0);
    } catch (error: any) {
      setFetchError(error.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, filterStatus, extractGearNames]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const forceRefresh = () => { setPage(1); fetchRequests(); };

  const handleApprove = async (requestId: string) => {
    if (isProcessing || processingRequestId) return; // Prevent duplicate clicks
    
    setIsProcessing(true);
    setProcessingRequestId(requestId);
    
    try {
      const resp = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const result = await resp.json();
      if (!resp.ok || !result.success) throw new Error(result.error || 'Approval failed');

      toast({ title: "Approved", description: "Request approved successfully." });
      if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => { });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { 
      setIsProcessing(false);
      setProcessingRequestId(null);
    }
  };

  const handleReject = async () => {
    if (!requestToReject || !rejectionReason.trim()) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('gear_requests').update({
        status: 'rejected', admin_notes: rejectionReason, updated_at: new Date().toISOString()
      }).eq('id', requestToReject);
      if (error) throw error;
      toast({ title: "Rejected", description: "Request has been rejected." });
      setRequestToReject(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const getStatusBadge = useCallback((status: string) => {
    const config: any = {
      pending: { color: "bg-orange-500/10 text-orange-600", icon: <Clock className="h-3 w-3" /> },
      approved: { color: "bg-green-500/10 text-green-600", icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { color: "bg-red-500/10 text-red-600", icon: <XCircle className="h-3 w-3" /> },
      "checked out": { color: "bg-blue-500/10 text-blue-600", icon: <FileText className="h-3 w-3" /> },
      default: { color: "bg-gray-500/10 text-gray-500", icon: <Search className="h-3 w-3" /> }
    };
    const s = status.toLowerCase();
    const c = config[s] || config.default;
    return (
      <Badge variant="outline" className={cn("capitalize flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold border-none rounded-full", c.color)}>
        {c.icon}
        {status}
      </Badge>
    );
  }, []);

  const filteredRequests = useMemo(() => {
    let filtered = requests;
    if (filterStatus !== 'all') filtered = filtered.filter(r => r.status.toLowerCase() === filterStatus.toLowerCase());
    if (userFilter !== 'all') filtered = filtered.filter(r => r.userName.toLowerCase().includes(userFilter.toLowerCase()));
    if (debouncedKeyword) {
      const s = debouncedKeyword.toLowerCase();
      filtered = filtered.filter(r => r.userName.toLowerCase().includes(s) || r.gearNames.some(g => g.toLowerCase().includes(s)));
    }
    return filtered;
  }, [requests, filterStatus, userFilter, debouncedKeyword]);

  const uniqueUserNames = useMemo(() => Array.from(new Set(requests.map(r => r.userName))).sort(), [requests]);
  const uniqueGearNames = useMemo(() => Array.from(new Set(requests.flatMap(r => r.gearNames.map(g => g.split(' x ')[0])))).sort(), [requests]);

  const downloadRequestsCSV = () => {
    const headers = ['User', 'Email', 'Gear', 'Date', 'Status', 'Reason', 'Destination'];
    const rows = filteredRequests.map(r => [
      r.userName, r.userEmail || '', r.gearNames.join('; '), format(r.requestDate, 'yyyy-MM-dd HH:mm'),
      r.status, r.reason || '', r.destination || ''
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const downloadRequestsPDF = () => {
    const doc = new jsPDF();
    doc.text('Gear Requests Report', 14, 20);
    const tableData = filteredRequests.map(r => [
      r.userName, r.gearNames.join(', '), format(r.requestDate, 'MMM dd, yyyy'), r.status
    ]);
    autoTable(doc, {
      head: [['User', 'Gear', 'Date', 'Status']],
      body: tableData,
      startY: 25
    });
    doc.save(`gear-requests-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-12 space-y-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Manage Gear Requests</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">Review and process team equipment requests.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={forceRefresh} className="rounded-full bg-accent/5 h-10 px-6 gap-2">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <div className="flex bg-accent/5 p-1 rounded-full">
            <Button variant="ghost" size="sm" onClick={downloadRequestsCSV} className="rounded-full h-8 px-4 text-xs font-medium">CSV</Button>
            <Button variant="ghost" size="sm" onClick={downloadRequestsPDF} className="rounded-full h-8 px-4 text-xs font-medium">PDF</Button>
          </div>
        </div>
      </motion.div>

      <Card className="border-none bg-accent/5 rounded-3xl shadow-none p-8 space-y-8">
        <RequestFilters
          userFilter={userFilter} setUserFilter={setUserFilter}
          gearFilter={gearFilter} setGearFilter={setGearFilter}
          keyword={keyword} setKeyword={setKeyword}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          dateRange={dateRange} setDateRange={setDateRange}
          uniqueUserNames={uniqueUserNames}
          uniqueGearNames={uniqueGearNames}
          hasActiveFilters={filterStatus !== 'all' || keyword !== '' || userFilter !== 'all' || gearFilter !== 'all'}
          filterChips={[]}
          handleClearAllFilters={() => {
            setFilterStatus('all');
            setKeyword('');
            setUserFilter('all');
            setGearFilter('all');
          }}
        />

        <div className="bg-background/40 rounded-2xl overflow-hidden border border-border/40">
          {loading ? (
            <div className="p-20 text-center text-muted-foreground animate-pulse">Loading data...</div>
          ) : fetchError ? (
            <div className="p-20 text-center text-red-500 font-medium">{fetchError}</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground">No requests found matching your filters.</div>
          ) : (
            <RequestTable
              requests={filteredRequests as any}
              loading={false}
              selectedRequests={selectedRequests}
              setSelectedRequests={setSelectedRequests}
              onApprove={handleApprove}
              onReject={(id) => setRequestToReject(id)}
              onView={(req: any) => { setSelectedRequest(req); setIsDetailsOpen(true); }}
              isProcessing={isProcessing}
              processingRequestId={processingRequestId}
              getStatusBadge={getStatusBadge}
            />
          )}
        </div>

        <div className="flex justify-between items-center py-4 px-2">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredRequests.length}</span> requests
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full h-10 px-6">Previous</Button>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-semibold">{page}</div>
            <Button variant="ghost" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)} className="rounded-full h-10 px-6">Next</Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={!!requestToReject} onOpenChange={(o) => !o && setRequestToReject(null)}>
        <AlertDialogContent className="rounded-3xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for rejection.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4"><Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Reason..." className="bg-accent/5 border-none h-12" /></div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="rounded-full bg-red-600">Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedRequest?.id && (
        <ViewRequestModal requestId={selectedRequest.id} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
      )}
    </div>
  );
}

export default function ManageRequestsPage() {
  return <Suspense fallback={<div className="p-20 text-center">Loading...</div>}><ManageRequestsContent /></Suspense>;
}
