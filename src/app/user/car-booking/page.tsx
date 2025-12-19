"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Dialog imports removed since we simplified the UI
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { createCarBooking, listCarBookings, cancelCarBooking } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { useToast } from '@/hooks/use-toast';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UserCarBookingPage() {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<{ employeeName: string; dateOfUse: string; timeSlot?: string; destination?: string; purpose?: string }>();
    const { toast } = useToast();
    const [rows, setRows] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const historyPageSize = 10;
    const [assignedMap, setAssignedMap] = useState<Record<string, { label?: string; plate?: string }>>({});
    const [returningId, setReturningId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<CarBooking | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    // const TIME_SLOTS = useMemo(() => [
    //     '08:00-09:00',
    //     '09:00-10:00',
    //     '10:00-11:00',
    //     '11:00-12:00',
    //     '12:00-13:00',
    //     '13:00-14:00',
    //     '14:00-15:00',
    //     '15:00-16:00',
    //     '16:00-17:00',
    //     '17:00-18:00',
    // ], []);

    // Simplified: no auto-time setting needed since we only use time_slot

    // Simplified: no time calculation functions needed since we only use time_slot

    // Simplified: no duration functions needed since we only use time_slot

    const loadHistoryPage = async (page: number = historyPage) => {
        setHistoryLoading(true);
        try {
            // Get all history items first to calculate proper pagination
            const [cAll, rAll, cancelledAll] = await Promise.all([
                listCarBookings({ page: 1, pageSize: 1000, status: 'Completed' }).catch(() => ({ data: [], total: 0 })),
                listCarBookings({ page: 1, pageSize: 1000, status: 'Rejected' }).catch(() => ({ data: [], total: 0 })),
                listCarBookings({ page: 1, pageSize: 1000, status: 'Cancelled' }).catch(() => ({ data: [], total: 0 })),
            ]);
        
            // Combine all history items and sort by date (most recent first)
            let allHist = [...(cAll.data || []), ...(rAll.data || []), ...(cancelledAll.data || [])]
                .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
            
            const total = allHist.length;
            const startIndex = (page - 1) * historyPageSize;
            const endIndex = startIndex + historyPageSize;
            const paginatedHist = allHist.slice(startIndex, endIndex);
            
            setHistory(paginatedHist);
            setHistoryTotal(total);
            setHistoryPage(page);
            
            // Update car assignments for paginated history items
            const histIds = paginatedHist.map(b => b.id).join(',');
            if (histIds && paginatedHist.length > 0) {
                try {
                    const assigned = await apiGet<{ data: Array<{ booking_id: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(histIds)}`);
                    const newMap: Record<string, { label?: string; plate?: string }> = {};
                    (assigned.data || []).forEach((a) => { newMap[a.booking_id] = { label: a.label, plate: a.plate }; });
                    setAssignedMap(prev => ({ ...prev, ...newMap }));
                } catch (error) {
                    console.warn('Failed to load car assignments for history:', error);
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            setHistory([]);
            setHistoryTotal(0);
        } finally {
            setHistoryLoading(false);
        }
    };

    const load = async () => {
        // Fetch both Pending and Approved bookings for "My Recent Car Bookings"
        const [pending, approved] = await Promise.all([
            listCarBookings({ page: 1, pageSize: 10, status: 'Pending' }),
            listCarBookings({ page: 1, pageSize: 10, status: 'Approved' })
        ]);
        const recent = [...(pending.data || []), ...(approved.data || [])];
        setRows(recent);

        // Load history with pagination
        await loadHistoryPage(1);

        // Get assigned cars for recent bookings
        const recentIds = recent.map(b => b.id).join(',');
        if (recentIds) {
            const assigned = await apiGet<{ data: Array<{ booking_id: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(recentIds)}`);
            const map: Record<string, { label?: string; plate?: string }> = {};
            (assigned.data || []).forEach(a => { map[a.booking_id] = { label: a.label, plate: a.plate }; });
            setAssignedMap(prev => ({ ...prev, ...map }));
        }
    };

    useEffect(() => {
        setIsMounted(true);
        load();
    }, []);

    const onSubmit = async (v: { employeeName: string; dateOfUse: string; timeSlot?: string; startTime?: string; endTime?: string; destination?: string; purpose?: string }) => {
        if (!v.timeSlot) {
            toast({ title: 'Time slot required', description: 'Please enter your desired time slot.', variant: 'destructive' });
            return;
        }
        // Simplified: no time range validation needed since we only use time_slot
        const res = await createCarBooking(v);
        if (res.success) {
            reset();
            toast({ title: 'Submitted', description: 'Your car booking was submitted for approval.' });
            load();
        } else {
            const msg = res.error || 'Failed to submit';
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        }
    };

    const canCancelBooking = (booking: CarBooking): boolean => {
        // Can cancel if status is Pending or Approved
        if (!['Pending', 'Approved'].includes(booking.status)) return false;
        
        const today = new Date().toISOString().split('T')[0];
        const bookingDate = booking.date_of_use;
        
        // Can cancel if:
        // 1. Future or today (date >= today)
        // 2. Past pending (date < today AND status = Pending)
        const isFutureOrToday = bookingDate >= today;
        const isPastPending = bookingDate < today && booking.status === 'Pending';
        
        return isFutureOrToday || isPastPending;
    };

    const handleCancelClick = (booking: CarBooking) => {
        setBookingToCancel(booking);
        setCancelReason('');
        setCancelDialogOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!bookingToCancel) return;
        
        setCancellingId(bookingToCancel.id);
        try {
            const res = await cancelCarBooking(bookingToCancel.id, cancelReason || 'User cancelled');
            if (res.success) {
                toast({ title: 'Cancelled', description: 'Your booking has been cancelled.' });
                setCancelDialogOpen(false);
                setBookingToCancel(null);
                load();
            } else {
                toast({ title: 'Error', description: 'Failed to cancel booking', variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to cancel booking', variant: 'destructive' });
        } finally {
            setCancellingId(null);
        }
    };

    // Prevent hydration mismatch by only rendering after mount
    if (!isMounted) {
        return (
            <div className="mx-auto max-w-3xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Book a Car</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                            <div className="h-10 bg-muted animate-pulse rounded"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>My Recent Car Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-20 bg-muted animate-pulse rounded"></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-20 bg-muted animate-pulse rounded"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Book a Car</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Employee Name</div>
                            <Input placeholder="Employee Name" {...register('employeeName', { required: true })} />
                            {errors.employeeName && <div className="text-xs text-destructive mt-1">Employee name is required</div>}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Date of use</div>
                            <Input type="date" placeholder="Date of Use" {...register('dateOfUse', { required: true })} />
                            {errors.dateOfUse && <div className="text-xs text-destructive mt-1">Date is required</div>}
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Time Slot</div>
                            <Input placeholder="e.g., 10:30 am, 2:00 pm, etc." {...register('timeSlot', { required: true })} />
                            {errors.timeSlot && <div className="text-xs text-destructive mt-1">Time slot is required</div>}
                        </div>
                        {/* Simplified: no time validation needed since we only use time_slot */}
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Destination</div>
                            <Input placeholder="Destination" {...register('destination')} />
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Purpose</div>
                            <Input placeholder="Purpose" {...register('purpose')} />
                        </div>
                        <Button type="submit" className="w-full">Submit Booking</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Simplified: no overlap dialog needed since we only use time_slot */}

            <Card>
                <CardHeader>
                    <CardTitle>My Recent Car Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {rows.map(b => (
                            <div key={b.id} className="border rounded p-2 text-sm flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{b.date_of_use} — {b.time_slot}</div>
                                    <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                    <div className="flex items-center gap-2">
                                        <span>Status: {b.status}</span>
                                        {assignedMap[b.id] && (
                                            <span className="text-xs text-muted-foreground">• Car: {assignedMap[b.id].label || '—'} {assignedMap[b.id].plate ? `(${assignedMap[b.id].plate})` : ''}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {canCancelBooking(b) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={cancellingId === b.id}
                                            onClick={() => handleCancelClick(b)}
                                        >
                                            {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                                        </Button>
                                    )}
                                    {b.status === 'Approved' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={returningId === b.id}
                                            onClick={async () => {
                                                setReturningId(b.id);
                                                try {
                                                    const res = await fetch('/api/car-bookings/complete', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ bookingId: b.id }),
                                                        credentials: 'include'
                                                    });
                                                    const j: { success?: boolean; error?: string } = await res.json();
                                                    if (j.success) {
                                                        toast({ title: 'Thanks', description: 'Car return submitted.' });
                                                        load(); // Refresh recent bookings and history 
                                                    } else {
                                                        toast({ title: 'Error', description: j.error || 'Failed', variant: 'destructive' });
                                                    }
                                                } finally {
                                                    setReturningId(null);
                                                }
                                            }}
                                        >
                                            {returningId === b.id ? 'Submitting…' : 'I returned the car'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {rows.length === 0 && <div className="text-sm text-muted-foreground">No bookings yet.</div>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>History</CardTitle>
                        <span className="text-sm text-muted-foreground">
                            {historyTotal > 0 ? `${historyTotal} total` : ''}
                        </span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {historyLoading && [0, 1, 2].map(i => (
                            <div key={i} className="border rounded p-2 animate-pulse">
                                <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                                <div className="h-3 bg-muted rounded w-1/2 mb-1" />
                                <div className="h-3 bg-muted rounded w-1/3" />
                            </div>
                        ))}
                        {!historyLoading && history.map(b => (
                            <div key={b.id} className="border rounded p-2 text-sm">
                                <div className="font-medium">{b.date_of_use} — {b.time_slot}</div>
                                <div className="text-muted-foreground">{b.destination} · {b.purpose}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span>Status: {b.status}</span>
                                    {assignedMap[b.id] && (
                                        <span className="text-xs text-muted-foreground">• Car: {assignedMap[b.id].label || '—'} {assignedMap[b.id].plate ? `(${assignedMap[b.id].plate})` : ''}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!historyLoading && history.length === 0 && <div className="text-sm text-muted-foreground">No history yet.</div>}
                    </div>

                    {/* Pagination Controls */}
                    {historyTotal > historyPageSize && (
                        <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                    Showing <span className="font-semibold">{Math.min((historyPage - 1) * historyPageSize + 1, historyTotal)}</span> to <span className="font-semibold">{Math.min(historyPage * historyPageSize, historyTotal)}</span> of <span className="font-semibold">{historyTotal}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={historyPage <= 1 || historyLoading}
                                        onClick={() => loadHistoryPage(historyPage - 1)}
                                        className="px-3 py-1 text-xs"
                                    >
                                        ← Previous
                                    </Button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, Math.ceil(historyTotal / historyPageSize)) }, (_, i) => {
                                            const totalPages = Math.ceil(historyTotal / historyPageSize);
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (historyPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (historyPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = historyPage - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    size="sm"
                                                    variant={historyPage === pageNum ? "default" : "outline"}
                                                    disabled={historyLoading}
                                                    onClick={() => loadHistoryPage(pageNum)}
                                                    className="w-8 h-7 p-0 text-xs"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={historyPage >= Math.ceil(historyTotal / historyPageSize) || historyLoading}
                                        onClick={() => loadHistoryPage(historyPage + 1)}
                                        className="px-3 py-1 text-xs"
                                    >
                                        Next →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cancel Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Booking</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this booking for {bookingToCancel?.date_of_use} at {bookingToCancel?.time_slot}?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
                            <Select value={cancelReason} onValueChange={setCancelReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Schedule change">Schedule change</SelectItem>
                                    <SelectItem value="Client postponement">Client postponement</SelectItem>
                                    <SelectItem value="Weather/Traffic">Weather/Traffic</SelectItem>
                                    <SelectItem value="No longer needed">No longer needed</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                            Keep Booking
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleCancelConfirm}
                            disabled={cancellingId !== null}
                        >
                            {cancellingId ? 'Cancelling...' : 'Yes, Cancel Booking'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
