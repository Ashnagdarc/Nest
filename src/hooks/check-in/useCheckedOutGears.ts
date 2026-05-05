import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    requested_quantity: number;
    completed_return_quantity: number;
    pending_return_quantity: number;
    returnable_quantity: number;
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
                .select('gear_id, request_id, quantity')
                .eq('user_id', userId)
                .eq('status', 'Pending Admin Approval');

            if (pendingError) {
                console.error("Error fetching pending check-ins:", pendingError);
            }

            const pendingByKey = new Map<string, number>();
            const pendingQtyTotal = (pendingCheckIns || []).reduce((sum, ci) => {
                const qty = Math.max(1, Number(ci.quantity ?? 1));
                const key = `${ci.request_id || ''}::${ci.gear_id}`;
                pendingByKey.set(key, (pendingByKey.get(key) || 0) + qty);
                return sum + qty;
            }, 0);
            console.log('Found pending check-ins:', { rows: (pendingCheckIns || []).length, quantity: pendingQtyTotal });

            type RequestLineRow = { gear_request_id: string; gear_id: string; quantity: number | null; gear?: any };
            type ReturnRow = { request_id: string | null; gear_id: string; status: string; quantity: number | null };

            let requestLines: RequestLineRow[] = [];
            let requestLinesError: string | null = null;
            let userReturns: ReturnRow[] = [];
            let userReturnsError: string | null = null;
            const activeRequestIds = new Set<string>();

            // Canonical source of user's checked-out inventory:
            // active request lines minus returned quantities. This avoids stale gears.checked_out_to pointers.
            try {
                const requestResponse = await fetch('/api/requests/user', { cache: 'no-store' });
                if (!requestResponse.ok) {
                    throw new Error(`HTTP ${requestResponse.status}`);
                }

                const requestJson = await requestResponse.json();
                const userRequests = Array.isArray(requestJson?.data) ? requestJson.data : [];
                const activeStatuses = new Set(['Approved', 'Checked Out', 'Partially Checked Out', 'Overdue']);

                requestLines = userRequests
                    .filter((request: { id?: string | null; status?: string | null }) => {
                        const status = String(request?.status || '');
                        const isActive = activeStatuses.has(status);
                        if (isActive && request?.id) activeRequestIds.add(String(request.id));
                        return isActive;
                    })
                    .flatMap((request: { id?: string | null; gear_request_gears?: Array<{ gear_id?: string | null; quantity?: number | null; gears?: any }> }) => {
                        const requestId = String(request.id || '');
                        const lines = Array.isArray(request.gear_request_gears) ? request.gear_request_gears : [];
                        return lines
                            .map((line) => ({
                                gear_request_id: requestId,
                                gear_id: String(line?.gear_id || ''),
                                quantity: line?.quantity ?? 1,
                                gear: line?.gears || null
                            }))
                            .filter((line) => Boolean(line.gear_id));
                    }) as RequestLineRow[];
            } catch (apiError) {
                requestLinesError = apiError instanceof Error
                    ? `Failed to load request quantities from API: ${apiError.message}`
                    : 'Failed to load request quantities from API';
            }

            if (requestLinesError) {
                console.error("Error fetching request lines:", requestLinesError);
                toast({
                    title: "Error Loading Gear",
                    description: "Unable to load your checked out gear. Please try refreshing the page.",
                    variant: "destructive"
                });
                return;
            }

            const requestIds = Array.from(activeRequestIds);
            const gearIds = Array.from(new Set(requestLines.map(line => line.gear_id)));

            if (requestIds.length > 0 && gearIds.length > 0) {
                const { data: userReturnsData, error: userReturnsQueryError } = await supabase
                    .from('checkins')
                    .select('request_id, gear_id, status, quantity')
                    .eq('user_id', userId)
                    .in('request_id', requestIds)
                    .in('gear_id', gearIds)
                    .in('status', ['Pending Admin Approval', 'Completed']);

                userReturns = (userReturnsData || []) as ReturnRow[];
                userReturnsError = userReturnsQueryError?.message || null;
            }

            if (userReturnsError) {
                console.error("Error fetching user return quantities:", userReturnsError);
            }

            const requestedByKey = new Map<string, number>();
            const lineMetaByKey = new Map<string, any>();
            requestLines.forEach((line) => {
                const key = `${line.gear_request_id || ''}::${line.gear_id}`;
                requestedByKey.set(key, (requestedByKey.get(key) || 0) + Math.max(1, Number(line.quantity ?? 1)));
                if (!lineMetaByKey.has(key) && line.gear) {
                    lineMetaByKey.set(key, line.gear);
                }
            });

            const completedByKey = new Map<string, number>();
            const pendingFromReturnsByKey = new Map<string, number>();
            userReturns.forEach((checkin) => {
                const key = `${checkin.request_id || ''}::${checkin.gear_id}`;
                const qty = Math.max(1, Number(checkin.quantity ?? 1));
                if (checkin.status === 'Completed') {
                    completedByKey.set(key, (completedByKey.get(key) || 0) + qty);
                } else if (checkin.status === 'Pending Admin Approval') {
                    pendingFromReturnsByKey.set(key, (pendingFromReturnsByKey.get(key) || 0) + qty);
                }
            });

            const userCheckedOutGears: ProcessedGear[] = Array.from(requestedByKey.entries())
                .map(([key, requested]) => {
                    const [requestId, gearId] = key.split('::');
                    const completed = completedByKey.get(key) || 0;
                    const pending = Math.max(pendingByKey.get(key) || 0, pendingFromReturnsByKey.get(key) || 0);
                    const returnable = Math.max(0, requested - completed - pending);
                    const gear = lineMetaByKey.get(key) || {};

                    return {
                        id: gearId,
                        name: String(gear?.name || 'Unknown Gear'),
                        category: String(gear?.category || ''),
                        status: String(gear?.status || 'Checked Out'),
                        checked_out_to: (gear?.checked_out_to as string | null) || userId,
                        current_request_id: requestId || null,
                        last_checkout_date: (gear?.last_checkout_date as string | null) || null,
                        due_date: (gear?.due_date as string | null) || null,
                        image_url: (gear?.image_url as string | null) || null,
                        requested_quantity: requested,
                        completed_return_quantity: completed,
                        pending_return_quantity: pending,
                        returnable_quantity: returnable,
                    };
                })
                .filter((g) => g.pending_return_quantity === 0 && g.returnable_quantity > 0)
                .sort((a, b) => a.name.localeCompare(b.name));

            console.log('Successfully loaded', userCheckedOutGears.length, 'checked out gears');
            console.log('Gear statuses:', userCheckedOutGears.map(g => ({ name: g.name, status: g.status })));
            setCheckedOutGears(userCheckedOutGears);
            setPendingCheckInCount(pendingQtyTotal);

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

        // Request lifecycle updates can change what is returnable.
        const requestChannel = supabase
            .channel('request_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'gear_requests',
                filter: `user_id=eq.${userId}`
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
            supabase.removeChannel(requestChannel);
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
