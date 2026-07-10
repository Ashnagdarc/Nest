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
import { Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListSkeleton } from '@/components/dashboard/ListSkeleton';
import { PaginationFooter } from '@/components/ui/PaginationFooter';
import { BookingPageHeader } from '@/components/admin/car-bookings/BookingPageHeader';
import { BookingStatsCards } from '@/components/admin/car-bookings/BookingStatsCards';
import { FleetCarCard } from '@/components/admin/car-bookings/FleetCarCard';
import { BookingQueueTable } from '@/components/admin/car-bookings/BookingQueueTable';
import { BookingHistoryTable } from '@/components/admin/car-bookings/BookingHistoryTable';
import { formatTimeRange } from '@/components/admin/car-bookings/booking-status';

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
    const historyPageSize = 5;
    const [sectionLoading, setSectionLoading] = useState<{ pending?: boolean; approved?: boolean; history?: boolean; cars?: boolean }>({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    const supabase = createClient();
    const { toast } = useToast();

    const load = async () => {
        setIsRefreshing(true);
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
        setIsRefreshing(false);
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

    const availableCars = carStatus.filter((c) => c.status === 'Available' && !c.in_use).length;

    const renderPendingActions = (b: CarBooking) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Assign car" /></SelectTrigger>
                <SelectContent>
                    {cars.map(c => {
                        const statusObj = carStatus.find(cs => cs.id === c.id);
                        const isCheckedOut = statusObj?.in_use;
                        const carStatusText = statusObj?.status || 'Unavailable';
                        const isAvailable = carStatusText === 'Available' && !isCheckedOut;
                        let statusLabel = '';
                        if (isCheckedOut) statusLabel = '(Checked out)';
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
            <Button size="sm" className="h-8 px-2.5" disabled={!bookingCarMap[b.id]?.car_id || approvingId === b.id} onClick={async () => {
                setApprovingId(b.id);
                try {
                    const res = await approveCarBooking(b.id);
                    if (!res?.success) {
                        if (res?.correlation_id) {
                            console.error('[Admin Approve Car Booking] correlation_id:', res.correlation_id);
                        }
                        toast({
                            title: 'Approval blocked',
                            description: res.user_message || res.error || 'Failed to approve booking. Car may still be checked out and not yet returned.',
                            variant: 'destructive'
                        });
                    } else {
                        toast({ title: 'Approved', description: 'Booking approved.' });
                        await load();
                    }
                } catch (err: unknown) {
                    toast({
                        title: 'Error',
                        description: getApiErrorMessage(err, 'Failed to approve booking. Car may still be checked out and not yet returned.'),
                        variant: 'destructive'
                    });
                } finally {
                    setApprovingId(null);
                }
            }}>{approvingId === b.id ? 'Approving…' : 'Approve'}</Button>
            <Button size="sm" variant="destructive" className="h-8 px-2.5" disabled={rejectingId === b.id} onClick={async () => {
                setRejectingId(b.id);
                try {
                    const res = await rejectCarBooking(b.id);
                    if (!res.success) {
                        if (res.correlation_id) {
                            console.error('[Admin Reject Car Booking] correlation_id:', res.correlation_id);
                        }
                        toast({ title: 'Error', description: res.user_message || res.error || 'Failed to reject booking', variant: 'destructive' });
                    } else {
                        toast({ title: 'Rejected', description: res.user_message || 'Booking rejected.' });
                    }
                    await load();
                } catch {
                    toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
                } finally {
                    setRejectingId(null);
                }
            }}>{rejectingId === b.id ? 'Rejecting…' : 'Reject'}</Button>
        </div>
    );

    const renderApprovedActions = (b: CarBooking) => {
        const carInfo = bookingCarMap[b.id];
        if (reassignId === b.id) {
            return (
                <div className="flex flex-wrap items-center gap-2">
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
                        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="Select car" /></SelectTrigger>
                        <SelectContent>
                            {cars.map(c => {
                                const statusObj = carStatus.find(cs => cs.id === c.id);
                                const isCheckedOut = statusObj?.in_use && carInfo?.car_id !== c.id;
                                const carStatusText = statusObj?.status || 'Unavailable';
                                const isAvailable = carStatusText === 'Available' && !isCheckedOut;
                                let statusLabel = '';
                                if (isCheckedOut) statusLabel = '(Checked out)';
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
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setReassignId(null)}>Done</Button>
                </div>
            );
        }
        return (
            <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
                <span className="max-w-[160px] truncate">
                    {carInfo?.label || '—'}
                    {carInfo?.plate ? ` (${carInfo.plate})` : ''}
                </span>
                <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => setReassignId(b.id)}>Change</Button>
            </div>
        );
    };

    const renderQueueSection = (
        rows: CarBooking[],
        loading: boolean | undefined,
        renderActions: (b: CarBooking) => JSX.Element,
        emptyLabel: string
    ) => {
        if (loading) return <ListSkeleton rows={3} />;
        if (rows.length === 0) {
            return (
                <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-8 text-center">
                    <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">{emptyLabel}</p>
                </div>
            );
        }
        return (
            <BookingQueueTable
                rows={rows}
                renderActions={renderActions}
                getOverlapCount={checkOverlap}
                assignedCarMap={bookingCarMap}
            />
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 pb-8"
        >
            <BookingPageHeader isRefreshing={isRefreshing} onRefresh={() => void load()} />

            <BookingStatsCards
                pending={pending.length}
                activeTrips={approved.length}
                availableCars={availableCars}
                historyTotal={historyTotal}
                loading={sectionLoading.pending && sectionLoading.approved}
            />

            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>Active fleet</CardTitle>
                            <CardDescription>Vehicle availability and quick maintenance actions.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="rounded-full font-normal">
                            {carStatus.length} vehicles
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {sectionLoading.cars ? (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
                            ))}
                        </div>
                    ) : carStatus.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-12 text-center text-sm text-muted-foreground">
                            No vehicles in fleet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {carStatus.map((c) => (
                                <FleetCarCard
                                    key={c.id}
                                    car={c}
                                    onViewBookings={(car) => void openCarDialog(car)}
                                    onEditImage={(car) => openEdit(car)}
                                    onEditStatus={(car) => {
                                        setEditStatusCar(car);
                                        setNewStatus(car.status || 'Available');
                                        setEditStatusOpen(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>Pending approvals</CardTitle>
                            <CardDescription>Assign a car, then approve or reject each request.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="rounded-full font-normal">
                            {pending.length} pending
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {renderQueueSection(pending, sectionLoading.pending, renderPendingActions, 'No pending booking requests.')}
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <CardTitle>Active trips</CardTitle>
                            <CardDescription>Approved bookings awaiting vehicle return.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="rounded-full font-normal">
                            {approved.length} active
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {renderQueueSection(approved, sectionLoading.approved, renderApprovedActions, 'No active trips right now.')}
                </CardContent>
            </Card>

            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Booking history</CardTitle>
                            <CardDescription>{historyTotal} total records</CardDescription>
                        </div>
                        <Select
                            value={historyFilter}
                            onValueChange={(value) => {
                                const filter = value as typeof historyFilter;
                                setHistoryPage(1);
                                void loadHistoryPage(1, filter);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All statuses</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                    {sectionLoading.history ? (
                        <ListSkeleton rows={3} />
                    ) : history.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-8 text-center">
                            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No history records for this filter.</p>
                        </div>
                    ) : (
                        <BookingHistoryTable rows={history} bookingCarMap={bookingCarMap} />
                    )}
                    {historyTotal > 0 && (
                        <PaginationFooter
                            page={historyPage}
                            pageSize={historyPageSize}
                            total={historyTotal}
                            onPageChange={(page) => void loadHistoryPage(page, historyFilter)}
                            itemLabel="record"
                            disabled={sectionLoading.history}
                        />
                    )}
                </CardContent>
            </Card>

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
                                <SelectItem value="In Service" disabled>In Service</SelectItem>
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
                                <div className="font-medium">{b.employee_name} — {b.date_of_use} ({formatTimeRange(b.start_time, b.end_time, b.time_slot || '')})</div>
                                <div className="text-xs">Status: {b.status}</div>
                            </div>
                        ))}
                        {(carDialogData?.rows || []).length === 0 && <div className="text-sm text-muted-foreground">No recent bookings</div>}
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
