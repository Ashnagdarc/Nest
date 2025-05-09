import { useEffect, useRef } from 'react';
import { RealtimeChannel, SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createErrorLogger } from '@/lib/error-handling';

const logError = createErrorLogger('SupabaseSubscription');

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
}

export function useSupabaseSubscription<T extends Record<string, any>>({
    supabase,
    channel: channelName,
    config,
    callback,
    onError,
    enabled = true
}: UseSupabaseSubscriptionProps<T>) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let mounted = true;

        const setupSubscription = async () => {
            try {
                // Clean up existing subscription if any
                if (channelRef.current) {
                    await supabase.removeChannel(channelRef.current);
                }

                // Create new subscription
                const channel = supabase
                    .channel(channelName)
                    .on<T>(
                        'postgres_changes' as any, // Type assertion needed due to Supabase types limitation
                        {
                            event: config.event,
                            schema: config.schema,
                            table: config.table,
                            filter: config.filter
                        },
                        (payload: RealtimePostgresChangesPayload<T>) => {
                            if (mounted) {
                                try {
                                    callback(payload);
                                } catch (error) {
                                    logError(error, `processing ${config.table} subscription payload`);
                                    onError?.(error);
                                }
                            }
                        }
                    )
                    .subscribe((status) => {
                        console.log(`Subscription status for ${channelName}:`, status);

                        if (status === 'SUBSCRIBED') {
                            console.log(`Successfully subscribed to ${config.table} changes`);
                        } else if (status === 'CLOSED') {
                            console.log(`Subscription to ${config.table} closed`);
                        } else if (status === 'CHANNEL_ERROR') {
                            const error = new Error(`Subscription error for ${config.table}`);
                            logError(error, 'channel error');
                            onError?.(error);
                        }
                    });

                channelRef.current = channel;
            } catch (error) {
                logError(error, `setting up ${config.table} subscription`);
                onError?.(error);
            }
        };

        setupSubscription();

        return () => {
            mounted = false;

            // Clean up subscription
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                    .catch(error => {
                        logError(error, `cleaning up ${config.table} subscription`);
                    });
            }
        };
    }, [supabase, channelName, config, callback, onError, enabled]);

    return {
        unsubscribe: async () => {
            if (channelRef.current) {
                try {
                    await supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                } catch (error) {
                    logError(error, `manually unsubscribing from ${config.table}`);
                    throw error;
                }
            }
        }
    };
}

// Usage example:
/*
interface GearRecord {
  id: string;
  name: string;
  status: string;
  user_id: string;
}

const { unsubscribe } = useSupabaseSubscription<GearRecord>({
  supabase,
  channel: 'gear-updates',
  config: {
    event: '*',
    schema: 'public',
    table: 'gears',
    filter: `user_id=eq.${userId}`
  },
  callback: (payload) => {
    console.log('Received update:', payload);
    refreshData();
  },
  onError: (error) => {
    toast({
      title: 'Subscription Error',
      description: getErrorMessage(error),
      variant: 'destructive'
    });
  }
});
*/ 