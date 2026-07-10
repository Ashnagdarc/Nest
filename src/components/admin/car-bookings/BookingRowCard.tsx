"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { CarBooking } from "@/types/car-bookings";
import { getBookingStatusConfig, formatTimeRange } from "@/components/admin/car-bookings/booking-status";
import { cn } from "@/lib/utils";

interface BookingRowCardProps {
    booking: CarBooking;
    carLabel?: string;
    carPlate?: string;
    carTag?: string;
    overlapCount?: number;
    actions: ReactNode;
}

export function BookingRowCard({
    booking,
    carLabel,
    carPlate,
    carTag,
    overlapCount = 0,
    actions,
}: BookingRowCardProps) {
    const statusConfig = getBookingStatusConfig(booking.status);
    const StatusIcon = statusConfig.icon;
    const timeLabel =
        formatTimeRange(booking.start_time, booking.end_time, booking.time_slot || "") ||
        booking.time_slot ||
        "—";

    return (
        <div className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="text-sm font-medium">
                                    {booking.employee_name.slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{booking.employee_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {booking.date_of_use} · {timeLabel}
                                </p>
                            </div>
                        </div>
                        <Badge
                            variant="secondary"
                            className={cn("gap-1 border-0 font-normal", statusConfig.className)}
                        >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                            {booking.updated_at && (
                                <span className="opacity-60">
                                    ({booking.updated_at.slice(11, 16)})
                                </span>
                            )}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-3 py-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {booking.destination || "Internal mission"}
                        </div>
                        {carLabel && (
                            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm">
                                {carTag && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                        {carTag}
                                    </span>
                                )}
                                <span className="font-medium">
                                    {carLabel}
                                    {carPlate ? ` (${carPlate})` : ""}
                                </span>
                            </div>
                        )}
                        {booking.purpose && (
                            <p className="w-full text-sm italic text-muted-foreground">
                                &ldquo;{booking.purpose}&rdquo;
                            </p>
                        )}
                        {overlapCount > 0 && (
                            <Badge variant="destructive" className="font-normal">
                                {overlapCount} slot conflict{overlapCount !== 1 ? "s" : ""}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:min-w-[220px]">
                    {actions}
                </div>
            </div>
        </div>
    );
}
