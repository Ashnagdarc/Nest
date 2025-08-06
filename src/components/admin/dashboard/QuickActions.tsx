"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddGearForm from "@/components/admin/add-gear-form";
import { useState } from "react";

export function QuickActions() {
  const [addGearOpen, setAddGearOpen] = useState(false);

  return (
    <div className="sm:col-span-2 lg:col-span-3">
      <div className="border border-gray-300 dark:border-gray-700 shadow-xl rounded-2xl p-4 sm:p-6 bg-white dark:bg-transparent h-full">
        <div className="font-bold text-base sm:text-lg mb-4 text-black dark:text-white">Quick Actions</div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <Dialog open={addGearOpen} onOpenChange={setAddGearOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base w-full sm:w-auto">
                + Add Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Equipment</DialogTitle>
              </DialogHeader>
              <AddGearForm onSubmit={() => setAddGearOpen(false)} />
            </DialogContent>
          </Dialog>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base w-full sm:w-auto">
            <Link href="/admin/manage-requests">Manage Requests</Link>
          </Button>
          <Button asChild className="bg-purple-500 hover:bg-purple-600 text-white text-sm sm:text-base w-full sm:w-auto">
            <Link href="/admin/reports">View Reports</Link>
          </Button>
          <Button asChild className="bg-green-500 hover:bg-green-600 text-white text-sm sm:text-base w-full sm:w-auto">
            <Link href="/admin/manage-users">User Management</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
