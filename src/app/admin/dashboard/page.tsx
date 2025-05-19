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

function Dashboard() {
  const { toast } = useToast();
  const {
    lastUpdated,
    updateMessage,
    refreshData,
    playNotificationSound
  } = useDashboard();

  const handleRefresh = () => {
    refreshData();
          toast({
      title: "Dashboard refreshed",
      description: "All data has been updated",
            variant: "default",
          });
  };

  // Function to handle category selection
  const handleViewCategory = (category: string) => {
      toast({
      title: `${category} selected`,
      description: `Viewing ${category} inventory`,
        variant: "default",
      });
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
                  <RequestStats
                    stats={{
                      new: 5,
                      pending: 3,
                      checkin: 8,
                      overdue: 2
                    }}
                    onViewCategory={handleViewCategory}
                  />
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
