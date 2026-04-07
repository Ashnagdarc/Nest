import { apiGet, apiPost } from '@/lib/apiClient';
import type { CarBooking, PaginatedCarBookings } from '@/types/car-bookings';

export async function createCarBooking(payload: {
    employeeName: string;
    dateOfUse: string;
    timeSlot?: string;
    startTime?: string; // HH:MM
    endTime?: string;   // HH:MM
    destination?: string;
    purpose?: string;
}): Promise<{ success: boolean; data?: CarBooking; error?: string }> {
    // Handle non-2xx (e.g., 409 overlap) gracefully instead of throwing
    const res = await fetch('/api/car-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
    });
    let json: any = null;
    try { json = await res.json(); } catch {
        // ignore parse error; fall back to status text
    }
    if (!res.ok) {
        const errorMsg = (json && (json.error || json.message)) || res.statusText || 'Request failed';
        return { success: false, error: errorMsg };
    }
    return json as { success: boolean; data?: CarBooking; error?: string };
}

export async function listCarBookings(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    dateOfUse?: string;
    timeSlot?: string;
    startTime?: string;
    endTime?: string;
    carId?: string;
} = {}): Promise<PaginatedCarBookings> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.status) qs.set('status', params.status);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.userId) qs.set('userId', params.userId);
    if (params.dateOfUse) qs.set('dateOfUse', params.dateOfUse);
    if (params.timeSlot) qs.set('timeSlot', params.timeSlot);
    if (params.startTime) qs.set('startTime', params.startTime);
    if (params.endTime) qs.set('endTime', params.endTime);
    if (params.carId) qs.set('carId', params.carId);
    return apiGet(`/api/car-bookings?${qs.toString()}`);
}

export async function approveCarBooking(bookingId: string): Promise<{ success: boolean; error?: string }> {
    return apiPost('/api/car-bookings/approve', { bookingId });
}

export async function rejectCarBooking(bookingId: string, reason?: string): Promise<{ success: boolean }> {
    return apiPost('/api/car-bookings/reject', { bookingId, reason });
}

export async function cancelCarBooking(bookingId: string, reason?: string): Promise<{ success: boolean }> {
    return apiPost('/api/car-bookings/cancel', { bookingId, reason });
}

export async function listCars(): Promise<{ data: Array<{ id: string; label: string; plate?: string }> }> {
    return apiGet('/api/cars');
}

export async function assignCar(bookingId: string, carId: string): Promise<{ success: boolean; error?: string }> {
    return apiPost('/api/car-bookings/assign-car', { bookingId, carId });
}
