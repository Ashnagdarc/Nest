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
// import { RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

function StatusPill({ status, updatedAt }: { status: string; updatedAt?: string }) {
    const color = status === 'Approved' ? 'bg-amber-100 text-amber-700' :
        status === 'Pending' ? 'bg-blue-100 text-blue-700' :
            status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                status === 'Cancelled' ? 'bg-gray-100 text-gray-700' :
                    status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700';
    const rel = updatedAt ? new Date(updatedAt) : undefined;
    return (
        <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${color}`}>{status}</span>
            {rel && <span className="text-xs text-muted-foreground">• updated {(updatedAt || '').slice(11, 16)}Z</span>}
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
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <CardTitle>Manage Car Bookings</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { load(); toast({ title: 'Refreshed', description: 'Data reloaded.' }); }}>Refresh</Button>
            </div>
            {/* Cars Overview */}
            <Card>
                <CardHeader>
                    <CardTitle>Cars Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {sectionLoading.cars && [0, 1, 2].map(i => (
                            <div key={i} className="border rounded overflow-hidden animate-pulse">
                                <div className="h-28 bg-muted" />
                                <div className="p-3">
                                    <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                        {carStatus.map(c => (
                            <div key={c.id} className={`border rounded overflow-hidden ${cardAnim(c.in_use)}`}>
                                <button onClick={() => openCarDialog(c)} className="block w-full">
                                    <div className="relative h-28 w-full bg-card">
                                        {c.image_url ? (
                                            <Image src={c.image_url} alt={c.label} fill className="object-cover" unoptimized />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                                        )}
                                        {/* Status overlay for unavailable cars */}
                                        {(c.status === 'Unavailable' || c.status === 'Maintenance') && (
                                            <div className={`absolute inset-0 flex items-center justify-center ${
                                                c.status === 'Unavailable' 
                                                    ? 'bg-red-500/70 text-white' 
                                                    : 'bg-yellow-500/70 text-white'
                                            }`}>
                                                <span className="font-medium text-sm px-2 py-1 rounded bg-black/20">
                                                    {c.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 text-sm text-left">
                                        <div className="font-medium">{c.label}</div>
                                        <div className="text-muted-foreground text-xs">{c.plate || '—'}</div>
                                        <div className={`text-xs mt-1 ${c.in_use ? 'text-amber-600' : c.status === 'Available' ? 'text-emerald-600' : 'text-gray-500'}`}>{c.in_use ? 'Checked out' : (c.status || 'Unavailable')}</div>
                                    </div>
                                </button>
                                <div className="p-2 border-t flex justify-between items-center">
                                    <span className="text-xs">Status: <span className="font-semibold">{c.status || 'Available'}</span></span>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit Image</Button>
                                        <Button size="sm" variant="outline" onClick={() => { setEditStatusCar(c); setNewStatus(c.status || 'Available'); setEditStatusOpen(true); }}>Edit Status</Button>
                                    </div>
                                </div>
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
                            </div>
                        ))}
                        {!sectionLoading.cars && carStatus.length === 0 && <div className="text-sm text-muted-foreground">No cars</div>}
                    </div>
                </CardContent>
            </Card>

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
                    <Card key={section.key}>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{section.title}</span>
                                <span className="text-sm text-muted-foreground">{section.rows.length}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {sectionLoading[section.key] && [0, 1, 2].map(i => (
                                    <div key={i} className="flex items-center justify-between border rounded p-3 animate-pulse">
                                        <div className="space-y-2 w-full mr-4">
                                            <div className="h-4 bg-muted rounded w-2/3" />
                                            <div className="h-3 bg-muted rounded w-1/2" />
                                        </div>
                                        <div className="h-6 w-24 bg-muted rounded" />
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
                                        <div key={b.id} className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getStatusColor(b.status)}`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                            {b.employee_name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                                            {b.date_of_use}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border">
                                                            {range12h(b.start_time, b.end_time, b.time_slot || '')}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                                        <span className="font-medium">📍 {b.destination}</span>
                                                        {b.purpose && <span className="ml-2 text-gray-500">• {b.purpose}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <StatusPill status={b.status} updatedAt={b.updated_at || undefined} />
                                                        {section.key === 'history' && <ReturnedTag visible={isReturned} />}
                                                        {carInfo && (section.key === 'approved' || section.key === 'history') && (
                                                            <div className="flex items-center gap-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                                                                <span className="text-gray-500">🚗</span>
                                                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                                                    {carInfo.label || '—'} {carInfo.plate ? `(${carInfo.plate})` : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {overlaps > 0 && (
                                                        <div className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                                                            ⚠️ {overlaps} overlap(s) in this slot
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    {section.renderActions(b)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!sectionLoading[section.key] && section.rows.length === 0 && <div className="text-sm text-muted-foreground">No items.</div>}
                            </div>
                            {section.key === 'history' && (
                                <div className="border-t bg-gray-50/50 dark:bg-gray-900/20">
                                    {/* Filter tabs */}
                                    <div className="p-4 border-b bg-white dark:bg-gray-800">
                                        <div className="flex flex-wrap gap-2">
                                            {(['All', 'Completed', 'Rejected', 'Cancelled'] as const).map((filterOption) => {
                                                const getFilterStyles = (filter: string, isActive: boolean) => {
                                                    if (isActive) {
                                                        switch (filter) {
                                                            case 'Completed': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
                                                            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
                                                            case 'Cancelled': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700';
                                                            default: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700';
                                                        }
                                                    }
                                                    return 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
                                                };
                                                
                                                return (
                                                    <Button
                                                        key={filterOption}
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={sectionLoading.history}
                                                        onClick={() => {
                                                            setHistoryPage(1);
                                                            loadHistoryPage(1, filterOption);
                                                        }}
                                                        className={`${getFilterStyles(filterOption, historyFilter === filterOption)} font-medium transition-all duration-200`}
                                                    >
                                                        {filterOption}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Pagination controls */}
                                    {historyTotal > historyPageSize && (
                                        <div className="p-4 bg-white dark:bg-gray-800 border-t">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                    Showing <span className="text-gray-900 dark:text-gray-100">{Math.min((historyPage - 1) * historyPageSize + 1, historyTotal)}</span> to <span className="text-gray-900 dark:text-gray-100">{Math.min(historyPage * historyPageSize, historyTotal)}</span> of <span className="text-gray-900 dark:text-gray-100">{historyTotal}</span> entries
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={historyPage <= 1 || sectionLoading.history}
                                                        onClick={() => loadHistoryPage(historyPage - 1, historyFilter)}
                                                        className="px-3 py-1.5 text-xs font-medium"
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
                                                                    disabled={sectionLoading.history}
                                                                    onClick={() => loadHistoryPage(pageNum, historyFilter)}
                                                                    className={`w-8 h-8 p-0 text-xs font-medium ${
                                                                        historyPage === pageNum 
                                                                            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                                                    }`}
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
                                                        className="px-3 py-1.5 text-xs font-medium"
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
