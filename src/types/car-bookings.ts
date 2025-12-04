export interface CarBooking {
    id: string;
    requester_id: string | null;
    employee_name: string;
    date_of_use: string; // ISO date
    time_slot?: string | null;
    start_time?: string | null; // HH:MM:SS
    end_time?: string | null;   // HH:MM:SS
    destination: string | null;
    purpose: string | null;
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejection_reason: string | null;
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancelled_reason?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Car {
    id: string;
    label: string;
    plate: string | null;
    // active: boolean; (removed, use status instead)
    status: string;
    created_at: string;
    updated_at: string;
}

export interface CarAssignment {
    booking_id: string;
    car_id: string;
    created_at: string;
}

export interface PaginatedCarBookings {
    data: CarBooking[];
    total: number;
}
