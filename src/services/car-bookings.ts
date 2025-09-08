import { apiGet, apiPost } from '@/lib/apiClient';
import type { CarBooking, PaginatedCarBookings } from '@/types/car-bookings';

export async function createCarBooking(payload: {
    employeeName: string;
    dateOfUse: string;
    timeSlot: string;
    destination?: string;
    purpose?: string;
}): Promise<{ success: boolean; data?: CarBooking; error?: string }> {
    return apiPost('/api/car-bookings', payload);
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
    if (params.carId) qs.set('carId', params.carId);
    return apiGet(`/api/car-bookings?${qs.toString()}`);
}

export async function approveCarBooking(bookingId: string): Promise<{ success: boolean }> {
    return apiPost('/api/car-bookings/approve', { bookingId });
}

export async function rejectCarBooking(bookingId: string, reason?: string): Promise<{ success: boolean }> {
    return apiPost('/api/car-bookings/reject', { bookingId, reason });
}

export async function listCars(): Promise<{ data: Array<{ id: string; label: string; plate?: string }> }> {
    return apiGet('/api/cars');
}

export async function assignCar(bookingId: string, carId: string): Promise<{ success: boolean; conflict?: boolean }> {
    return apiPost('/api/car-bookings/assign-car', { bookingId, carId });
}
