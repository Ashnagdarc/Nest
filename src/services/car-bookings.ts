import { apiGet, apiPost } from '@/lib/apiClient';
import type { CarBooking, PaginatedCarBookings } from '@/types/car-bookings';

type BookingEnvelope = {
    success: boolean;
    booking?: CarBooking | null;
    items?: unknown[];
    warnings?: string[];
    user_message?: string | null;
    error_code?: string | null;
    correlation_id?: string;
    error?: string;
};

export async function createCarBooking(payload: {
    employeeName: string;
    dateOfUse: string;
    timeSlot?: string;
    preferredCarId?: string;
    startTime?: string; // HH:MM
    endTime?: string;   // HH:MM
    destination?: string;
    purpose?: string;
}): Promise<{ success: boolean; booking?: CarBooking | null; error?: string; user_message?: string | null; correlation_id?: string }> {
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
    const envelope = (json || {}) as BookingEnvelope;
    if (!res.ok || envelope.success === false) {
        const errorMsg = envelope.user_message || envelope.error || res.statusText || 'Request failed';
        return {
            success: false,
            error: errorMsg,
            user_message: envelope.user_message || null,
            correlation_id: envelope.correlation_id,
        };
    }
    return {
        success: true,
        booking: envelope.booking || null,
        user_message: envelope.user_message || null,
        correlation_id: envelope.correlation_id,
    };
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

export async function approveCarBooking(bookingId: string): Promise<{ success: boolean; error?: string; user_message?: string | null; correlation_id?: string }> {
    try {
        const res = await apiPost<BookingEnvelope>('/api/car-bookings/approve', { bookingId });
        return { success: !!res.success, error: res.error, user_message: res.user_message, correlation_id: res.correlation_id };
    } catch (error: any) {
        let parsed: BookingEnvelope | null = null;
        try { parsed = JSON.parse(error?.message || '{}'); } catch { parsed = null; }
        return {
            success: false,
            error: parsed?.user_message || parsed?.error || 'Failed to approve booking',
            user_message: parsed?.user_message || null,
            correlation_id: parsed?.correlation_id,
        };
    }
}

export async function rejectCarBooking(bookingId: string, reason?: string): Promise<{ success: boolean; error?: string; user_message?: string | null; correlation_id?: string }> {
    try {
        const res = await apiPost<BookingEnvelope>('/api/car-bookings/reject', { bookingId, reason });
        return { success: !!res.success, error: res.error, user_message: res.user_message, correlation_id: res.correlation_id };
    } catch (error: any) {
        let parsed: BookingEnvelope | null = null;
        try { parsed = JSON.parse(error?.message || '{}'); } catch { parsed = null; }
        return {
            success: false,
            error: parsed?.user_message || parsed?.error || 'Failed to reject booking',
            user_message: parsed?.user_message || null,
            correlation_id: parsed?.correlation_id,
        };
    }
}

export async function cancelCarBooking(bookingId: string, reason?: string): Promise<{ success: boolean; error?: string; user_message?: string | null; correlation_id?: string }> {
    try {
        const res = await apiPost<BookingEnvelope>('/api/car-bookings/cancel', { bookingId, reason });
        return { success: !!res.success, error: res.error, user_message: res.user_message, correlation_id: res.correlation_id };
    } catch (error: any) {
        let parsed: BookingEnvelope | null = null;
        try { parsed = JSON.parse(error?.message || '{}'); } catch { parsed = null; }
        return {
            success: false,
            error: parsed?.user_message || parsed?.error || 'Failed to cancel booking',
            user_message: parsed?.user_message || null,
            correlation_id: parsed?.correlation_id,
        };
    }
}

export async function listCars(): Promise<{ data: Array<{ id: string; label: string; plate?: string }> }> {
    return apiGet('/api/cars');
}

export async function assignCar(bookingId: string, carId: string): Promise<{ success: boolean; error?: string }> {
    return apiPost('/api/car-bookings/assign-car', { bookingId, carId });
}
