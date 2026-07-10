"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm, Controller } from "react-hook-form";
import {
  createCarBooking,
  listCarBookings,
  cancelCarBooking,
  completeCarBooking,
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
import { TimeWheelPicker } from "@/components/car-booking/TimeWheelPicker";
import { Badge } from "@/components/ui/badge";
import { PaginationFooter } from "@/components/ui/PaginationFooter";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Car,
  Check,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";
import Image from "next/image";

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

type CarBookingFormValues = {
  employeeName: string;
  dateOfUse: string;
  timeSlot: string;
  preferredCarId?: string;
};

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
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
  const styles: Record<string, string> = {
    Pending: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Completed: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Rejected: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    Cancelled: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    Available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    "In Use": "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    Maintenance: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    Damaged: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    Retired: "border-border bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", styles[status])}>
      {status}
    </Badge>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <Car className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function BookingCard({
  booking,
  carLabel,
  carPlate,
  onCancel,
  onReturn,
}: {
  booking: CarBooking;
  carLabel?: string;
  carPlate?: string;
  onCancel?: (booking: CarBooking) => void;
  onReturn?: (booking: CarBooking) => void;
}) {
  const canCancel =
    booking.status === "Pending";
  const canReturn = booking.status === "Approved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <p className="font-medium text-foreground text-sm">
              {booking.employee_name}
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {booking.date_of_use} · {booking.time_slot}
            </p>
            {carLabel && (
              <p className="flex items-center gap-2">
                <Car className="h-3.5 w-3.5 shrink-0" />
                {carLabel} {carPlate && `(${carPlate})`}
              </p>
            )}
            {booking.purpose && <p>Purpose: {booking.purpose}</p>}
          </div>
        </div>
      </div>

      {(canReturn || canCancel) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {canReturn && (
            <Button size="sm" onClick={() => onReturn?.(booking)} className="flex-1">
              Return car
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel?.(booking)}
              className="flex-1"
            >
              Cancel booking
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function FleetCard({
  car,
  onSelect,
  isDisabled,
  disabledReason,
  isSelected,
}: {
  car: CarStatusRow;
  onSelect?: (carId: string) => void;
  isDisabled?: boolean;
  disabledReason?: string;
  isSelected?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={() => !isDisabled && onSelect?.(car.id)}
      onKeyDown={(event) => {
        if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect?.(car.id);
        }
      }}
      title={disabledReason}
      className={cn(
        "group overflow-hidden rounded-2xl border bg-card text-left transition-all",
        isDisabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/40 hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {car.image_url ? (
          <Image
            src={car.image_url}
            alt={car.label}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Car className="h-8 w-8 opacity-40" />
          </div>
        )}
        {isSelected && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div>
          <p className="truncate text-sm font-semibold text-foreground">{car.label}</p>
          <p className="text-xs text-muted-foreground">{car.plate || "No plate"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={car.status || "Unknown"} />
          {car.in_use && (
            <Badge variant="outline" className="rounded-full border-orange-500/30 text-orange-600 dark:text-orange-400">
              In use
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
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
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
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
  onSubmit: (data: CarBookingFormValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CarBookingFormValues>({
    defaultValues: {
      employeeName: "",
      dateOfUse: "",
      timeSlot: "09:00 AM",
      preferredCarId: "",
    },
  });

  const preferredCarId = watch("preferredCarId");
  const selectedCar = carStatus.find((c) => c.id === preferredCarId);
  const today = new Date().toISOString().split("T")[0];

  const handleFormSubmit = async (data: CarBookingFormValues) => {
    await onSubmit(data);
    reset();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Booking details</CardTitle>
            <CardDescription>
              Enter when you need the vehicle. We&apos;ll confirm availability after you submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Employee name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Your full name"
                {...register("employeeName", {
                  required: "Employee name is required",
                })}
                className="h-11"
              />
              {errors.employeeName && (
                <p className="mt-2 text-xs text-destructive">{errors.employeeName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date of use <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  min={today}
                  {...register("dateOfUse", { required: "Date is required" })}
                  className="h-11"
                />
                {errors.dateOfUse && (
                  <p className="mt-2 text-xs text-destructive">{errors.dateOfUse.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Start time <span className="text-destructive">*</span>
                </label>
                <Controller
                  name="timeSlot"
                  control={control}
                  rules={{ required: "Start time is required" }}
                  render={({ field }) => (
                    <TimeWheelPicker value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.timeSlot && (
                  <p className="mt-2 text-xs text-destructive">{errors.timeSlot.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">
              Vehicle preference <span className="font-normal text-muted-foreground">(optional)</span>
            </CardTitle>
            <CardDescription>
              Tap an available vehicle to request it, or skip and we&apos;ll assign the best option.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCar && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
              >
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {selectedCar.image_url ? (
                    <Image
                      src={selectedCar.image_url}
                      alt={selectedCar.label}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Car className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{selectedCar.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCar.plate || "No plate"}
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={selectedCar.status || "Unknown"} />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setValue("preferredCarId", "")}
                  aria-label="Clear vehicle selection"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            <FleetStatusTab
              cars={carStatus.map((car) => ({
                ...car,
                status: car.status || "Unknown",
                in_use: car.in_use,
              }))}
              onSelectCar={(carId) => setValue("preferredCarId", carId)}
              selectedCarId={preferredCarId}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="submit" disabled={isSubmitting} size="lg" className="h-11 px-8 sm:min-w-[200px]">
            {isSubmitting ? "Submitting..." : "Request vehicle"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

function MyBookingsTab({
  bookings,
  assignedMap,
  onCancel,
  onReturn,
  isCancelling,
  isReturning,
  onCancelConfirm,
  onReturnConfirm,
  onDismissCancelDialog,
  onDismissReturnDialog,
  cancelDialog,
  returnDialog,
}: {
  bookings: CarBooking[];
  assignedMap: Record<string, { label?: string; plate?: string }>;
  onCancel: (booking: CarBooking) => void;
  onReturn: (booking: CarBooking) => void;
  isCancelling: boolean;
  isReturning: boolean;
  onCancelConfirm: () => Promise<void>;
  onReturnConfirm: () => Promise<void>;
  onDismissCancelDialog: () => void;
  onDismissReturnDialog: () => void;
  cancelDialog: { open: boolean; booking: CarBooking | null };
  returnDialog: { open: boolean; booking: CarBooking | null };
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
                  onReturn={onReturn}
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

      <Dialog open={cancelDialog.open} onOpenChange={(open) => !open && onDismissCancelDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel booking?</DialogTitle>
            <DialogDescription>
              {cancelDialog.booking?.employee_name} — {cancelDialog.booking?.date_of_use}{" "}
              {cancelDialog.booking?.time_slot}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onDismissCancelDialog}>
              Keep booking
            </Button>
            <Button
              variant="destructive"
              onClick={onCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialog.open} onOpenChange={(open) => !open && onDismissReturnDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return car now?</DialogTitle>
            <DialogDescription>
              {returnDialog.booking?.employee_name} — {returnDialog.booking?.date_of_use}{" "}
              {returnDialog.booking?.time_slot}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onDismissReturnDialog}>
              Keep booking
            </Button>
            <Button onClick={onReturnConfirm} disabled={isReturning}>
              {isReturning ? "Returning..." : "Return car"}
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
  selectedCarId,
}: {
  cars: CarStatusRow[];
  onSelectCar?: (carId: string) => void;
  selectedCarId?: string;
}) {
  const normalizeStatus = (car: CarStatusRow) => {
    if (car.in_use) return "In Use";
    const raw = (car.status || "Unknown").toLowerCase();
    if (raw === "retired") return "Retired";
    if (raw === "maintenance" || raw === "in service" || raw === "under repair") return "Maintenance";
    if (raw === "damage" || raw === "damaged") return "Damaged";
    if (raw === "available") return "Available";
    return car.status || "Unknown";
  };

  const grouped = {
    Available: cars.filter((c) => normalizeStatus(c) === "Available"),
    "In Use": cars.filter((c) => normalizeStatus(c) === "In Use"),
    Maintenance: cars.filter((c) => normalizeStatus(c) === "Maintenance"),
    Damaged: cars.filter((c) => normalizeStatus(c) === "Damaged"),
    Retired: cars.filter((c) => normalizeStatus(c) === "Retired"),
    Other: cars.filter(
      (c) =>
        !["Available", "In Use", "Maintenance", "Damaged", "Retired"].includes(
          normalizeStatus(c),
        ),
    ),
  } as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {(
        [
          ["Available to book", "Available", false],
          ["Currently in use", "In Use", true],
          ["Under maintenance", "Maintenance", true],
          ["Damaged", "Damaged", true],
          ["Retired", "Retired", true],
          ["Other", "Other", true],
        ] as const
      ).map(([title, key, disabled]) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        return (
          <div key={title}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <span className="text-xs text-muted-foreground">{items.length} vehicle{items.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((car) => (
                <FleetCard
                  key={car.id}
                  car={car}
                  onSelect={disabled ? undefined : onSelectCar}
                  isDisabled={disabled}
                  isSelected={selectedCarId === car.id}
                  disabledReason={
                    car.lock_reason ||
                    `This vehicle is ${normalizeStatus(car).toLowerCase()}`
                  }
                />
              ))}
            </div>
          </div>
        );
      })}

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

          <PaginationFooter
            page={currentPage}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
            itemLabel="booking"
            disabled={isLoading}
            className="mt-4 border-t border-border pt-4"
          />
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
  const [returnDialog, setReturnDialog] = useState<{
    open: boolean;
    booking: CarBooking | null;
  }>({
    open: false,
    booking: null,
  });
  const [isReturning, setIsReturning] = useState(false);

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

      const status = await apiGet<{ data: CarStatusRow[] }>(`/api/cars/status?includeRetired=true`);
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

  const handleFormSubmit = async (data: CarBookingFormValues) => {
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
    } catch {
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

  const handleReturnClick = (booking: CarBooking) => {
    setReturnDialog({ open: true, booking });
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
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnConfirm = async () => {
    if (!returnDialog.booking) return;
    setIsReturning(true);
    try {
      const res = await completeCarBooking(returnDialog.booking.id);
      if (res.success) {
        toast({ title: "Success", description: "Car returned successfully" });
        setReturnDialog({ open: false, booking: null });
        await loadData();
      } else {
        toast({
          title: "Error",
          description: res.user_message || "Failed to return car",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to return car",
        variant: "destructive",
      });
    } finally {
      setIsReturning(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Book a vehicle</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:pl-[52px]">
            Request a vehicle or manage your active bookings.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => loadData()} className="h-10 gap-2 self-start">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1"
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
                onReturn={handleReturnClick}
                isCancelling={isCancelling}
                isReturning={isReturning}
                onCancelConfirm={handleCancelConfirm}
                onReturnConfirm={handleReturnConfirm}
                onDismissCancelDialog={() => setCancelDialog({ open: false, booking: null })}
                onDismissReturnDialog={() => setReturnDialog({ open: false, booking: null })}
                cancelDialog={cancelDialog}
                returnDialog={returnDialog}
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
  );
}
