import { useEffect, useRef } from 'react';
import { RealtimeChannel, SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { createSupabaseSubscription } from '@/utils/supabase-subscription';

type SubscriptionConfig = {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    filter?: string;
};

type SubscriptionCallback<T extends Record<string, any>> = (
    payload: RealtimePostgresChangesPayload<T>
) => void;

interface UseSupabaseSubscriptionProps<T extends Record<string, any>> {
    supabase: SupabaseClient;
    channel: string;
    config: SubscriptionConfig;
    callback: SubscriptionCallback<T>;
    onError?: (error: unknown) => void;
    enabled?: boolean;
    pollingInterval?: number;
}

/**
 * A simplified hook for Supabase real-time subscriptions
 * This version avoids using complex error handling that was causing issues
 */
export function useSupabaseSubscription<T extends Record<string, any>>({
    supabase,
    channel: channelName,
    config,
    callback,
    onError,
    enabled = true,
    pollingInterval = 1200000 // Extended from 10s to 20min (1200 seconds) to dramatically reduce refresh frequency
}: UseSupabaseSubscriptionProps<T>) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let mounted = true;

        const setupSubscription = () => {
            try {
                // Clean up existing subscription if any
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                }

                // Use the non-hook version for better reliability
                const subscription = createSupabaseSubscription({
                    supabase,
                    channel: channelName,
                    config,
                    callback: (payload: RealtimePostgresChangesPayload<T>) => {
                        if (mounted) {
                            try {
                                callback(payload);
                            } catch (err) {
                                const error = err instanceof Error ? err : new Error(`Unknown error: ${String(err)}`);
                                logger.error(error, { context: 'subscription callback' });
                                if (onError) onError(error);
                            }
                        }
                    },
                    onError: (error: unknown) => {
                        if (mounted && onError) {
                            onError(error);
                        }
                    },
                    pollingInterval
                });

                // Store unsubscribe function
                return subscription.unsubscribe;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(`Unknown error: ${String(err)}`);
                logger.error(error, { context: 'subscription setup' });
                if (onError) onError(error);
                return () => { };
            }
        };

        const unsubscribe = setupSubscription();

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [supabase, channelName, config, callback, onError, enabled, pollingInterval]);

    return {
        unsubscribe: () => {
            if (channelRef.current) {
                try {
                    supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                } catch (err) {
                    logger.error(`Error unsubscribing: ${String(err)}`, { context: 'subscription' });
                }
            }
        }
    };
} 