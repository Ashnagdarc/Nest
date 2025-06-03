"use client";

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestStats } from '@/components/admin/RequestStats';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { ActivitiesSection } from '@/components/admin/ActivitiesSection';
import { UtilizationSection } from '@/components/admin/UtilizationSection';
import { RequestsManagement } from '@/components/admin/RequestsManagement';
import { InventoryManagement } from '@/components/admin/InventoryManagement';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { DashboardProvider, useDashboard } from '@/components/admin/DashboardProvider';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ViewRequestModal } from '@/components/admin/ViewRequestModal';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Checkbox } from '@/components/ui/checkbox';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { createSystemNotification } from '@/lib/notifications';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

function Dashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const [requestStats, setRequestStats] = useState({ new: 0, pending: 0, checkin: 0, overdue: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [modalRequests, setModalRequests] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalFilterUser, setModalFilterUser] = useState('');
  const [modalFilterGear, setModalFilterGear] = useState('');
  const [modalFilterStatus, setModalFilterStatus] = useState('all');
  const [modalDateRange, setModalDateRange] = useState<DateRange | undefined>(undefined);
  const [modalSearch, setModalSearch] = useState('');
  const [modalSelectedRequests, setModalSelectedRequests] = useState<string[]>([]);
  const [modalBulkLoading, setModalBulkLoading] = useState(false);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const {
    lastUpdated,
    updateMessage,
    refreshData,
    playNotificationSound
  } = useDashboard();

  useEffect(() => {
    let ignore = false;
    async function fetchRequestStats() {
      setLoadingStats(true);
      setStatsError(null);
      try {
        // Fetch all requests
        const { data, error } = await supabase
          .from('gear_requests')
          .select('id, status, due_date, checkout_date, created_at');
        if (error) throw error;
        if (!data) return;
        const now = new Date();
        const stats = { new: 0, pending: 0, checkin: 0, overdue: 0 };
        data.forEach((req: any) => {
          const status = (req.status || '').toLowerCase();
          if (status === 'pending' || status === 'new') stats.new++;
          else if (status === 'approved' || status === 'in review') stats.pending++;
          else if (status === 'checked out' || status === 'ready for check-in') stats.checkin++;
          if (req.due_date && !req.checkout_date && new Date(req.due_date) < now) stats.overdue++;
        });
        if (!ignore) setRequestStats(stats);
      } catch (err: any) {
        if (!ignore) setStatsError(err.message);
      } finally {
        if (!ignore) setLoadingStats(false);
      }
    }
    fetchRequestStats();
    // Real-time subscription for live stats
    const channel = supabase
      .channel('public:gear_requests_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gear_requests' }, () => {
        fetchRequestStats();
      })
      .subscribe();
    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleRefresh = () => {
    refreshData();
    toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
      variant: "default",
    });
  };

  // Fetch requests for modal by category
  const openCategoryModal = async (category: string) => {
    setModalCategory(category);
    setModalOpen(true);
    setModalLoading(true);
    let statusFilter = '';
    switch (category) {
      case 'new':
        statusFilter = 'pending';
        break;
      case 'pending':
        statusFilter = 'approved';
        break;
      case 'checkin':
        statusFilter = 'checked out';
        break;
      case 'overdue':
        statusFilter = 'overdue';
        break;
      default:
        statusFilter = '';
    }
    try {
      let query = supabase
        .from('gear_requests')
        .select('id, status, due_date, checkout_date, created_at, user_id, reason, destination, admin_notes, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setModalRequests(data || []);
    } catch (err) {
      setModalRequests([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewCategory = (category: string) => {
    openCategoryModal(category);
  };

  // Get unique users and gears for filters
  const uniqueModalUsers = Array.from(new Set(modalRequests.map(r => r.profiles?.full_name || r.profiles?.email || 'Unknown User'))).sort();
  const uniqueModalGears = Array.from(new Set(modalRequests.flatMap(r => r.gearNames || []))).sort();
  const uniqueModalStatuses = Array.from(new Set(modalRequests.map(r => r.status))).sort();

  // Filtering logic for modal
  const filteredModalRequests = modalRequests.filter(req => {
    const userMatch = !modalFilterUser || (req.profiles?.full_name || req.profiles?.email) === modalFilterUser;
    const gearMatch = !modalFilterGear || (req.gearNames || []).includes(modalFilterGear);
    const statusMatch = modalFilterStatus === 'all' || req.status === modalFilterStatus;
    const searchMatch = !modalSearch || [req.profiles?.full_name, req.profiles?.email, req.reason, req.destination].join(' ').toLowerCase().includes(modalSearch.toLowerCase());
    let dateMatch = true;
    if (modalDateRange?.from && modalDateRange?.to && req.created_at) {
      const created = new Date(req.created_at);
      dateMatch = created >= modalDateRange.from && created <= modalDateRange.to;
    }
    return userMatch && gearMatch && statusMatch && searchMatch && dateMatch;
  });

  // Bulk Approve
  const handleBulkApprove = async () => {
    setConfirmApproveOpen(false);
    setModalBulkLoading(true);
    try {
      for (const requestId of modalSelectedRequests) {
        // Fetch request details
        const { data: request, error: requestError } = await supabase
          .from('gear_requests')
          .select('*, profiles:user_id(id, full_name, email)')
          .eq('id', requestId)
          .single();
        if (requestError) throw requestError;
        const { user_id, gear_ids, expected_duration } = request;
        const now = new Date();
        const formattedCheckoutDate = now.toISOString();
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + parseInt(expected_duration || '7'));
        const formattedDueDate = dueDate.toISOString();
        // Update gear status
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
        // Mark old checkouts as returned
        await supabase
          .from('gear_checkouts')
          .update({ status: 'Returned', expected_return_date: formattedCheckoutDate })
          .in('gear_id', gear_ids)
          .eq('status', 'Checked Out');
        // Insert new checkout records
        const checkoutRecords = gear_ids.map((gearId: string) => ({
          gear_id: gearId,
          user_id: user_id,
          request_id: requestId,
          checkout_date: formattedCheckoutDate,
          expected_return_date: formattedDueDate,
          status: 'Checked Out'
        }));
        await supabase.from('gear_checkouts').insert(checkoutRecords);
        // Update request status
        await supabase
          .from('gear_requests')
          .update({
            status: 'Checked Out',
            approved_at: now.toISOString(),
            checkout_date: formattedCheckoutDate,
            due_date: formattedDueDate
          })
          .eq('id', requestId);
        // Notify user
        await createSystemNotification(
          user_id,
          'Gear Request Approved',
          'Your gear request has been approved and checked out. You can now pick up your equipment.'
        );

        // Fetch admin profile
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user_id)
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
      }
      setModalSelectedRequests([]);
      toast({ title: 'Success', description: `Approved ${modalSelectedRequests.length} requests.` });
      if (modalCategory) openCategoryModal(modalCategory);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve some requests.', variant: 'destructive' });
    } finally {
      setModalBulkLoading(false);
    }
  };
  // Bulk Reject
  const handleBulkReject = async () => {
    setConfirmRejectOpen(false);
    if (!rejectReason) return;
    setModalBulkLoading(true);
    try {
      for (const requestId of modalSelectedRequests) {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No authenticated user');
        // Update request status
        await supabase
          .from('gear_requests')
          .update({
            status: 'Rejected',
            admin_notes: rejectReason,
            updated_at: new Date().toISOString(),
            updated_by: user.id
          })
          .eq('id', requestId);
        // Add to status history
        await supabase
          .from('request_status_history')
          .insert({
            request_id: requestId,
            status: 'Rejected',
            changed_by: user.id,
            note: rejectReason,
            changed_at: new Date().toISOString()
          });
        // Notify user
        const { data: requestDetails } = await supabase
          .from('gear_requests')
          .select('user_id')
          .eq('id', requestId)
          .single();
        if (requestDetails)
          await createSystemNotification(
            requestDetails.user_id,
            'Gear Request Rejected',
            `Your gear request has been rejected. Reason: ${rejectReason}`
          );

        // Fetch admin profile
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
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
              reason: rejectReason,
            }
          })
        });
      }
      setModalSelectedRequests([]);
      setRejectReason('');
      toast({ title: 'Success', description: `Rejected ${modalSelectedRequests.length} requests.` });
      if (modalCategory) openCategoryModal(modalCategory);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject some requests.', variant: 'destructive' });
    } finally {
      setModalBulkLoading(false);
    }
  };
  // Bulk Export
  const handleBulkExport = () => {
    if (modalSelectedRequests.length === 0) return;
    const selected = filteredModalRequests.filter(r => modalSelectedRequests.includes(r.id));
    const headers = ['Request ID', 'User', 'Status', 'Created', 'Reason', 'Destination'];
    const rows = selected.map(req => [
      req.id,
      req.profiles?.full_name || req.profiles?.email || 'Unknown User',
      req.status,
      req.created_at ? new Date(req.created_at).toLocaleDateString() : '',
      req.reason || '',
      req.destination || ''
    ]);
    const doc = new jsPDF();
    // @ts-ignore
    doc.autoTable({ head: [headers], body: rows });
    doc.save(`requests_export_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast({ title: 'Exported', description: 'Selected requests exported as PDF.' });
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex gap-2 items-center"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={playNotificationSound}
          >
            Test Sound
          </Button>
        </div>
      </div>

      {updateMessage && lastUpdated && (
        <Alert variant="default">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Update</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{updateMessage}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto w-full flex whitespace-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<div>Loading stats...</div>}>
            <DashboardStats />
          </Suspense>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading request stats...</div>}>
                  {loadingStats ? (
                    <div>Loading request stats...</div>
                  ) : statsError ? (
                    <div className="text-red-500">{statsError}</div>
                  ) : (
                    <RequestStats
                      stats={requestStats}
                      onViewCategory={handleViewCategory}
                    />
                  )}
                </Suspense>
              </CardContent>
            </Card>

            <Suspense fallback={<div>Loading utilization data...</div>}>
              <UtilizationSection />
            </Suspense>
          </div>

          <Suspense fallback={<div>Loading activities...</div>}>
            <ActivitiesSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Requests Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <Suspense fallback={<div>Loading requests management...</div>}>
                <RequestsManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <Suspense fallback={<div>Loading inventory management...</div>}>
                <InventoryManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <Suspense fallback={<div>Loading user management...</div>}>
                <UsersManagement />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <footer className="text-center text-sm text-muted-foreground">
        <p>
          Flow Tag Admin Dashboard • &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalCategory ? `Requests: ${modalCategory.charAt(0).toUpperCase() + modalCategory.slice(1)}` : 'Requests'}
            </DialogTitle>
          </DialogHeader>
          {/* Filter UI */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={modalFilterUser} onChange={e => setModalFilterUser(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All Users</option>
              {uniqueModalUsers.map(user => <option key={user} value={user}>{user}</option>)}
            </select>
            <select value={modalFilterGear} onChange={e => setModalFilterGear(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All Gear</option>
              {uniqueModalGears.map(gear => <option key={gear} value={gear}>{gear}</option>)}
            </select>
            <select value={modalFilterStatus} onChange={e => setModalFilterStatus(e.target.value)} className="border rounded px-2 py-1">
              <option value="all">All Statuses</option>
              {uniqueModalStatuses.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
            <DatePickerWithRange dateRange={modalDateRange} onDateRangeChange={setModalDateRange} />
            <input type="text" value={modalSearch} onChange={e => setModalSearch(e.target.value)} placeholder="Search..." className="border rounded px-2 py-1" />
            <Button variant="outline" size="sm" onClick={() => { setModalFilterUser(''); setModalFilterGear(''); setModalFilterStatus('all'); setModalDateRange(undefined); setModalSearch(''); }}>Clear Filters</Button>
          </div>
          {/* Bulk Action Buttons */}
          {modalSelectedRequests.length > 0 && (
            <div className="flex gap-2 mb-2">
              <Button variant="default" size="sm" onClick={() => setConfirmApproveOpen(true)} disabled={modalBulkLoading}>
                Approve Selected
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmRejectOpen(true)} disabled={modalBulkLoading}>
                Reject Selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                Export Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setModalSelectedRequests([])}>
                Clear Selection
              </Button>
            </div>
          )}
          {/* Requests List with Checkboxes */}
          {modalLoading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : filteredModalRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No requests found for this category.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-2 mb-1">
                <Checkbox
                  checked={modalSelectedRequests.length === filteredModalRequests.length && filteredModalRequests.length > 0}
                  onCheckedChange={checked => {
                    if (checked) setModalSelectedRequests(filteredModalRequests.map(r => r.id));
                    else setModalSelectedRequests([]);
                  }}
                  aria-label="Select all requests"
                />
                <span className="text-xs">Select All</span>
              </div>
              {filteredModalRequests.map((req) => (
                <div key={req.id} className={`border rounded p-2 flex flex-col gap-1 hover:bg-muted/30 cursor-pointer ${modalSelectedRequests.includes(req.id) ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedRequestId(req.id)}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={modalSelectedRequests.includes(req.id)}
                      onCheckedChange={checked => {
                        if (checked) setModalSelectedRequests(prev => [...prev, req.id]);
                        else setModalSelectedRequests(prev => prev.filter(id => id !== req.id));
                      }}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Select request ${req.id}`}
                    />
                    <span className="font-medium">{req.profiles?.full_name || req.profiles?.email || 'Unknown User'}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{req.reason || ''} {req.destination ? `• ${req.destination}` : ''}</div>
                  <div className="text-xs">Status: {req.status}</div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setModalOpen(false);
              if (modalCategory) {
                let statusParam = '';
                switch (modalCategory) {
                  case 'new': statusParam = 'pending'; break;
                  case 'pending': statusParam = 'approved'; break;
                  case 'checkin': statusParam = 'checked out'; break;
                  case 'overdue': statusParam = 'overdue'; break;
                  default: statusParam = '';
                }
                router.push(`/admin/manage-requests${statusParam ? `?status=${encodeURIComponent(statusParam)}` : ''}`);
              }
            }}>Go to full page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ViewRequestModal requestId={selectedRequestId} open={!!selectedRequestId} onOpenChange={(open) => setSelectedRequestId(open ? selectedRequestId : null)} />
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {modalSelectedRequests.length} Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the selected requests? This will check out the gear and notify users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkApprove} disabled={modalBulkLoading}>
              {modalBulkLoading ? 'Processing...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={confirmRejectOpen} onOpenChange={setConfirmRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {modalSelectedRequests.length} Requests?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejection. This will update the status and notify users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkReject} disabled={!rejectReason.trim() || modalBulkLoading}>
              {modalBulkLoading ? 'Processing...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  );
}
