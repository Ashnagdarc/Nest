"use client";

import type { ReactNode } from "react";
import { formatTimeRange, getBookingStatusConfig } from "@/components/admin/car-bookings/booking-status";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { CarBooking } from "@/types/car-bookings";
import { cn } from "@/lib/utils";

interface BookingQueueTableProps {
    rows: CarBooking[];
    renderActions: (booking: CarBooking) => ReactNode;
    getOverlapCount?: (booking: CarBooking) => number;
    assignedCarMap?: Record<string, { label?: string; plate?: string }>;
}

export function BookingQueueTable({
    rows,
    renderActions,
    getOverlapCount,
    assignedCarMap,
}: BookingQueueTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-9 text-xs">User</TableHead>
                        <TableHead className="h-9 text-xs">When</TableHead>
                        <TableHead className="hidden h-9 text-xs sm:table-cell">Trip</TableHead>
                        <TableHead className="h-9 text-right text-xs">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((booking) => {
                        const statusConfig = getBookingStatusConfig(booking.status);
                        const StatusIcon = statusConfig.icon;
                        const timeLabel =
                            formatTimeRange(
                                booking.start_time,
                                booking.end_time,
                                booking.time_slot || ""
                            ) || booking.time_slot || "—";
                        const overlaps = getOverlapCount?.(booking) ?? 0;
                        const carInfo = assignedCarMap?.[booking.id];

                        return (
                            <TableRow key={booking.id} className="align-top text-sm">
                                <TableCell className="py-2.5">
                                    <p className="font-medium leading-tight">{booking.employee_name}</p>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "mt-1 gap-1 border-0 text-[10px] font-normal sm:hidden",
                                            statusConfig.className
                                        )}
                                    >
                                        <StatusIcon className="h-3 w-3" />
                                        {statusConfig.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 text-muted-foreground whitespace-nowrap">
                                    <span className="block text-foreground">{booking.date_of_use}</span>
                                    <span className="text-xs">{timeLabel}</span>
                                </TableCell>
                                <TableCell className="hidden py-2.5 sm:table-cell">
                                    <div className="space-y-1">
                                        <p className="max-w-[220px] truncate text-muted-foreground">
                                            {booking.destination || "Internal mission"}
                                        </p>
                                        {carInfo?.label && (
                                            <p className="text-xs text-primary">
                                                {carInfo.label}
                                                {carInfo.plate ? ` (${carInfo.plate})` : ""}
                                            </p>
                                        )}
                                        {overlaps > 0 && (
                                            <Badge variant="destructive" className="text-[10px] font-normal">
                                                {overlaps} conflict{overlaps !== 1 ? "s" : ""}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="py-2.5 text-right">
                                    <div className="flex flex-col items-stretch justify-end gap-2 sm:items-end">
                                        {renderActions(booking)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
