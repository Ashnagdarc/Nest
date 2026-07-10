"use client";

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

interface BookingHistoryTableProps {
    rows: CarBooking[];
    bookingCarMap: Record<string, { label?: string; plate?: string }>;
}

export function BookingHistoryTable({ rows, bookingCarMap }: BookingHistoryTableProps) {
    return (
        <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-9 text-xs">User</TableHead>
                        <TableHead className="h-9 text-xs">When</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                        <TableHead className="hidden h-9 text-xs md:table-cell">Destination</TableHead>
                        <TableHead className="hidden h-9 text-xs lg:table-cell">Vehicle</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((booking) => {
                        const statusConfig = getBookingStatusConfig(booking.status);
                        const StatusIcon = statusConfig.icon;
                        const carInfo = bookingCarMap[booking.id];
                        const timeLabel =
                            formatTimeRange(
                                booking.start_time,
                                booking.end_time,
                                booking.time_slot || ""
                            ) || booking.time_slot || "—";

                        return (
                            <TableRow key={booking.id} className="text-sm">
                                <TableCell className="py-2.5 font-medium">
                                    {booking.employee_name}
                                </TableCell>
                                <TableCell className="py-2.5 text-muted-foreground whitespace-nowrap">
                                    <span className="block">{booking.date_of_use}</span>
                                    <span className="text-xs">{timeLabel}</span>
                                </TableCell>
                                <TableCell className="py-2.5">
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "gap-1 border-0 text-[11px] font-normal",
                                            statusConfig.className
                                        )}
                                    >
                                        <StatusIcon className="h-3 w-3" />
                                        {statusConfig.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden max-w-[200px] truncate py-2.5 text-muted-foreground md:table-cell">
                                    {booking.destination || "—"}
                                </TableCell>
                                <TableCell className="hidden py-2.5 text-muted-foreground lg:table-cell">
                                    {carInfo?.label
                                        ? `${carInfo.label}${carInfo.plate ? ` (${carInfo.plate})` : ""}`
                                        : "—"}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
