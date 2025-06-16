"use client";

import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, AlertDescription, AlertTitle } from "@/components/aceternity";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, RefreshCcw, Settings, BarChart3, Users, Package, ClipboardList, Box, Bell } from "lucide-react";
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
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/aceternity';

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
  const [activeTab, setActiveTab] = useState('overview');

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
        // Fetch all requests with proper status mapping
        const { data, error } = await supabase
          .from('gear_requests')
          .select('id, status, due_date, checkout_date, created_at');

        if (error) throw error;
        if (!data) return;

        const now = new Date();
        const stats = { new: 0, pending: 0, checkin: 0, overdue: 0 };

        data.forEach((req: any) => {
          const status = String(req.status || '').toLowerCase().trim();

          // Map statuses correctly based on your database
          if (status === 'pending' || status === 'submitted' || status === 'new') {
            stats.new++;
          } else if (status === 'approved' || status === 'in review') {
            stats.pending++;
          } else if (status === 'checked out' || status === 'ready for check-in') {
            stats.checkin++;
          }

          // Check for overdue - items that are checked out and past due date
          if (req.due_date && status === 'checked out' && new Date(req.due_date) < now) {
            stats.overdue++;
          }
        });

        if (!ignore) setRequestStats(stats);
      } catch (err: any) {
        console.error('Error fetching request stats:', err);
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

  // Quick action shortcuts - functional buttons for key admin tasks
  const quickActions = [
    {
      label: "Reports",
      icon: BarChart3,
      onClick: () => router.push('/admin/reports'),
      color: "from-purple-500 to-purple-600",
      description: "View analytics",
      available: true
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => router.push('/admin/settings'),
      color: "from-orange-500 to-orange-600",
      description: "System config",
      available: true
    },
    {
      label: "Notifications",
      icon: Bell,
      onClick: () => router.push('/admin/notifications'),
      color: "from-blue-500 to-blue-600",
      description: "View alerts",
      available: true
    },
    {
      label: "Refresh Data",
      icon: RefreshCcw,
      onClick: () => {
        handleRefresh();
        playNotificationSound?.();
      },
      color: "from-green-500 to-green-600",
      description: "Update dashboard",
      available: true
    }
  ];

  return (
    <div className="min-h-screen text-white">
      {/* Compact Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  Equipment management overview
                </p>
              </div>
              {lastUpdated && (
                <Badge variant="outline" className="border-green-500 text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Alert for updates */}
        <AnimatePresence>
          {updateMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert className="border-blue-800 bg-blue-900/20 text-blue-200">
                <InfoIcon className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-200">Dashboard Updated</AlertTitle>
                <AlertDescription className="text-blue-300">
                  {updateMessage}
                  {lastUpdated && (
                    <span className="ml-2 text-xs">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions - Key Admin Functions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <div className="text-sm text-gray-400">Essential admin tools</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className="cursor-pointer"
              >
                <Card className="bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/60 transition-all duration-300 group relative overflow-hidden backdrop-blur-sm">
                  {/* Gradient background overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-15 transition-opacity duration-300`} />

                  {/* Gradient border effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-20 rounded-lg blur-sm transition-opacity duration-300`} />

                  <CardContent className="p-6 relative z-10">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Icon with gradient background */}
                      <div className={`p-4 rounded-xl bg-gradient-to-br ${action.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </div>

                      {/* Text content */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white text-sm">
                          {action.label}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {action.description}
                        </p>
                      </div>

                      {/* Hover indicator */}
                      <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-gray-600 to-transparent group-hover:via-white transition-colors duration-300" />
                    </div>
                  </CardContent>

                  {/* Shine effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Main Dashboard Sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Dashboard</h2>
              <p className="text-sm text-gray-400">Manage your equipment and operations</p>
            </div>

            <TabsList className="grid grid-cols-4 bg-gray-800/40 border border-gray-700/50 p-1 rounded-xl backdrop-blur-sm">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-3 py-2.5 rounded-lg"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-3 py-2.5 rounded-lg"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Requests</span>
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-3 py-2.5 rounded-lg"
              >
                <Box className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Inventory</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex items-center gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-3 py-2.5 rounded-lg"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Users</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            {/* Compact Layout - Everything fits on screen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Equipment Stats - 1/3 width */}
              <div className="lg:col-span-1">
                <DashboardStats />
              </div>

              {/* Request Stats and Utilization - 2/3 width */}
              <div className="lg:col-span-2 space-y-4">
                {/* Request Stats */}
                <RequestStats
                  stats={requestStats}
                  onViewCategory={handleViewCategory}
                />

                {/* Two column for utilization and activities */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <UtilizationSection />
                  <ActivitiesSection />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <RequestsManagement />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>
        </Tabs>
      </div>

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
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </motion.div>
          <span className="ml-2 text-lg font-medium">Loading dashboard...</span>
        </div>
      }>
        <Dashboard />
      </Suspense>
    </DashboardProvider>
  );
}
