"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { listCarBookings, approveCarBooking, rejectCarBooking, assignCar, listCars } from '@/services/car-bookings';
import type { CarBooking, PaginatedCarBookings } from '@/types/car-bookings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

function StatusPill({ status, updatedAt }: { status: string; updatedAt?: string }) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Approved':
                return {
                    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                    icon: <CheckCircle2 className="w-3 h-3" />,
                    label: 'Approved'
                };
            case 'Pending':
                return {
                    bg: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
                    icon: <Clock className="w-3 h-3" />,
                    label: 'Pending'
                };
            case 'Rejected':
                return {
                    bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
                    icon: <XCircle className="w-3 h-3" />,
                    label: 'Rejected'
                };
            case 'Cancelled':
                return {
                    bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
                    icon: <AlertCircle className="w-3 h-3" />,
                    label: 'Cancelled'
                };
            case 'Completed':
                return {
                    bg: 'bg-primary/10 border-primary/20 text-primary',
                    icon: <CheckCircle2 className="w-3 h-3" />,
                    label: 'Completed'
                };
            default:
                return {
                    bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
                    icon: <AlertCircle className="w-3 h-3" />,
                    label: status
                };
        }
    };

    const styles = getStatusStyles(status);
    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${styles.bg}`}>
            {styles.icon}
            <span>{styles.label}</span>
            {updatedAt && <span className="opacity-40 ml-0.5 tracking-normal lowercase font-medium">({(updatedAt || '').slice(11, 16)})</span>}
        </div>
    );
}

type CarStatusRow = {
    id: string;
    label: string;
    plate?: string;
    status?: string;
    in_use: boolean;
    image_url?: string;
    locked_by_booking_id?: string | null;
    lock_reason?: string | null;
};

function getApiErrorMessage(error: unknown, fallback: string) {
    const raw = error instanceof Error ? error.message : String(error || '');
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error;
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    } catch {
        // Non-JSON response; use raw text below.
    }
    return raw.trim() || fallback;
}



export default function AdminManageCarBookingsPage() {
    const [pending, setPending] = useState<CarBooking[]>([]);
    const [approved, setApproved] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [cars, setCars] = useState<Array<{ id: string; label: string; plate?: string }>>([]);
    const [carStatus, setCarStatus] = useState<CarStatusRow[]>([]);
    const [carDialogOpen, setCarDialogOpen] = useState(false);
    const [carDialogData, setCarDialogData] = useState<{ label: string; plate?: string; rows: CarBooking[] } | null>(null);
    const [editImageOpen, setEditImageOpen] = useState(false);
    const [editCar, setEditCar] = useState<{ id: string; label: string; image_url?: string } | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [editStatusOpen, setEditStatusOpen] = useState(false);
    const [editStatusCar, setEditStatusCar] = useState<{ id: string; label: string; status?: string } | null>(null);
    const [newStatus, setNewStatus] = useState('Available');
    const [bookingCarMap, setBookingCarMap] = useState<Record<string, { label?: string; plate?: string; car_id?: string }>>({});
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [reassignId, setReassignId] = useState<string | null>(null);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyFilter, setHistoryFilter] = useState<'All' | 'Completed' | 'Rejected' | 'Cancelled'>('All');
    const historyPageSize = 10;
    const [sectionLoading, setSectionLoading] = useState<{ pending?: boolean; approved?: boolean; history?: boolean; cars?: boolean }>({});

    const supabase = createClient();
    const { toast } = useToast();

    const load = async () => {
        setSectionLoading({ pending: true, approved: true, history: true, cars: true });

        let p: PaginatedCarBookings = { data: [], total: 0 };
        let a: PaginatedCarBookings = { data: [], total: 0 };

        try {
            [p, a] = await Promise.all([
                listCarBookings({ page: 1, pageSize: 100, status: 'Pending' }).catch(() => ({ data: [], total: 0 })),
                listCarBookings({ page: 1, pageSize: 100, status: 'Approved' }).catch(() => ({ data: [], total: 0 })),
            ]);
            setPending(p.data);
            setApproved(a.data);

            // Load history with pagination
            await loadHistoryPage(historyPage, historyFilter);
        } catch (error) {
            console.error('Failed to load bookings:', error);
            // Set empty states on error
            setPending([]);
            setApproved([]);
        }
        const carRes = await listCars();
        setCars(carRes.data);
        try {
            // fetch assigned cars for pending and approved items
            const idsArr = [
                ...(p.data || []).map((b: CarBooking) => b.id),
                ...(a.data || []).map((b: CarBooking) => b.id),
            ];
            const ids = idsArr.join(',');
            if (ids) {
                const assigned = await apiGet<{ data: Array<{ booking_id: string; car_id?: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(ids)}`);
                const map: Record<string, { car_id?: string; label?: string; plate?: string }> = {};
                (assigned.data || []).forEach((a) => { map[a.booking_id] = { car_id: a.car_id, label: a.label, plate: a.plate }; });
                setBookingCarMap(map);
            } else {
                setBookingCarMap({});
            }
        } catch (error) {
            console.warn('Failed to load car assignments:', error);
            setBookingCarMap({});
        }

        try {
            const status = await apiGet<{ data: CarStatusRow[] }>(`/api/cars/status`);
            setCarStatus(status.data || []);
        } catch (error) {
            console.warn('Failed to load car status:', error);
            setCarStatus([]);
        }

        setSectionLoading(prev => ({ ...prev, pending: false, approved: false, cars: false }));
    };

    const loadHistoryPage = async (page: number, filter: 'All' | 'Completed' | 'Rejected' | 'Cancelled' = 'All') => {
        setSectionLoading(prev => ({ ...prev, history: true }));

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

            // Filter by status if not 'All'
            if (filter !== 'All') {
                allHist = allHist.filter(item => item.status === filter);
            }

            const total = allHist.length;
            const startIndex = (page - 1) * historyPageSize;
            const endIndex = startIndex + historyPageSize;
            const paginatedHist = allHist.slice(startIndex, endIndex);

            setHistory(paginatedHist);
            setHistoryTotal(total);
            setHistoryPage(page);
            setHistoryFilter(filter);

            // Update car assignments for paginated history items
            const histIds = paginatedHist.map(b => b.id).join(',');
            if (histIds && paginatedHist.length > 0) {
                try {
                    const assigned = await apiGet<{ data: Array<{ booking_id: string; car_id?: string; label?: string; plate?: string }> }>(`/api/cars/assigned?bookingIds=${encodeURIComponent(histIds)}`);
                    const newMap: Record<string, { car_id?: string; label?: string; plate?: string }> = {};
                    (assigned.data || []).forEach((a) => { newMap[a.booking_id] = { car_id: a.car_id, label: a.label, plate: a.plate }; });
                    setBookingCarMap(prev => ({ ...prev, ...newMap }));
                } catch (error) {
                    console.warn('Failed to load car assignments for history:', error);
                    // Continue without car assignments - not critical
                }
            }

        } catch (error) {
            console.error('Failed to load history:', error);
            // Set empty state on error
            setHistory([]);
            setHistoryTotal(0);
            setHistoryPage(1);
        } finally {
            setSectionLoading(prev => ({ ...prev, history: false }));
        }
    };

    useEffect(() => { load(); }, []);

    // Realtime refresh when bookings or assignments change
    useEffect(() => {
        const bookings = supabase
            .channel('car_bookings_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_bookings' }, () => {
                load();
            })
            .subscribe();
        const assignments = supabase
            .channel('car_assignment_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'car_assignment' }, () => {
                load();
            })
            .subscribe();
        return () => { supabase.removeChannel(bookings); supabase.removeChannel(assignments); };
    }, []);

    // bySlot removed

    const to12h = (hhmm: string | null | undefined): string => {
        if (!hhmm) return '';
        const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
        const d = new Date(); d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    const range12h = (s?: string | null, e?: string | null, fallback?: string | null) => {
        if (s && e) return `${to12h(s)}-${to12h(e)}`;
        if (fallback) return fallback;
        return '';
    };

    const checkOverlap = (b: CarBooking) => {
        const timeKey = b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : (b.time_slot || '');
        // We'll count overlaps from the relevant set of bookings
        // For simplicity, checking overlaps within pending + approved for this slot
        const allRelevant = [...pending, ...approved];
        return allRelevant.filter(x => {
            const xTimeKey = x.start_time && x.end_time ? `${x.start_time.slice(0, 5)}-${x.end_time.slice(0, 5)}` : (x.time_slot || '');
            return x.id !== b.id && x.date_of_use === b.date_of_use && xTimeKey === timeKey && x.status === 'Approved';
        }).length;
    };

    const openCarDialog = async (car: { id: string; label: string; plate?: string }) => {
        const res = await apiGet<{ data: CarBooking[] }>(`/api/cars/${car.id}/bookings`);
        setCarDialogData({ label: car.label, plate: car.plate, rows: res.data || [] });
        setCarDialogOpen(true);
    };

    const openEdit = (c: { id: string; label: string; image_url?: string }) => {
        setEditCar(c);
        setImageUrl(c.image_url || '');
        setEditImageOpen(true);
    };

    const saveImage = async () => {
        if (!editCar) return;
        await fetch(`/api/cars/${editCar.id}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl }), credentials: 'include' });
        setEditImageOpen(false);
        load();
    };

    const sections: Array<{ key: 'pending' | 'approved' | 'history'; title: string; rows: CarBooking[]; renderActions: (b: CarBooking) => JSX.Element }> = [
        {
            key: 'pending',
            title: 'Pending Approvals',
            rows: pending,
            renderActions: (b) => (
                <div className="flex items-center gap-2">
                    <Select value={bookingCarMap[b.id]?.car_id || ''} disabled={assigningId === b.id} onValueChange={async (carId) => {
                        setAssigningId(b.id);
                        try {
                            await assignCar(b.id, carId);
                            toast({ title: 'Assigned', description: 'Car assigned to booking.' });
                            await load();
                        } catch (err) {
                            toast({
                                title: 'Assignment blocked',
                                description: getApiErrorMessage(err, 'Car is unavailable or still checked out.'),
                                variant: 'destructive'
                            });
                        } finally {
                            setAssigningId(null);
                        }
                    }}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Assign car" /></SelectTrigger>
                        <SelectContent>
                            {cars.map(c => {
                                const statusObj = carStatus.find(cs => cs.id === c.id);
                                const isCheckedOut = statusObj?.in_use;
                                const carStatusText = statusObj?.status || 'Unavailable';
                                const isAvailable = carStatusText === 'Available' && !isCheckedOut;
                                let statusLabel = '';
                                if (isCheckedOut) statusLabel = '(Checked out - return pending)';
                                else if (carStatusText !== 'Available') statusLabel = `(${carStatusText})`;
                                const unavailableTitle = statusObj?.lock_reason || `Car is ${carStatusText.toLowerCase()}`;
                                return (
                                    <SelectItem key={c.id} value={c.id} disabled={!isAvailable} title={!isAvailable ? unavailableTitle : ''}>
                                        {c.label}{c.plate ? ` (${c.plate})` : ''} {statusLabel && <span className={`text-xs ml-2 ${isCheckedOut ? 'text-rose-500' : 'text-gray-500'}`}>{statusLabel}</span>}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!bookingCarMap[b.id]?.car_id || approvingId === b.id} onClick={async () => {
                        setApprovingId(b.id);
                        try {
                            const res = await approveCarBooking(b.id);
                            if (!res?.success) {
                                toast({
                                    title: 'Approval blocked',
                                    description: res.error || 'Failed to approve booking. Car may still be checked out and not yet returned.',
                                    variant: 'destructive'
                                });
                            } else {
                                toast({ title: 'Approved', description: 'Booking approved.' });
                                await load();
                            }
                        } catch (err: any) {
                            toast({
                                title: 'Error',
                                description: getApiErrorMessage(err, 'Failed to approve booking. Car may still be checked out and not yet returned.'),
                                variant: 'destructive'
                            });
                        } finally {
                            setApprovingId(null);
                        }
                    }}>{approvingId === b.id ? 'Approving…' : 'Approve'}</Button>
                    <Button size="sm" variant="destructive" disabled={rejectingId === b.id} onClick={async () => {
                        setRejectingId(b.id);
                        try {
                            await rejectCarBooking(b.id);
                            toast({ title: 'Rejected', description: 'Booking rejected.' });
                            await load();
                        } catch {
                            toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
                        } finally {
                            setRejectingId(null);
                        }
                    }}>{rejectingId === b.id ? 'Rejecting…' : 'Reject'}</Button>
                </div>
            )
        },
        {
            key: 'approved',
            title: 'Pending Check-ins',
            rows: approved,
            renderActions: (b) => {
                const carInfo = bookingCarMap[b.id];
                // After approval, show assigned car; allow optional reassign with audit
                if (reassignId === b.id) {
                    return (
                        <div className="flex items-center gap-2">
                            <Select value={carInfo?.car_id || ''} disabled={assigningId === b.id} onValueChange={async (carId) => {
                                setAssigningId(b.id);
                                try {
                                    await assignCar(b.id, carId);
                                    toast({ title: 'Reassigned', description: 'Car reassigned to booking.' });
                                    await load();
                                } catch (err) {
                                    toast({
                                        title: 'Reassignment blocked',
                                        description: getApiErrorMessage(err, 'Car is unavailable or still checked out.'),
                                        variant: 'destructive'
                                    });
                                } finally {
                                    setAssigningId(null);
                                }
                            }}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select car" /></SelectTrigger>
                                <SelectContent>
                                    {cars.map(c => {
                                        const statusObj = carStatus.find(cs => cs.id === c.id);
                                        const isCheckedOut = statusObj?.in_use && carInfo?.car_id !== c.id; // Allow selecting current car
                                        const carStatusText = statusObj?.status || 'Unavailable';
                                        const isAvailable = carStatusText === 'Available' && !isCheckedOut;
                                        let statusLabel = '';
                                        if (isCheckedOut) statusLabel = '(Checked out - return pending)';
                                        else if (carStatusText !== 'Available') statusLabel = `(${carStatusText})`;
                                        const unavailableTitle = statusObj?.lock_reason || `Car is ${carStatusText.toLowerCase()}`;

                                        return (
                                            <SelectItem key={c.id} value={c.id} disabled={!isAvailable} title={!isAvailable ? unavailableTitle : ''}>
                                                {c.label}{c.plate ? ` (${c.plate})` : ''} {statusLabel && <span className="text-xs ml-2 opacity-70">{statusLabel}</span>}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => setReassignId(null)}>Done</Button>
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Assigned: {carInfo?.label || '—'} {carInfo?.plate ? `(${carInfo.plate})` : ''}</span>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setReassignId(b.id)}>Change</Button>
                    </div>
                );
            }
        },
        {
            key: 'history',
            title: `History - ${historyFilter} (${historyTotal} total)`,
            rows: history,
            renderActions: () => <div className="text-xs text-muted-foreground">—</div>
        },
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-12 px-2 sm:px-6 py-10 min-h-screen bg-transparent relative">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-primary/10 blur-[120px] rounded-full opacity-50 pointer-events-none" />
            <div className="absolute bottom-40 left-0 -z-10 w-80 h-80 bg-orange-500/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

            {/* Premium Page Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">Manage Bookings</h1>
                    </div>
                    <p className="text-muted-foreground font-medium max-w-md">Fleet oversight, approval workflows, and booking history tracking.</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => { load(); toast({ title: 'System Updated', description: 'Fleet status synchronized successfully.' }); }}
                        className="h-12 px-6 rounded-xl font-bold bg-secondary/80 backdrop-blur-md hover:bg-secondary transition-all border border-border/10 shadow-lg"
                    >
                        <span>Refresh Fleet</span>
                    </Button>
                </div>
            </motion.div>

            {/* Cars Overview Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
            >
                <div className="flex items-center gap-2 mb-6 px-1">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <h2 className="text-lg font-bold tracking-tight uppercase text-muted-foreground/80">Active Fleet</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sectionLoading.cars && [0, 1, 2, 3].map(i => (
                        <div key={i} className="rounded-3xl overflow-hidden border border-border/50 animate-pulse bg-secondary/20">
                            <div className="h-44 bg-muted/30" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 bg-muted/30 rounded-lg w-2/3" />
                                <div className="h-4 bg-muted/30 rounded-lg w-1/3" />
                            </div>
                        </div>
                    ))}
                    {!sectionLoading.cars && carStatus.map((c) => (
                        <motion.div
                            key={c.id}
                            whileHover={{ y: -8, transition: { duration: 0.2 } }}
                            className={`group  h-full relative glass rounded-3xl overflow-hidden border border-border/20 bg-secondary/10 flex flex-col ${c.in_use ? 'ring-2 ring-primary/20' : ''}`}
                        >
                            <div className="relative h-48 w-full bg-slate-900/40">
                                {c.image_url ? (
                                    <Image src={c.image_url} alt={c.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                                ) : (
                                    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/20 bg-secondary/5">
                                        <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Fleet Media</span>
                                    </div>
                                )}

                                {/* Status Tags */}
                                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                                    {c.in_use && (
                                        <div className="bg-orange-600 text-[10px] font-bold uppercase text-white px-3 py-1 rounded-full shadow-2xl flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            Checked Out
                                        </div>
                                    )}
                                    {c.status !== 'Available' && (
                                        <div className="bg-rose-600 text-[10px] font-bold uppercase text-white px-3 py-1 rounded-full shadow-2xl">
                                            {c.status}
                                        </div>
                                    )}
                                </div>

                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-5 backdrop-blur-[2px]">
                                    <div className="grid grid-cols-2 gap-3 w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-9 text-xs font-bold rounded-xl bg-white/10 hover:bg-primary hover:text-white backdrop-blur-xl border border-white/10 transition-all"
                                            onClick={() => openEdit(c)}
                                        >
                                            EDIT
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-9 text-xs font-bold rounded-xl bg-white/10 hover:bg-primary hover:text-white backdrop-blur-xl border border-white/10 transition-all"
                                            onClick={() => { setEditStatusCar(c); setNewStatus(c.status || 'Available'); setEditStatusOpen(true); }}
                                        >
                                            STATUS
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 flex flex-col gap-1 flex-1">
                                <button onClick={() => openCarDialog(c)} className="text-left group/btn">
                                    <div className="font-bold text-lg group-hover/btn:text-primary transition-colors line-clamp-1">{c.label}</div>
                                    <div className="text-[11px] font-mono font-bold text-muted-foreground bg-secondary/40 inline-block px-2 py-0.5 rounded-md mt-1 tracking-wider">
                                        {c.plate || 'V-NEST'}
                                    </div>
                                </button>

                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/5">
                                    <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${c.in_use ? 'text-orange-500' : c.status === 'Available' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {c.in_use ? 'CURRENTLY IN TRIP' : c.status || 'OFFLINE'}
                                    </span>
                                    <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_12px] ${c.in_use ? 'bg-orange-500 shadow-orange-500/50 animate-pulse' : c.status === 'Available' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {!sectionLoading.cars && carStatus.length === 0 && (
                        <div className="col-span-full text-center py-20 text-muted-foreground bg-secondary/5 rounded-[40px] border-2 border-dashed border-border/10">
                            <p className="font-bold uppercase tracking-widest opacity-30">No vehicles in fleet</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Edit Status Dialog */}
            <Dialog open={editStatusOpen} onOpenChange={setEditStatusOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Status for {editStatusCar?.label}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Retired">Retired</SelectItem>
                                <SelectItem value="Unavailable">Unavailable</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditStatusOpen(false)}>Cancel</Button>
                            <Button onClick={async () => {
                                if (!editStatusCar) return;
                                await fetch(`/api/cars/${editStatusCar.id}/status`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: newStatus }),
                                    credentials: 'include',
                                });
                                setEditStatusOpen(false);
                                setEditStatusCar(null);
                                setNewStatus('Available');
                                load();
                            }}>Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Image Dialog */}
            <Dialog open={editImageOpen} onOpenChange={setEditImageOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Image for {editCar?.label}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="https://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditImageOpen(false)}>Cancel</Button>
                            <Button onClick={saveImage}>Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog */}
            <Dialog open={carDialogOpen} onOpenChange={setCarDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{carDialogData?.label} {carDialogData?.plate ? `(${carDialogData?.plate})` : ''}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[50vh] overflow-auto">
                        {(carDialogData?.rows || []).map((b: CarBooking) => (
                            <div key={b.id} className="border rounded p-2 text-sm">
                                <div className="font-medium">{b.employee_name} — {b.date_of_use} ({range12h(b.start_time, b.end_time, b.time_slot || '')})</div>
                                <div className="text-xs">Status: {b.status}</div>
                            </div>
                        ))}
                        {(carDialogData?.rows || []).length === 0 && <div className="text-sm text-muted-foreground">No recent bookings</div>}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Active Monitoring Sections */}
            <div className="grid grid-cols-1 gap-12 pt-8">
                {sections.map((section, sIdx) => (
                    <motion.div
                        key={section.key}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 + (sIdx * 0.1) }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-primary rounded-full" />
                                <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">{section.title}</h2>
                            </div>
                            <Badge variant="outline" className="bg-secondary/40 text-[11px] font-bold px-3 py-0.5 rounded-full border-border/10">
                                {section.rows.length} {section.rows.length === 1 ? 'Entry' : 'Entries'}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {sectionLoading[section.key as keyof typeof sectionLoading] && [0, 1].map(i => (
                                <div key={i} className="h-32 bg-secondary/10 rounded-3xl animate-pulse border border-border/10" />
                            ))}

                            {!sectionLoading[section.key as keyof typeof sectionLoading] && section.rows.map((b, bIdx) => {
                                const carInfo = bookingCarMap[b.id];
                                const overlaps = checkOverlap(b);

                                return (
                                    <motion.div
                                        key={b.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: bIdx * 0.05 }}
                                        className="relative group bg-secondary/5 hover:bg-secondary/10 border border-border/10 rounded-[32px] p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
                                    >
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Left Info: Requester & Time */}
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-primary">{b.employee_name.slice(0, 1).toUpperCase()}</span>
                                                            </div>
                                                            <h3 className="text-lg font-bold tracking-tight">{b.employee_name}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-muted-foreground ml-10">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                                                                {b.date_of_use} • {b.time_slot}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <StatusPill status={b.status} updatedAt={b.updated_at} />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-10">
                                                    <div className="flex items-center gap-2.5 text-sm font-medium text-foreground/80 bg-background/40 backdrop-blur-sm p-3 rounded-2xl border border-border/5">
                                                        <span className="line-clamp-1">{b.destination || 'Internal Mission'}</span>
                                                    </div>

                                                    {carInfo && (
                                                        <div className="flex items-center gap-2.5 text-sm font-medium text-primary bg-primary/5 p-3 rounded-2xl border border-primary/10">
                                                            <span className="font-bold underline decoration-primary/30 underline-offset-4">
                                                                {carInfo.label} {carInfo.plate ? `(${carInfo.plate})` : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Critical Warnings */}
                                                {(overlaps > 0 || b.purpose) && (
                                                    <div className="flex flex-wrap gap-2 ml-10">
                                                        {b.purpose && (
                                                            <div className="text-[11px] font-bold text-muted-foreground italic bg-secondary/10 px-3 py-1 rounded-lg">
                                                                "{b.purpose}"
                                                            </div>
                                                        )}
                                                        {overlaps > 0 && (
                                                            <div className="animate-pulse bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                                {overlaps} Slot Conflict
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Actions: Dedicated Box */}
                                            <div className="flex flex-col justify-center items-end gap-3 min-w-[200px]">
                                                {section.renderActions(b)}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {!sectionLoading[section.key as keyof typeof sectionLoading] && section.rows.length === 0 && (
                                <div className="text-center py-20 bg-secondary/5 rounded-[40px] border border-border/10 border-dashed">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No active requests found</p>
                                </div>
                            )}
                        </div>

                        {/* History Specialized Controls */}
                        {section.key === 'history' && (
                            <div className="bg-secondary/10 backdrop-blur-xl rounded-[40px] p-8 border border-border/20 space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="space-y-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Intelligence Filters</span>
                                        <div className="flex flex-wrap gap-2">
                                            {(['All', 'Completed', 'Rejected', 'Cancelled'] as const).map((filterOption) => {
                                                const isActive = historyFilter === filterOption;
                                                return (
                                                    <Button
                                                        key={filterOption}
                                                        size="sm"
                                                        variant={isActive ? "default" : "outline"}
                                                        onClick={() => { setHistoryPage(1); loadHistoryPage(1, filterOption); }}
                                                        className={`rounded-full px-5 font-bold text-xs h-9 transition-all ${isActive ? 'bg-primary hover:bg-primary shadow-lg shadow-primary/20' : 'bg-transparent border-border/10 hover:bg-white/5'}`}
                                                    >
                                                        {filterOption}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {historyTotal > historyPageSize && (
                                        <div className="flex items-center gap-3 bg-background/40 p-2 rounded-2xl border border-border/5">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={historyPage <= 1 || sectionLoading.history}
                                                onClick={() => loadHistoryPage(historyPage - 1)}
                                                className="w-10 h-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary font-bold"
                                            >
                                                ←
                                            </Button>
                                            <div className="text-xs font-bold px-4 bg-primary text-white h-7 rounded-lg flex items-center shadow-lg shadow-primary/20">
                                                PAGE {historyPage}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={historyPage >= Math.ceil(historyTotal / historyPageSize) || sectionLoading.history}
                                                onClick={() => loadHistoryPage(historyPage + 1)}
                                                className="w-10 h-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary font-bold"
                                            >
                                                →
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Global Modals Overlays */}
            <div className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
    );
}
