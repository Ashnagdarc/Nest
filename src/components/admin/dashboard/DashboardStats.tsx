"use client";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, Wrench, Users, ClipboardList, CheckCircle2, XCircle, BarChart3 as BarChartIcon } from "lucide-react";
import { Gear, Profile, GearRequest } from "@/types/dashboard";

interface DashboardStatsProps {
  gears: Gear[];
  users: Profile[];
  requests: GearRequest[];
}

export function DashboardStats({ gears, users, requests }: DashboardStatsProps) {
  const totalEquipment = gears.reduce((sum, g) => sum + (g.quantity ?? 1), 0);
  const availableEquipment = gears.reduce((sum, g) => sum + (g.available_quantity ?? 0), 0);
  const checkedOutEquipment = gears.filter((g: Gear) => g.status === "Checked Out").length;
  const underRepairEquipment = gears.filter((g: Gear) => g.status === "Under Repair").length;
  const utilizationRate = totalEquipment > 0 ? Math.round((checkedOutEquipment / totalEquipment) * 100) : 0;

  const totalUsers = users.length;
  const activeUsers = users.filter((u: Profile) => u.status === "Active").length;

  const pendingRequests = requests.filter((r: GearRequest) => r.status === "Pending").length;
  const approvedRequests = requests.filter((r: GearRequest) => r.status === "Approved").length;
  const rejectedRequests = requests.filter((r: GearRequest) => r.status === "Rejected").length;
  const approvalRate = requests.length > 0 ? Math.round((approvedRequests / requests.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
      {/* Top row: Hero cards */}
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Package className="w-8 h-8 sm:w-12 sm:h-12 text-blue-400 flex-shrink-0" />
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate">Total Equipment</span>
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black dark:text-white mb-2">{totalEquipment}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{availableEquipment} available</div>
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-purple-400 flex-shrink-0" />
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-black dark:text-white truncate">Utilization Rate</span>
          </div>
          <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-black dark:text-white mb-2">{utilizationRate}%</div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
            <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${utilizationRate}%` }} />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Equipment in use</div>
        </div>
      </div>

      {/* Second row: Equipment/User stats */}
      <div className="sm:col-span-1 lg:col-span-2">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Checked Out</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{checkedOutEquipment}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">In use</div>
        </div>
      </div>
      <div className="sm:col-span-1 lg:col-span-2">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Under Repair</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{underRepairEquipment}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Maintenance</div>
        </div>
      </div>
      <div className="sm:col-span-1">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Total Users</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{totalUsers}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Registered</div>
        </div>
      </div>
      <div className="sm:col-span-1">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Active Users</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{activeUsers}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Recently active</div>
        </div>
      </div>

      {/* Third row: Request stats */}
      <div className="sm:col-span-1">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <ClipboardList className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Pending</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{pendingRequests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Awaiting approval</div>
        </div>
      </div>
      <div className="sm:col-span-1">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Approved</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{approvedRequests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Approved</div>
        </div>
      </div>
      <div className="sm:col-span-1">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Rejected</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{rejectedRequests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Rejected</div>
        </div>
      </div>
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <BarChartIcon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
            <span className="text-base sm:text-lg font-bold text-black dark:text-white truncate">Approval Rate</span>
          </div>
          <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-2">{approvalRate}%</div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-2">
            <div className="h-2 bg-green-500 rounded-full" style={{ width: `${approvalRate}%` }} />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Request approvals</div>
        </div>
      </div>
    </div>
  );
}
