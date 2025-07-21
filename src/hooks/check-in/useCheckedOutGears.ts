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

export function useCheckedOutGears(userId: string | null, toast: any) {
    const supabase = createClient();
    const [checkedOutGears, setCheckedOutGears] = useState<ProcessedGear[]>([]);
    const listContainerRef = useRef<HTMLDivElement | null>(null);
    const scrollPositionRef = useRef<number>(0);

    // Fetch checked out gear
    const fetchCheckedOutGear = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: gears, error } = await apiGet<{ data: Gear[]; error: string | null }>(`/api/gears?status=Checked%20Out`);
            if (error) {
                console.error('Error fetching checked out gear:', error);
                return;
            }
            const userCheckedOutGears = (gears || [])
                .filter(g => g.checked_out_to === user.id)
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
            setCheckedOutGears(userCheckedOutGears);
        } catch (error) {
            console.error('Error in fetchCheckedOutGear:', error);
        }
    };

    useEffect(() => {
        if (!userId) return;
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
        const gearChannel = supabase
            .channel('gear_changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'gears',
                filter: `checked_out_to=eq.${userId}`
            }, fetchCheckedOutGearsWithScroll)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'gears',
                filter: `checked_out_to=eq.${userId}`
            }, fetchCheckedOutGearsWithScroll)
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'gears',
                filter: `checked_out_to=eq.${userId}`
            }, fetchCheckedOutGearsWithScroll)
            .subscribe();
        return () => {
            supabase.removeChannel(gearChannel);
        };
    }, [userId, toast]);

    return { checkedOutGears, fetchCheckedOutGear, listContainerRef, scrollPositionRef };
} 