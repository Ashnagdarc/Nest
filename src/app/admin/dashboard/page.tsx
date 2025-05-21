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
          GearFlow Admin Dashboard • &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalCategory ? `Requests: ${modalCategory.charAt(0).toUpperCase() + modalCategory.slice(1)}` : 'Requests'}
            </DialogTitle>
          </DialogHeader>
          {modalLoading ? (
            <div className="py-8 text-center">Loading...</div>
          ) : modalRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No requests found for this category.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {modalRequests.map((req) => (
                <div key={req.id} className="border rounded p-2 flex flex-col gap-1 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedRequestId(req.id)}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{req.profiles?.full_name || req.profiles?.email || 'Unknown User'}</span>
                    <span className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</span>
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
