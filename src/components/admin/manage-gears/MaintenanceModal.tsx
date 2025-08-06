"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Gear } from '@/types/supabase';
import { Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface MaintenanceModalProps {
  maintenanceModalOpen: boolean;
  setMaintenanceModalOpen: (isOpen: boolean) => void;
  selectedGear: Gear | null;
  maintenanceRecords: any[];
  loadingMaintenance: boolean;
  handleAddMaintenance: (values: any) => void;
}

export function MaintenanceModal({
  maintenanceModalOpen,
  setMaintenanceModalOpen,
  selectedGear,
  maintenanceRecords,
  loadingMaintenance,
  handleAddMaintenance,
}: MaintenanceModalProps) {
  const maintenanceForm = useForm({
    defaultValues: {
      status: 'Maintenance Completed',
      description: '',
      date: new Date().toISOString().slice(0, 16), // yyyy-MM-ddTHH:mm
    },
    resolver: zodResolver(
      z.object({
        status: z.string().min(1, { message: "Status is required" }),
        description: z.string().min(5, { message: "Description must be at least 5 characters" }),
        date: z.string().min(1, { message: "Date is required" })
      })
    )
  });

  return (
    <Dialog open={maintenanceModalOpen} onOpenChange={setMaintenanceModalOpen}>
      <DialogContent className="sm:max-w-[625px] w-[95vw] max-w-full">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-yellow-600" />
            Maintenance for {selectedGear?.name}
          </DialogTitle>
          <DialogDescription>View and log maintenance events for this gear.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Maintenance History</h4>
            <span className="text-xs text-muted-foreground">{maintenanceRecords.length} records</span>
          </div>

          {loadingMaintenance ? (
            <div className="flex justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                <p className="text-xs text-muted-foreground">Loading records...</p>
              </div>
            </div>
          ) : maintenanceRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border">
              <Wrench className="h-8 w-8 mb-2 text-muted-foreground/50" />
              <p className="text-sm">No maintenance records found.</p>
              <p className="text-xs mt-1">Add your first maintenance record below.</p>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-1 space-y-2 rounded-lg border p-3 bg-muted/10">
              {maintenanceRecords.map((rec) => (
                <div key={rec.id} className="border rounded-md p-3 bg-card shadow-sm">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <span className={`font-medium text-sm px-2 py-0.5 rounded-full ${rec.status === 'Completed' || rec.status === 'Maintenance Completed' ? 'bg-green-100 text-green-800' :
                      rec.status === 'Scheduled' || rec.status === 'Scheduled Maintenance' ? 'bg-blue-100 text-blue-800' :
                        rec.status === 'In Progress' || rec.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800' :
                          rec.status === 'Needs Repair' ? 'bg-orange-100 text-orange-800' :
                            rec.status === 'Damaged' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                      }`}>
                      {rec.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(rec.date).toLocaleString()}</span>
                  </div>
                  <div className="text-sm mt-2">{rec.description}</div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-sm mb-3">Add New Maintenance Record</h4>
            <form
              className="space-y-4"
              onSubmit={maintenanceForm.handleSubmit(handleAddMaintenance)}
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <select
                    className={`w-full border rounded-md px-3 py-2 mt-1 bg-background text-sm ${maintenanceForm.formState.errors.status ? 'border-red-500' : ''
                      }`}
                    {...maintenanceForm.register('status', {
                      required: "Status is required"
                    })}
                  >
                    <option value="">Select status...</option>
                    <option value="Scheduled">Scheduled Maintenance</option>
                    <option value="In Progress">Under Repair</option>
                    <option value="Completed">Maintenance Completed</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Damaged">Mark as Damaged</option>
                  </select>
                  {maintenanceForm.formState.errors.status && (
                    <p className="text-red-500 text-xs mt-1">
                      {maintenanceForm.formState.errors.status.message}
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                  <Input
                    type="datetime-local"
                    className={`w-full mt-1 bg-background text-sm ${maintenanceForm.formState.errors.date ? 'border-red-500' : ''
                      }`}
                    {...maintenanceForm.register('date', {
                      required: "Date is required"
                    })}
                  />
                  {maintenanceForm.formState.errors.date && (
                    <p className="text-red-500 text-xs mt-1">
                      {maintenanceForm.formState.errors.date.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <Textarea
                  className={`w-full mt-1 bg-background text-sm ${maintenanceForm.formState.errors.description ? 'border-red-500' : ''
                    }`}
                  rows={3}
                  {...maintenanceForm.register('description', {
                    required: "Description is required",
                    minLength: { value: 5, message: "Description must be at least 5 characters" }
                  })}
                  placeholder="Describe the maintenance performed..."
                />
                {maintenanceForm.formState.errors.description && (
                  <p className="text-red-500 text-xs mt-1">
                    {maintenanceForm.formState.errors.description.message}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="mt-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loadingMaintenance || maintenanceForm.formState.isSubmitting}
                  className="mt-2"
                >
                  {loadingMaintenance ? 'Saving...' : 'Log Maintenance'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
