"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import {
  createCarBooking,
  listCarBookings,
  cancelCarBooking,
} from "@/services/car-bookings";
import type { CarBooking } from "@/types/car-bookings";
import { useToast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TimePicker,
  TimePickerContent,
  TimePickerHour,
  TimePickerInput,
  TimePickerInputGroup,
  TimePickerLabel,
  TimePickerMinute,
  TimePickerPeriod,
  TimePickerSeparator,
  TimePickerTrigger,
} from "@/components/ui/time-picker";

// ============================================================================
// TYPES
// ============================================================================

type TabType = "booking" | "my-bookings" | "history";

type CarStatusRow = {
  id: string;
  label: string;
  plate?: string;
  status?: string;
  in_use: boolean;
  image_url?: string | null;
  locked_by_booking_id?: string | null;
  lock_reason?: string | null;
};

type BookingsByStatus = {
  Pending: CarBooking[];
  Approved: CarBooking[];
  Completed: CarBooking[];
  Rejected: CarBooking[];
  Cancelled: CarBooking[];
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-10 bg-neutral-800 w-64 animate-pulse"></div>
        <div className="h-4 bg-neutral-800 w-96 animate-pulse"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-neutral-800 animate-pulse"></div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 bg-neutral-900 p-4">
            <div className="h-4 bg-neutral-800 w-48 animate-pulse"></div>
            <div className="h-4 bg-neutral-800 w-full animate-pulse"></div>
            <div className="h-4 bg-neutral-800 w-3/4 animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Pending: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    Approved: "bg-green-500/20 text-green-400 border border-green-500/30",
    Completed: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    Rejected: "bg-red-500/20 text-red-400 border border-red-500/30",
    Cancelled: "bg-red-500/20 text-red-400 border border-red-500/30",
  };

  return (
    <span
      className={`px-3 py-1 text-xs font-medium ${colorMap[status] || "bg-gray-500/20 text-gray-400"}`}
    >
      {status}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 border border-neutral-800">
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-sm">
        {description}
      </p>
    </div>
  );
}

function BookingCard({
  booking,
  carLabel,
  carPlate,
  onCancel,
}: {
  booking: CarBooking;
  carLabel?: string;
  carPlate?: string;
  onCancel?: (booking: CarBooking) => void;
}) {
  const canCancel =
    ["Pending", "Approved"].includes(booking.status) &&
    new Date(booking.date_of_use) >= new Date().toISOString().split("T")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-900 p-4 space-y-3 border border-neutral-800 hover:bg-neutral-800 transition-colors"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-medium text-foreground text-sm">
              {booking.employee_name}
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="text-foreground text-xs font-medium">
              {booking.date_of_use} — {booking.time_slot}
            </p>
            {carLabel && (
              <p className="text-muted-foreground">
                Vehicle: {carLabel} {carPlate && `(${carPlate})`}
              </p>
            )}
            {booking.purpose && (
              <p className="text-muted-foreground">
                Purpose: {booking.purpose}
              </p>
            )}
          </div>
        </div>
      </div>

      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCancel?.(booking)}
          className="w-full text-xs h-8"
        >
          Cancel Booking
        </Button>
      )}
    </motion.div>
  );
}

