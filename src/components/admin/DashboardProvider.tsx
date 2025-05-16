import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/hooks/use-user';

type SubscriptionStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

type RealtimePayload = {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: any;
    old?: any;
    table: string;
};

type DashboardContextValue = {
    lastUpdated: Date | null;
    updateMessage: string | null;
    refreshTrigger: number;
    hasUserInteracted: boolean;
    refreshData: () => void;
    playNotificationSound: () => void;
};

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}

interface DashboardProviderProps {
    children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
    const supabase = createClient();
    const { toast } = useToast();
    const { user } = useUser();
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio in useEffect
    useEffect(() => {
        audioRef.current = new Audio('/sounds/notification.mp3');
    }, []);

    // Add effect to track user interaction
    useEffect(() => {
        const handleUserInteraction = () => {
            setHasUserInteracted(true);
            // Remove listeners after first interaction
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };

        window.addEventListener('click', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        return () => {
            window.removeEventListener('click', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };
    }, []);

    // Set up real-time subscriptions
    useEffect(() => {
        if (!user) return;

        // Comprehensive channel for all tables
        const dashboardChannel = supabase
            .channel('admin-dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gears' }, (payload: RealtimePayload) => {
                handleRealtimeUpdate(payload, 'gears');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gear_requests' }, (payload: RealtimePayload) => {
                handleRealtimeUpdate(payload, 'gear_requests');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: RealtimePayload) => {
                handleRealtimeUpdate(payload, 'profiles');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, (payload: RealtimePayload) => {
                handleRealtimeUpdate(payload, 'maintenance');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gear_activity_log' }, (payload: RealtimePayload) => {
                handleRealtimeUpdate(payload, 'gear_activity_log');
            })
            .subscribe((status: SubscriptionStatus) => {
                if (status === 'SUBSCRIBED') {
                    toast({
                        title: "Real-time updates active",
                        description: "Dashboard will update automatically",
                        variant: "default",
                    });
                } else if (status === 'CHANNEL_ERROR') {
                    toast({
                        title: "Realtime connection error",
                        description: "Unable to connect to real-time updates",
                        variant: "destructive",
                    });
                }
            });

        return () => {
            supabase.removeChannel(dashboardChannel);
        };
    }, [supabase, toast, user]);

    const handleRealtimeUpdate = (payload: RealtimePayload, table: string) => {
        // Trigger a refresh of the related components
        setRefreshTrigger(prev => prev + 1);
        setLastUpdated(new Date());

        // Create a meaningful update message based on the table and action
        let message = '';
        const eventType = payload.eventType;

        switch (table) {
            case 'gears':
                const gearName = payload.new?.name || 'Unknown gear';
                message = eventType === 'INSERT'
                    ? `New gear "${gearName}" added`
                    : eventType === 'UPDATE'
                        ? `Gear "${gearName}" updated`
                        : 'Gear removed from inventory';
                break;
            case 'gear_requests':
                message = eventType === 'INSERT'
                    ? 'New gear request received'
                    : eventType === 'UPDATE'
                        ? `Request status changed to ${payload.new?.status || 'unknown'}`
                        : 'Request removed';
                break;
            case 'profiles':
                message = eventType === 'INSERT'
                    ? 'New user joined'
                    : eventType === 'UPDATE'
                        ? 'User profile updated'
                        : 'User account removed';
                break;
            case 'maintenance':
                message = eventType === 'INSERT'
                    ? 'New maintenance scheduled'
                    : eventType === 'UPDATE'
                        ? 'Maintenance record updated'
                        : 'Maintenance record removed';
                break;
            case 'gear_activity_log':
                message = 'New activity recorded';
                break;
            default:
                message = 'Data updated';
        }

        setUpdateMessage(message);

        // Play notification sound if user has interacted with the page
        if (hasUserInteracted) {
            playNotificationSound();
        }
    };

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(error => {
                console.error("Error playing notification sound:", error);
            });
        }
    };

    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const value: DashboardContextValue = {
        lastUpdated,
        updateMessage,
        refreshTrigger,
        hasUserInteracted,
        refreshData,
        playNotificationSound
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
} 