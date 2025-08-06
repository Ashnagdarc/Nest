"use client";

import { useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard/useDashboard";
import { DashboardHeader } from "@/components/admin/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { RecentActivity } from "@/components/admin/dashboard/RecentActivity";
import { EquipmentCategories } from "@/components/admin/dashboard/EquipmentCategories";
import { Analytics } from "@/components/admin/dashboard/Analytics";
import { Pagination } from "@/components/ui/Pagination";

export default function AdminDashboardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { gears, users, requests, gearsTotal, usersTotal, requestsTotal, isLoading, isError } = useDashboard(page, pageSize);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        <DashboardHeader />

        {isError && (
          <div className="text-red-500 font-bold text-center py-4 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            Failed to load dashboard data
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            <DashboardStats gears={gears} users={users} requests={requests} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuickActions />
              <RecentActivity />
            </div>
            <EquipmentCategories gears={gears} />
            <Analytics />
            <div className="flex justify-center mt-6">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(gearsTotal / pageSize)}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
