"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { createCarBooking, listCarBookings, cancelCarBooking } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function StatusPill({ status }: { status: string }) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Approved':
                return {
                    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                    label: 'Approved'
                };
            case 'Pending':
                return {
                    bg: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
                    label: 'Pending'
                };
            case 'Rejected':
                return {
                    bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
                    label: 'Rejected'
                };
            case 'Cancelled':
                return {
                    bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
                    label: 'Cancelled'
                };
            case 'Completed':
                return {
                    bg: 'bg-primary/10 border-primary/20 text-primary',
                    label: 'Completed'
                };
            default:
                return {
                    bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
                    label: status
                };
        }
    };

    const styles = getStatusStyles(status);
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles.bg}`}>
            <span>{styles.label}</span>
        </div>
    );
}

export default function UserCarBookingPage() {
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{ employeeName: string; dateOfUse: string; timeSlot?: string; destination?: string; purpose?: string }>();
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
    const [bookingToCancel, setBookingToCancel] = useState<CarBooking | null>(null); // Fixed typo here
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

        try {
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
        } catch (error) {
            toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
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
        <div className="mx-auto max-w-7xl space-y-12 px-2 sm:px-6 py-10 min-h-screen bg-transparent relative">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-primary/5 blur-[120px] rounded-full opacity-50 pointer-events-none" />
            <div className="absolute bottom-40 left-0 -z-10 w-80 h-80 bg-orange-500/5 blur-[100px] rounded-full opacity-30 pointer-events-none" />

            {/* Premium Page Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">Book a Vehicle</h1>
                    </div>
                    <p className="text-muted-foreground font-medium max-w-md">Request a vehicle for your mission or manage your active bookings.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => { load(); toast({ title: 'System Updated', description: 'Booking status synchronized.' }); }}
                        className="h-12 px-6 rounded-xl font-bold bg-secondary/80 backdrop-blur-md hover:bg-secondary transition-all flex items-center gap-2 border border-border/10 shadow-lg"
                    >
                        <span>Refresh Data</span>
                    </Button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Form */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-5"
                >
                    <div className="relative glass rounded-[40px] border border-border/20 bg-secondary/10 p-8 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <h2 className="text-xl font-bold tracking-tight uppercase">Reservation Details</h2>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Employee Name</label>
                                    <div className="relative">
                                        <Input className="h-12 bg-background/40 backdrop-blur-sm border-border/10 rounded-2xl focus:ring-primary focus:border-primary transition-all" placeholder="Enter full name" {...register('employeeName', { required: true })} />
                                    </div>
                                    {errors.employeeName && <p className="text-[10px] font-bold text-destructive ml-1">Requester name is required</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Date of Use</label>
                                        <div className="relative">
                                            <Input type="date" className="h-12 bg-background/40 backdrop-blur-sm border-border/10 rounded-2xl focus:ring-primary focus:border-primary transition-all" {...register('dateOfUse', { required: true })} />
                                        </div>
                                        {errors.dateOfUse && <p className="text-[10px] font-bold text-destructive ml-1">Date is required</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Time Slot</label>
                                        <div className="relative">
                                            <Input className="h-12 bg-background/40 backdrop-blur-sm border-border/10 rounded-2xl focus:ring-primary focus:border-primary transition-all" placeholder="e.g., 08:30 am" {...register('timeSlot', { required: true })} />
                                        </div>
                                        {errors.timeSlot && <p className="text-[10px] font-bold text-destructive ml-1">Slot is required</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Destination</label>
                                    <div className="relative">
                                        <Input className="h-12 bg-background/40 backdrop-blur-sm border-border/10 rounded-2xl focus:ring-primary focus:border-primary transition-all" placeholder="Where are you heading?" {...register('destination')} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Purpose of Trip</label>
                                    <div className="relative">
                                        <Input className="h-24 items-start pt-3 bg-background/40 backdrop-blur-sm border-border/10 rounded-3xl focus:ring-primary focus:border-primary transition-all" placeholder="Why is this vehicle needed?" {...register('purpose')} />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-orange-600 text-white font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting Request...' : 'Submit Booking'}
                            </Button>
                        </form>
                    </div>
                </motion.div>

                {/* Right Column: Active & History */}
                <div className="lg:col-span-7 space-y-12">
                    {/* Recent Bookings */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">Active Monitor</h2>
                            </div>
                            <Badge variant="outline" className="bg-secondary/40 text-[11px] font-bold px-3 py-0.5 rounded-full border-border/10">
                                {rows.length} {rows.length === 1 ? 'Booking' : 'Bookings'}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence>
                                {rows.map((b, bIdx) => {
                                    const carInfo = assignedMap[b.id];
                                    return (
                                        <motion.div
                                            key={b.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: bIdx * 0.1 }}
                                            className="relative group bg-secondary/5 hover:bg-secondary/10 border border-border/10 rounded-[32px] p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
                                        >
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="text-lg font-bold tracking-tight">{b.date_of_use} • {b.time_slot}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                                <span className="text-sm font-medium">{b.destination || 'Internal Mission'}</span>
                                                            </div>
                                                        </div>
                                                        <StatusPill status={b.status} />
                                                    </div>

                                                    <div className="flex flex-wrap gap-4 items-center">
                                                        {carInfo && (
                                                            <div className="flex items-center gap-2.5 text-sm font-medium text-primary bg-primary/5 p-3 rounded-2xl border border-primary/10">
                                                                <span className="font-bold underline decoration-primary/30 underline-offset-4">
                                                                    {carInfo.label} {carInfo.plate ? `(${carInfo.plate})` : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {b.purpose && (
                                                            <div className="text-[11px] font-bold text-muted-foreground italic bg-secondary/10 px-3 py-2 rounded-xl">
                                                                "{b.purpose}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col justify-center items-end gap-3 min-w-[200px]">
                                                    {canCancelBooking(b) && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="w-full h-10 rounded-xl font-bold bg-white/5 hover:bg-destructive hover:text-white transition-all border-white/5"
                                                            onClick={() => handleCancelClick(b)}
                                                            disabled={cancellingId === b.id}
                                                        >
                                                            {cancellingId === b.id ? 'Processing...' : 'Cancel Request'}
                                                        </Button>
                                                    )}
                                                    {b.status === 'Approved' && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="w-full h-10 rounded-xl font-bold bg-primary text-white hover:bg-orange-600 transition-all border-none"
                                                            onClick={async () => {
                                                                setReturningId(b.id);
                                                                try {
                                                                    const res = await fetch('/api/car-bookings/complete', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ bookingId: b.id }),
                                                                        credentials: 'include'
                                                                    });
                                                                    if ((await res.json()).success) {
                                                                        toast({ title: 'System Updated', description: 'Vehicle return tracked successfully.' });
                                                                        load();
                                                                    }
                                                                } finally {
                                                                    setReturningId(null);
                                                                }
                                                            }}
                                                            disabled={returningId === b.id}
                                                        >
                                                            {returningId === b.id ? 'Finalizing...' : 'I returned the car'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {rows.length === 0 && (
                                <div className="text-center py-20 bg-secondary/5 rounded-[40px] border border-border/10 border-dashed">
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center opacity-40">No active vehicle reservations</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* History */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-1.5 h-6 bg-muted rounded-full" />
                            <h2 className="text-xl font-bold tracking-tight text-muted-foreground uppercase">Past History</h2>
                        </div>

                        <div className="glass rounded-[40px] bg-secondary/5 border border-border/20 p-8 space-y-8">
                            <div className="space-y-4">
                                {historyLoading && [0, 1, 2].map(i => (
                                    <div key={i} className="h-24 bg-secondary/10 rounded-2xl animate-pulse border border-border/5" />
                                ))}
                                {!historyLoading && history.map((b, bIdx) => {
                                    const carInfo = assignedMap[b.id];
                                    return (
                                        <motion.div
                                            key={b.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: bIdx * 0.05 }}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-[24px] bg-background/20 border border-border/5 hover:bg-background/40 transition-colors"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold tracking-tight uppercase tracking-[0.05em]">{b.date_of_use} <span className="text-muted-foreground font-medium ml-1">at {b.time_slot}</span></span>
                                                </div>
                                                <div className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                                                    <span>{b.destination || 'Internal Mission'}</span>
                                                    {carInfo && <span className="text-primary/60">• {carInfo.label}</span>}
                                                </div>
                                            </div>
                                            <StatusPill status={b.status} />
                                        </motion.div>
                                    );
                                })}
                                {!historyLoading && history.length === 0 && (
                                    <p className="text-center py-10 text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-50">Archive is empty</p>
                                )}
                            </div>

                            {/* Pagination */}
                            {historyTotal > historyPageSize && (
                                <div className="flex items-center justify-between pt-4 border-t border-border/5">
                                    <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                                        Monitor {Math.min((historyPage - 1) * historyPageSize + 1, historyTotal)} - {Math.min(historyPage * historyPageSize, historyTotal)} OF {historyTotal}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={historyPage <= 1 || historyLoading}
                                            onClick={() => loadHistoryPage(historyPage - 1)}
                                            className="w-10 h-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary font-bold"
                                        >
                                            ←
                                        </Button>
                                        <div className="text-xs font-bold px-4 bg-primary/10 text-primary h-8 rounded-lg flex items-center">
                                            {historyPage}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={historyPage >= Math.ceil(historyTotal / historyPageSize) || historyLoading}
                                            onClick={() => loadHistoryPage(historyPage + 1)}
                                            className="w-10 h-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary font-bold"
                                        >
                                            →
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Cancel Dialog: Matching Theme */}
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="rounded-[40px] border border-border/20 bg-background/95 backdrop-blur-3xl p-8 max-w-md">
                    <DialogHeader className="space-y-4">
                        <DialogTitle className="text-2xl font-bold tracking-tight text-center uppercase">Cancel Reservation?</DialogTitle>
                        <DialogDescription className="text-center font-medium text-muted-foreground px-4">
                            You are about to cancel your vehicle for <span className="text-foreground font-bold">{bookingToCancel?.date_of_use}</span> at <span className="text-primary font-bold">{bookingToCancel?.time_slot}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cancellation Reason</label>
                            <Select value={cancelReason} onValueChange={setCancelReason}>
                                <SelectTrigger className="h-12 rounded-2xl bg-secondary/10 border-border/10 focus:ring-primary">
                                    <SelectValue placeholder="Select a reason (optional)" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-border/10 bg-background/90 backdrop-blur-xl">
                                    <SelectItem value="Schedule change">Schedule change</SelectItem>
                                    <SelectItem value="Client postponement">Client postponement</SelectItem>
                                    <SelectItem value="Weather/Traffic">Weather/Traffic</SelectItem>
                                    <SelectItem value="No longer needed">No longer needed</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/5">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-xs" onClick={() => setCancelDialogOpen(false)}>
                            Keep It
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-2xl bg-destructive hover:bg-rose-700 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={handleCancelConfirm}
                            disabled={cancellingId !== null}
                        >
                            {cancellingId ? 'Cancelling...' : 'Confirm Cancel'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
    );
}
