import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/apiClient';

// Types from the check-in page
export type Gear = {
    id: string;
    status: string;
    checked_out_to: string;
    due_date?: string;
    name?: string;
    category?: string;
    current_request_id?: string | null;
    last_checkout_date?: string | null;
    image_url?: string | null;
};

export type ProcessedGear = {
    id: string;
    name: string;
    category: string;
    status: string;
    checked_out_to: string | null;
    current_request_id: string | null;
    last_checkout_date: string | null;
    due_date: string | null;
    image_url: string | null;
};

export function useCheckedOutGears(userId: string | null, toast: (params: { title: string; description: string; variant?: string }) => void) {
    const supabase = createClient();
    const [checkedOutGears, setCheckedOutGears] = useState<ProcessedGear[]>([]);
    const [pendingCheckInCount, setPendingCheckInCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionRef = useRef<number>(0);

    // Fetch checked out gear using direct Supabase query for better control
    const fetchCheckedOutGear = async () => {
        if (!userId) {
            setCheckedOutGears([]);
            return;
        }

        setIsLoading(true);
        try {
            console.log('Fetching checked out gears for user:', userId);

            // First, get all pending check-ins for this user to filter them out
            const { data: pendingCheckIns, error: pendingError } = await supabase
                .from('checkins')
                .select('gear_id')
                .eq('user_id', userId)
                .eq('status', 'Pending Admin Approval');

            if (pendingError) {
                console.error("Error fetching pending check-ins:", pendingError);
            }

            // Create a Set of gear IDs that already have pending check-ins
            const pendingGearIds = new Set((pendingCheckIns || []).map(ci => ci.gear_id));
            console.log('Found pending check-ins for gears:', Array.from(pendingGearIds));

            // Use direct Supabase query to get gears that the user should see in check-in
            // Include gears with status "Checked Out", "Pending Check-in", "Partially Available" that belong to the user
            // Exclude gears with status "Available" or "Needs Repair" even if checked_out_to is set
            const { data: gears, error } = await supabase
                .from('gears')
                .select('*')
                .eq('checked_out_to', userId)
                .in('status', ['Checked Out', 'Pending Check-in', 'Partially Available'])
                .order('name');

            if (error) {
                console.error("Error fetching checked out gear:", error);
                toast({
                    title: "Error Loading Gear",
                    description: "Unable to load your checked out gear. Please try refreshing the page.",
                    variant: "destructive"
                });
                return;
            }

            // Map to ProcessedGear format and filter out gears with pending check-ins
            const userCheckedOutGears: ProcessedGear[] = (gears || [])
                .filter(g => !pendingGearIds.has(g.id)) // Exclude gears already checked in (pending approval)
                .map(g => ({
                    id: g.id,
                    name: g.name || '',
                    category: g.category || '',
                    status: g.status,
                    checked_out_to: g.checked_out_to || null,
                    current_request_id: g.current_request_id || null,
                    last_checkout_date: g.last_checkout_date || null,
                    due_date: g.due_date || null,
                    image_url: g.image_url || null,
                }));

            const filteredCount = (gears || []).length - userCheckedOutGears.length;
            if (filteredCount > 0) {
                console.log(`Filtered out ${filteredCount} gear(s) with pending check-ins`);
            }

            console.log('Successfully loaded', userCheckedOutGears.length, 'checked out gears');
            console.log('Gear statuses:', userCheckedOutGears.map(g => ({ name: g.name, status: g.status })));
            setCheckedOutGears(userCheckedOutGears);
            setPendingCheckInCount(pendingGearIds.size);

        } catch (error) {
            console.error('Unexpected error in fetchCheckedOutGear:', error);
            toast({
                title: "Unexpected Error",
                description: "An unexpected error occurred while loading your gear. Please try refreshing the page.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!userId) {
            console.log('useCheckedOutGears: userId is null, skipping fetch');
            setCheckedOutGears([]);
            return;
        }

        console.log('useCheckedOutGears: userId provided, starting fetch:', userId);

        const fetchCheckedOutGearsWithScroll = async () => {
            if (listContainerRef.current) {
                scrollPositionRef.current = listContainerRef.current.scrollTop;
            }
            await fetchCheckedOutGear();
            setTimeout(() => {
                if (listContainerRef.current) {
                    listContainerRef.current.scrollTop = scrollPositionRef.current;
                }
            }, 0);
        };

        fetchCheckedOutGearsWithScroll();

        // Set up real-time subscription for gear changes
        const gearChannel = supabase
            .channel('gear_changes')
            .on('postgres_changes', {
                event: '*', // Listen to all events
                schema: 'public',
                table: 'gears',
                filter: `checked_out_to=eq.${userId}`
            }, fetchCheckedOutGearsWithScroll)
            .subscribe();

        // Set up real-time subscription for check-in changes to update immediately when check-ins are submitted/approved
        const checkinChannel = supabase
            .channel('checkin_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'checkins',
                filter: `user_id=eq.${userId}`
            }, fetchCheckedOutGearsWithScroll)
            .subscribe();

        return () => {
            supabase.removeChannel(gearChannel);
            supabase.removeChannel(checkinChannel);
        };
    }, [userId, toast]);

    return {
        checkedOutGears,
        pendingCheckInCount,
        fetchCheckedOutGear,
        listContainerRef,
        scrollPositionRef,
        isLoading
    };
} 