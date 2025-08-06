"use client";

import { Button } from "@/components/ui/button";
import { RefreshCcw, BarChart3, Settings } from "lucide-react";

export function DashboardHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold bg-gradient-to-r from-[#ff6300] via-[#ff8533] to-[#ffaa66] bg-clip-text text-transparent truncate">
          Welcome Admin
        </h1>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          variant="outline"
          className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
          onClick={() => window.location.reload()}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Refresh</span>
          <span className="xs:hidden">Refresh</span>
        </Button>
        <Button
          variant="outline"
          className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Reports</span>
          <span className="xs:hidden">Reports</span>
        </Button>
        <Button
          variant="outline"
          className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white text-sm sm:text-base"
        >
          <Settings className="h-4 w-4 mr-2" />
          <span className="hidden xs:inline">Settings</span>
          <span className="xs:hidden">Settings</span>
        </Button>
      </div>
    </div>
  );
}