function FleetCard({
  car,
  onSelect,
  isDisabled,
  disabledReason,
}: {
  car: CarStatusRow;
  onSelect?: (carId: string) => void;
  isDisabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => !isDisabled && onSelect?.(car.id)}
      disabled={isDisabled}
      title={disabledReason}
      className={`group transition-all border border-neutral-800 ${
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-orange-500/50 hover:scale-105 cursor-pointer"
      }`}
    >
      <div className="bg-neutral-900">
        {/* Image */}
        <div className="relative h-32 bg-neutral-800 overflow-hidden flex items-center justify-center">
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={car.label}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-neutral-800">
              <p className="text-xs">No Image</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <div>
            <p className="font-semibold text-foreground text-sm truncate">
              {car.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {car.plate || "No Plate"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={car.status || "Unknown"} />
            {car.in_use && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1">
                In Use
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 px-4 font-medium transition-all border-b-2 text-sm ${
        active
          ? "bg-orange-500 text-white border-orange-500"
          : "bg-neutral-800 text-muted-foreground border-neutral-700 hover:bg-neutral-700"
      }`}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden text-xs">{label.split(" ")[0]}</span>
    </button>
  );
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function NewBookingTab({
  carStatus,
  onSubmit,
  isSubmitting,
}: {
  carStatus: CarStatusRow[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<{
    employeeName: string;
    dateOfUse: string;
    timeSlot: string;
    preferredCarId?: string;
  }>({
    defaultValues: {
      employeeName: "",
      dateOfUse: "",
      timeSlot: "",
      preferredCarId: "",
    },
  });

  const preferredCarId = watch("preferredCarId");
  const selectedCar = carStatus.find((c) => c.id === preferredCarId);

  const handleFormSubmit = async (data: any) => {
    await onSubmit(data);
    reset();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Booking Details Section */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Employee Name <span className="text-orange-500">*</span>
              </label>
              <Input
                placeholder="Your name"
                {...register("employeeName", {
                  required: "Employee name is required",
                })}
                className="h-11 bg-neutral-800 border-neutral-700 text-foreground focus:border-orange-500 transition-colors"
              />
              {errors.employeeName && (
                <p className="text-xs text-red-400 mt-2">
                  {errors.employeeName.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date of Use <span className="text-orange-500">*</span>
              </label>
              <Input
                type="date"
                {...register("dateOfUse", { required: "Date is required" })}
                className="h-11 bg-neutral-800 border-neutral-700 text-foreground focus:border-orange-500 transition-colors"
              />
              {errors.dateOfUse && (
                <p className="text-xs text-red-400 mt-2">
                  {errors.dateOfUse.message}
                </p>
              )}
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Time <span className="text-orange-500">*</span>
              </label>
              <TimePicker className="w-full">
                <TimePickerLabel>Select booking time</TimePickerLabel>
                <TimePickerInputGroup>
                  <TimePickerInput
                    segment="hour"
                    className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors"
                  />
                  <TimePickerSeparator>:</TimePickerSeparator>
                  <TimePickerInput
                    segment="minute"
                    className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors"
                  />
                  <TimePickerInput
                    segment="period"
                    className="h-11 bg-neutral-800 border-neutral-700 focus:border-orange-500 transition-colors"
                  />
                  <TimePickerTrigger />
                </TimePickerInputGroup>
                <TimePickerContent>
                  <TimePickerHour />
                  <TimePickerMinute />
                  <TimePickerPeriod />
                </TimePickerContent>
              </TimePicker>
              {errors.timeSlot && (
                <p className="text-xs text-red-400 mt-2">
                  {errors.timeSlot.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Selection - Visual Grid */}
        <Card className="bg-neutral-900 border-neutral-800">
          <CardHeader>
            <CardTitle className="text-base">
              Select a Vehicle (Optional)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Click on a vehicle to select it, or leave blank and we'll assign
              the best available option
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Car Preview */}
            {selectedCar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-orange-500/10 border border-orange-500/30 p-4 flex items-center gap-4"
              >
                {selectedCar.image_url ? (
                  <img
                    src={selectedCar.image_url}
                    alt={selectedCar.label}
                    className="w-20 h-20 object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-neutral-800 flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">
                      No Image
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-foreground">
                    {selectedCar.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCar.plate || "No Plate"}
                  </p>
                  <StatusBadge status={selectedCar.status || "Unknown"} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue("preferredCarId", "")}
                  className="whitespace-nowrap"
                >
                  Clear Selection
                </Button>
              </motion.div>
            )}

            {/* Available Vehicles Grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Available Vehicles
              </p>
              {carStatus.filter((c) => c.status === "Available" && !c.in_use)
                .length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {carStatus
                    .filter((c) => c.status === "Available" && !c.in_use)
                    .map((car) => (
                      <motion.button
                        key={car.id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setValue("preferredCarId", car.id)}
                        className={`group transition-all border-2 ${
                          preferredCarId === car.id
                            ? "border-orange-500 bg-orange-500/5"
                            : "border-neutral-700 hover:border-orange-500/50"
                        }`}
                      >
                        <div className="bg-neutral-900">
                          {/* Image */}
                          <div className="relative h-28 bg-neutral-800 overflow-hidden flex items-center justify-center">
                            {car.image_url ? (
                              <img
                                src={car.image_url}
                                alt={car.label}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <p className="text-xs">No Image</p>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3 space-y-2">
                            <div>
                              <p className="font-semibold text-foreground text-xs truncate">
                                {car.label}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {car.plate || "No Plate"}
                              </p>
                            </div>
                            {preferredCarId === car.id && (
                              <div className="text-xs font-medium text-orange-400 text-center">
                                Selected
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-neutral-800">
                  <p className="text-sm text-muted-foreground">
                    No vehicles available at this time
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          {isSubmitting ? "Submitting..." : "Request Vehicle"}
        </Button>
      </form>
    </motion.div>
  );
}

function MyBookingsTab({
  bookings,
  assignedMap,
  onCancel,
  isCancelling,
  onCancelConfirm,
  cancelDialog,
}: {
  bookings: CarBooking[];
  assignedMap: Record<string, { label?: string; plate?: string }>;
  onCancel: (booking: CarBooking) => void;
  isCancelling: boolean;
  onCancelConfirm: () => Promise<void>;
  cancelDialog: { open: boolean; booking: CarBooking | null };
}) {
  const groupedByStatus = bookings.reduce((acc, booking) => {
    const status = booking.status as keyof BookingsByStatus;
    if (!acc[status]) acc[status] = [];
    acc[status].push(booking);
    return acc;
  }, {} as BookingsByStatus);

  const statusOrder: (keyof BookingsByStatus)[] = [
    "Pending",
    "Approved",
    "Completed",
    "Rejected",
    "Cancelled",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {statusOrder.map((status) => {
        const items = groupedByStatus[status] || [];
        if (items.length === 0) return null;

        return (
          <div key={status}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-muted-foreground">({items.length})</span>
            </h3>
            <div className="grid gap-3">
              {items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  carLabel={assignedMap[booking.id]?.label}
                  carPlate={assignedMap[booking.id]?.plate}
                  onCancel={onCancel}
                />
              ))}
            </div>
          </div>
        );
      })}

      {bookings.length === 0 && (
        <EmptyState
          title="No Bookings"
          description="You haven't made any vehicle bookings yet. Head to the booking tab to request a vehicle."
        />
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={() => {}}>
        <DialogContent className="bg-neutral-900 border-neutral-800">
          <DialogHeader>
            <DialogTitle>Cancel Booking?</DialogTitle>
            <DialogDescription>
              {cancelDialog.booking?.employee_name} -{" "}
              {cancelDialog.booking?.date_of_use}{" "}
              {cancelDialog.booking?.time_slot}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={onCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function FleetStatusTab({
  cars,
  onSelectCar,
}: {
  cars: CarStatusRow[];
  onSelectCar?: (carId: string) => void;
}) {
  const availableCars = cars.filter(
    (c) => c.status === "Available" && !c.in_use,
  );
  const unavailableCars = cars.filter(
    (c) => c.status !== "Available" || c.in_use,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Available Cars */}
      {availableCars.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-400 mb-3">
            Available Vehicles
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableCars.map((car) => (
              <FleetCard key={car.id} car={car} onSelect={onSelectCar} />
            ))}
          </div>
        </div>
      )}

      {/* Unavailable Cars */}
      {unavailableCars.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-3">
            Unavailable Vehicles
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {unavailableCars.map((car) => (
              <FleetCard
                key={car.id}
                car={car}
                isDisabled
                disabledReason={
                  car.lock_reason ||
                  `This vehicle is ${car.status?.toLowerCase()}`
                }
              />
            ))}
          </div>
        </div>
      )}

      {cars.length === 0 && (
        <EmptyState
          title="No Vehicles"
          description="There are no vehicles available at the moment."
        />
      )}
    </motion.div>
  );
}

function HistoryTab({
  history,
  assignedMap,
  total,
  currentPage,
  pageSize,
  isLoading,
  onPageChange,
}: {
  history: CarBooking[];
  assignedMap: Record<string, { label?: string; plate?: string }>;
  total: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {history.length > 0 ? (
        <>
          <div className="grid gap-3">
            {history.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                carLabel={assignedMap[booking.id]?.label}
                carPlate={assignedMap[booking.id]?.plate}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-neutral-800">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No History"
          description="Your completed and cancelled bookings will appear here."
        />
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserCarBookingPageRefactored() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("booking");
  const [isMounted, setIsMounted] = useState(false);

  // State for bookings
  const [myBookings, setMyBookings] = useState<CarBooking[]>([]);
  const [history, setHistory] = useState<CarBooking[]>([]);
  const [carStatus, setCarStatus] = useState<CarStatusRow[]>([]);
  const [assignedMap, setAssignedMap] = useState<
    Record<string, { label?: string; plate?: string }>
  >({});

  // State for pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyPageSize = 10;

  // State for cancel dialog
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    booking: CarBooking | null;
  }>({
    open: false,
    booking: null,
  });
  const [isCancelling, setIsCancelling] = useState(false);

  // State for form submission
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [pending, approved] = await Promise.all([
        listCarBookings({ page: 1, pageSize: 100, status: "Pending" }),
        listCarBookings({ page: 1, pageSize: 100, status: "Approved" }),
      ]);

      const recent = [...(pending.data || []), ...(approved.data || [])];
      setMyBookings(recent);

      const status = await apiGet<{ data: CarStatusRow[] }>(`/api/cars/status`);
      setCarStatus(status.data || []);

      // Load assigned cars
      if (recent.length > 0) {
        const ids = recent.map((b) => b.id).join(",");
        const assigned = await apiGet<{
          data: Array<{ booking_id: string; label?: string; plate?: string }>;
        }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(ids)}`);
        const map: Record<string, { label?: string; plate?: string }> = {};
        (assigned.data || []).forEach((a) => {
          map[a.booking_id] = { label: a.label, plate: a.plate };
        });
        setAssignedMap(map);
      }

      await loadHistoryPage(1);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    }
  };

  const loadHistoryPage = async (page: number) => {
    setHistoryLoading(true);
    try {
      const [completed, rejected, cancelled] = await Promise.all([
        listCarBookings({ page: 1, pageSize: 1000, status: "Completed" }).catch(
          () => ({ data: [], total: 0 }),
        ),
        listCarBookings({ page: 1, pageSize: 1000, status: "Rejected" }).catch(
          () => ({ data: [], total: 0 }),
        ),
        listCarBookings({ page: 1, pageSize: 1000, status: "Cancelled" }).catch(
          () => ({ data: [], total: 0 }),
        ),
      ]);

      const allHistory = [
        ...(completed.data || []),
        ...(rejected.data || []),
        ...(cancelled.data || []),
      ].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );

      const total = allHistory.length;
      const startIndex = (page - 1) * historyPageSize;
      const paginatedHistory = allHistory.slice(
        startIndex,
        startIndex + historyPageSize,
      );

      setHistory(paginatedHistory);
      setHistoryTotal(total);
      setHistoryPage(page);

      // Load assigned cars for this page
      if (paginatedHistory.length > 0) {
        const ids = paginatedHistory.map((b) => b.id).join(",");
        const assigned = await apiGet<{
          data: Array<{ booking_id: string; label?: string; plate?: string }>;
        }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(ids)}`);
        const map: Record<string, { label?: string; plate?: string }> = {};
        (assigned.data || []).forEach((a) => {
          map[a.booking_id] = { label: a.label, plate: a.plate };
        });
        setAssignedMap((prev) => ({ ...prev, ...map }));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  const handleFormSubmit = async (data: any) => {
    setIsFormSubmitting(true);
    try {
      const res = await createCarBooking({
        employeeName: data.employeeName,
        dateOfUse: data.dateOfUse,
        timeSlot: data.timeSlot,
        preferredCarId: data.preferredCarId || undefined,
      });

      if (res.success) {
        toast({
          title: "Success",
          description: "Your booking request has been submitted!",
        });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: res.user_message || "Failed to submit booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleCancelClick = (booking: CarBooking) => {
    setCancelDialog({ open: true, booking });
  };

  const handleCancelConfirm = async () => {
    if (!cancelDialog.booking) return;
    setIsCancelling(true);
    try {
      const res = await cancelCarBooking(
        cancelDialog.booking.id,
        "User cancelled",
      );
      if (res.success) {
        toast({ title: "Success", description: "Booking cancelled" });
        setCancelDialog({ open: false, booking: null });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: res.user_message || "Failed to cancel",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Book a Vehicle
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Request or manage your vehicle bookings
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData()}
            className="h-10 w-full sm:w-auto"
          >
            Refresh
          </Button>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-0 bg-neutral-900 border border-neutral-800"
        >
          <TabButton
            active={activeTab === "booking"}
            label="New Booking"
            onClick={() => setActiveTab("booking")}
          />
          <TabButton
            active={activeTab === "my-bookings"}
            label="My Bookings"
            onClick={() => setActiveTab("my-bookings")}
          />
          <TabButton
            active={activeTab === "history"}
            label="History"
            onClick={() => setActiveTab("history")}
          />
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "booking" && (
              <NewBookingTab
                carStatus={carStatus}
                onSubmit={handleFormSubmit}
                isSubmitting={isFormSubmitting}
              />
            )}
            {activeTab === "my-bookings" && (
              <MyBookingsTab
                bookings={myBookings}
                assignedMap={assignedMap}
                onCancel={handleCancelClick}
                isCancelling={isCancelling}
                onCancelConfirm={handleCancelConfirm}
                cancelDialog={cancelDialog}
              />
            )}
            {activeTab === "history" && (
              <HistoryTab
                history={history}
                assignedMap={assignedMap}
                total={historyTotal}
                currentPage={historyPage}
                pageSize={historyPageSize}
                isLoading={historyLoading}
                onPageChange={loadHistoryPage}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
