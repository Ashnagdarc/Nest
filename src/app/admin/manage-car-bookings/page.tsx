"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listCarBookings, approveCarBooking, rejectCarBooking, assignCar, listCars } from '@/services/car-bookings';
import type { CarBooking } from '@/types/car-bookings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Car, AlertCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

function StatusPill({ status, updatedAt }: { status: string; updatedAt?: string }) {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Approved':
                return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: '• Approved' };
            case 'Pending':
                return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: '◦ Pending' };
            case 'Rejected':
                return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: '✕ Rejected' };
            case 'Cancelled':
                return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: '— Cancelled' };
            case 'Completed':
                return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: '✓ Completed' };
            default:
                return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: status };
        }
    };
    
    const styles = getStatusStyles(status);
    return (
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${styles.bg} ${styles.text}`}>
            <span>{styles.label}</span>
            {updatedAt && <span className="opacity-60">({(updatedAt || '').slice(11, 16)}Z)</span>}
        </div>
    );
}

function ReturnedTag({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 ml-2">Returned</span>;
}

// helper animation class toggle based on in_use
function cardAnim(inUse: boolean) {
    return inUse ? 'transition-opacity duration-500 opacity-50' : 'transition-opacity duration-500 opacity-100';
}

export default function AdminManageCarBookingsPage() {
    const [pending, setPending] = useState<CarBooking[]>([]);
    const [approved, setApproved] = useState<CarBooking[]>([]);
    const [history, setHistory] = useState<CarBooking[]>([]);
    const [cars, setCars] = useState<Array<{ id: string; label: string; plate?: string }>>([]);
    const [carStatus, setCarStatus] = useState<Array<{ id: string; label: string; plate?: string; status?: string; in_use: boolean; image_url?: string }>>([]);
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
        
        try {
            const [p, a] = await Promise.all([
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
            const status = await apiGet<{ data: Array<{ id: string; label: string; plate?: string; in_use: boolean; image_url?: string }> }>(`/api/cars/status`);
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

    const bySlot = (rows: CarBooking[]) => {
        const m = new Map<string, CarBooking[]>();
        for (const r of rows) {
            const label = r.start_time && r.end_time ? `${r.start_time.slice(0, 5)}-${r.end_time.slice(0, 5)}` : (r.time_slot || '');
            const key = `${r.date_of_use}|${label}`;
            const a = m.get(key) || [];
            a.push(r);
            m.set(key, a);
        }
        return m;
    };

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
                    <Select defaultValue={bookingCarMap[b.id]?.car_id} disabled={assigningId === b.id} onValueChange={async (carId) => {
                        setAssigningId(b.id);
                        try {
                            const r = await assignCar(b.id, carId);
                            if (r.conflict) {
                                toast({ title: 'Assignment conflict', description: 'Car is unavailable or already assigned.', variant: 'destructive' });
                            } else {
                                toast({ title: 'Assigned', description: 'Car assigned to booking.' });
                                await load();
                            }
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
                                if (isCheckedOut) statusLabel = '(Checked out)';
                                else if (carStatusText !== 'Available') statusLabel = `(${carStatusText})`;
                                return (
                                    <SelectItem key={c.id} value={c.id} disabled={!isAvailable} title={!isAvailable ? `Car is ${carStatusText.toLowerCase()}` : ''}>
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
                                toast({ title: 'Approval conflict', description: 'Failed to approve booking. Car may already be assigned.', variant: 'destructive' });
                            } else {
                                toast({ title: 'Approved', description: 'Booking approved.' });
                                await load();
                            }
                        } catch {
                            toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
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
                            <Select defaultValue={carInfo?.car_id} disabled={assigningId === b.id} onValueChange={async (carId) => { setAssigningId(b.id); try { const r = await assignCar(b.id, carId); if (r.conflict) { toast({ title: 'Overlap detected', description: 'Assigned car overlaps another approved booking in this slot.', variant: 'destructive' }); } else { toast({ title: 'Reassigned', description: 'Car reassigned to booking.' }); await load(); } } finally { setAssigningId(null); } }}>
                                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select car" /></SelectTrigger>
                                <SelectContent>
                                    {cars.map(c => <SelectItem key={c.id} value={c.id}>{c.label}{c.plate ? ` (${c.plate})` : ''}</SelectItem>)}
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
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Bookings</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Car booking approvals and check-ins</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { load(); toast({ title: 'Refreshed', description: 'Data reloaded.' }); }} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                </Button>
            </div>
            {/* Cars Overview */}
            <Card className="border-0 shadow-sm bg-white dark:bg-gray-900">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">Vehicles</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sectionLoading.cars && [0, 1, 2].map(i => (
                            <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
                                <div className="h-32 bg-gray-100 dark:bg-gray-800" />
                                <div className="p-3">
                                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                        {carStatus.map(c => (
                            <div key={c.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 ${cardAnim(c.in_use)}`}>
                                <button onClick={() => openCarDialog(c)} className="block w-full">
                                    <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-800">
                                        {c.image_url ? (
                                            <Image src={c.image_url} alt={c.label} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                <Car className="w-6 h-6" />
                                            </div>
                                        )}
                                        {/* Status overlay */}
                                        {(c.status === 'Unavailable' || c.status === 'Maintenance') && (
                                            <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm ${
                                                c.status === 'Unavailable' 
                                                    ? 'bg-red-600/80' 
                                                    : 'bg-yellow-500/80'
                                            }`}>
                                                <span className="text-white text-xs font-semibold px-2 py-1 rounded-md bg-black/30">
                                                    {c.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 space-y-2">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{c.label}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{c.plate || '—'}</div>
                                        <div className={`text-xs font-medium ${
                                            c.in_use ? 'text-amber-600 dark:text-amber-400' : 
                                            c.status === 'Available' ? 'text-green-600 dark:text-green-400' : 
                                            'text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {c.in_use ? 'Checked out' : (c.status || 'Unavailable')}
                                        </div>
                                    </div>
                                </button>
                                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-800/50">
                                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openEdit(c)}>Edit</Button>
                                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditStatusCar(c); setNewStatus(c.status || 'Available'); setEditStatusOpen(true); }}>Status</Button>
                                </div>
                            </div>
                        ))}
                        {!sectionLoading.cars && carStatus.length === 0 && <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">No vehicles available</div>}
                    </div>
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

            {sections.map(section => {
                const grouped = bySlot(section.rows);
                return (
                    <Card key={section.key} className="border-0 shadow-sm bg-white dark:bg-gray-900">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold">{section.title}</CardTitle>
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {section.rows.length}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {sectionLoading[section.key] && [0, 1, 2].map(i => (
                                    <div key={i} className="flex items-center justify-between border border-gray-100 dark:border-gray-800 rounded-lg p-4 animate-pulse">
                                        <div className="space-y-2 w-full mr-4">
                                            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                                            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                                        </div>
                                        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
                                    </div>
                                ))}
                                {section.rows.map(b => {
                                    const label = b.start_time && b.end_time ? `${b.start_time.slice(0, 5)}-${b.end_time.slice(0, 5)}` : (b.time_slot || '');
                                    const overlaps = (grouped.get(`${b.date_of_use}|${label}`) || []).filter(x => x.status === 'Approved' && x.id !== b.id).length;
                                    const isReturned = (section.key === 'history' && b.status === 'Completed');
                                    const carInfo = bookingCarMap[b.id];
                                    const getStatusColor = (status: string) => {
                                        switch (status) {
                                            case 'Completed': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                                            case 'Rejected': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
                                            case 'Cancelled': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                                            case 'Pending': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                                            case 'Approved': return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
                                            default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
                                        }
                                    };
                                    
                                    return (
                                        <div key={b.id} className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all duration-200 ${getStatusColor(b.status)}`}>
                                            <div className="space-y-3">
                                                {/* Header: Name and Date */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-base truncate">
                                                            {b.employee_name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                            {b.date_of_use}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <StatusPill status={b.status} updatedAt={b.updated_at || undefined} />
                                                    </div>
                                                </div>

                                                {/* Details Section */}
                                                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    {/* Time Slot */}
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400 min-w-fit">Time:</span>
                                                        <span className="font-medium text-gray-900 dark:text-gray-100 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 text-xs">
                                                            {range12h(b.start_time, b.end_time, b.time_slot || '')}
                                                        </span>
                                                    </div>

                                                    {/* Destination */}
                                                    <div className="flex items-start gap-2 text-sm">
                                                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-gray-900 dark:text-gray-100">{b.destination}</div>
                                                            {b.purpose && <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{b.purpose}</div>}
                                                        </div>
                                                    </div>

                                                    {/* Car Assignment */}
                                                    {carInfo && (section.key === 'approved' || section.key === 'history') && (
                                                        <div className="flex items-center gap-2 text-sm px-2 py-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                                            <Car className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                                            <span className="font-medium text-blue-700 dark:text-blue-300 text-xs">
                                                                {carInfo.label || '—'}{carInfo.plate ? ` • ${carInfo.plate}` : ''}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Overlap Warning */}
                                                    {overlaps > 0 && (
                                                        <div className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                            <span className="font-medium">{overlaps} time slot conflict{overlaps !== 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}

                                                    {/* Returned Tag */}
                                                    {isReturned && (
                                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-xs font-medium text-green-700 dark:text-green-300">
                                                            ✓ Returned
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions Section */}
                                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                                    {section.renderActions(b)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!sectionLoading[section.key] && section.rows.length === 0 && <div className="text-sm text-muted-foreground">No items.</div>}
                            </div>
                            {section.key === 'history' && (
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    {/* Filter Section */}
                                    <div className="mb-4">
                                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Filter</div>
                                        <div className="flex flex-wrap gap-2">
                                            {(['All', 'Completed', 'Rejected', 'Cancelled'] as const).map((filterOption) => {
                                                const isActive = historyFilter === filterOption;
                                                return (
                                                    <Button
                                                        key={filterOption}
                                                        size="sm"
                                                        variant={isActive ? "default" : "outline"}
                                                        disabled={sectionLoading.history}
                                                        onClick={() => {
                                                            setHistoryPage(1);
                                                            loadHistoryPage(1, filterOption);
                                                        }}
                                                        className="text-xs"
                                                    >
                                                        {filterOption}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pagination Section */}
                                    {historyTotal > historyPageSize && (
                                        <div className="pt-4 space-y-3">
                                            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                                Showing <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.min((historyPage - 1) * historyPageSize + 1, historyTotal)}</span> of <span className="font-semibold text-gray-900 dark:text-gray-100">{historyTotal}</span>
                                            </div>
                                            <div className="flex items-center justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={historyPage <= 1 || sectionLoading.history}
                                                        onClick={() => loadHistoryPage(historyPage - 1, historyFilter)}
                                                        className="text-xs"
                                                    >
                                                        ← Prev
                                                    </Button>
                                                    <div className="flex items-center gap-0.5 mx-1">
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
                                                                    disabled={sectionLoading.history}
                                                                    onClick={() => loadHistoryPage(pageNum, historyFilter)}
                                                                    className="w-8 h-8 p-0 text-xs font-medium"
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            );
                                                        })}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={historyPage >= Math.ceil(historyTotal / historyPageSize) || sectionLoading.history}
                                                        onClick={() => loadHistoryPage(historyPage + 1, historyFilter)}
                                                        className="text-xs"
                                                    >
                                                        Next →
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
