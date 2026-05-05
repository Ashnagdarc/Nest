export type UserBusStopKey = 'home' | 'work';

export interface LiveLocationRow {
    user_id: string;
    lat: number;
    lng: number;
    accuracy_m: number | null;
    is_sharing: boolean;
    updated_at: string;
}

export interface LiveLocationMarker {
    userId: string;
    lat: number;
    lng: number;
    accuracyM: number | null;
    updatedAt: string;
}

export interface UserBusStopRow {
    user_id: string;
    stop_key: UserBusStopKey;
    stop_name: string | null;
    lat: number;
    lng: number;
    radius_m: number;
    created_at?: string;
    updated_at: string;
}
