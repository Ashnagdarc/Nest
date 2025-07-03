import { RealtimeChannel, SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger, logWarning, logInfo, logDebug, logError } from '@/utils/logger';

type SubscriptionConfig = {
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    filter?: string;
};

type SubscriptionCallback<T extends Record<string, any>> = (
    payload: RealtimePostgresChangesPayload<T>
) => void;

interface CreateSubscriptionProps<T extends Record<string, any>> {
    supabase: SupabaseClient;
    channel: string;
    config: SubscriptionConfig;
    callback: SubscriptionCallback<T>;
    onError?: (error: unknown) => void;
    pollingInterval?: number; // Optional fallback polling interval in ms
}

/**
 * Creates a Supabase realtime subscription without using React hooks
 * This can be safely used inside useEffect or other functions
 * Falls back to polling if realtime is not available
 */
export function createSupabaseSubscription<T extends Record<string, any>>({
    supabase,
    channel: channelName,
    config,
    callback,
    onError,
    pollingInterval = 1200000 // Extended from 30s to 20min (1200 seconds) to dramatically reduce refresh frequency
}: CreateSubscriptionProps<T>) {
    let channel: RealtimeChannel | null = null;
    let pollingTimer: NodeJS.Timeout | null = null;
    let isUsingPolling = false;
    let lastPollingError: Error | null = null;
    let consecutiveErrors = 0;
    let lastPollingData: any[] = [];

    // Wrapper for error handling to prevent empty objects
    const handleError = (error: unknown, context: string) => {
        if (!error) {
            const emptyError = new Error(`Empty error in ${context}`);
            logger.error(emptyError, {
                context: 'supabaseSubscription',
                location: context,
                table: config.table,
                channelName
            });
            onError?.(emptyError);
            return;
        }

        // Special handling for CHANNEL_ERROR - treat as warning, not error
        if (typeof error === 'string' && error.includes('CHANNEL_ERROR')) {
            const warning = `Channel error for ${config.table}: ${error} - falling back to polling`;
            logger.warn(warning, {
                context: 'supabaseSubscription',
                location: context,
                table: config.table,
                channelName,
                fallbackMethod: 'polling'
            });

            // Immediately setup polling for CHANNEL_ERROR
            if (!isUsingPolling) {
                setupPolling();
            }
            return;
        }

        if (error instanceof Error) {
            // Filter out connection close errors - these are expected
            if (error.message && (
                error.message.includes('WebSocket connection') ||
                error.message.includes('_onConnClose') ||
                error.message.includes('CHANNEL_ERROR')
            )) {
                logger.warn(`Connection issue for ${config.table}: ${error.message} - using polling fallback`, {
                    context: 'supabaseSubscription',
                    location: context,
                    table: config.table,
                    channelName
                });

                if (!isUsingPolling) {
                    setupPolling();
                }
                return;
            }

            logger.error(error, {
                context: 'supabaseSubscription',
                location: context,
                table: config.table,
                channelName
            });
        } else if (typeof error === 'object') {
            // Handle object-type errors
            try {
                const errorJson = JSON.stringify(error);

                // Special handling for channel errors
                if (errorJson.includes('CHANNEL_ERROR')) {
                    logger.warn(`Channel error for ${config.table}: ${errorJson} - falling back to polling`, {
                        context: 'supabaseSubscription',
                        location: context,
                        table: config.table,
                        channelName
                    });

                    if (!isUsingPolling) {
                        setupPolling();
                    }
                    return;
                }

                const objError = new Error(`${context}: ${errorJson}`);
                logger.error(objError, {
                    context: 'supabaseSubscription',
                    location: context,
                    table: config.table,
                    channelName,
                    originalError: error
                });
                onError?.(objError);
            } catch (jsonError) {
                // Handle non-serializable objects
                const nonSerializableError = new Error(`${context}: Non-serializable error object`);
                logger.error(nonSerializableError, {
                    context: 'supabaseSubscription',
                    location: context,
                    table: config.table,
                    channelName,
                    originalErrorType: typeof error
                });
                onError?.(nonSerializableError);
            }
        } else {
            logger.error(`${context}: ${String(error)}`, {
                context: 'supabaseSubscription',
                location: context,
                table: config.table,
                channelName,
                originalError: error
            });
            onError?.(new Error(`${context}: ${String(error)}`));
        }
    };

    // Setup polling as fallback mechanism
    const setupPolling = () => {
        // Only set up polling if not already polling
        if (pollingTimer || isUsingPolling) return;

        isUsingPolling = true;
        logInfo(`Falling back to polling for ${config.table}`, 'supabaseSubscription', {
            table: config.table,
            interval: pollingInterval
        });

        // Function to poll the table
        const pollTable = async () => {
            try {
                // Simple query to get latest data
                let query = supabase.from(config.table).select('*');
                let previousData: any[] = [];

                // Get last known data state for comparison
                if (lastPollingData) {
                    previousData = lastPollingData;
                }

                try {
                    // Try to order by created_at if it exists
                    // This will fail with "column does not exist" if the column is missing
                    query = query.order('created_at', { ascending: false }).limit(10);
                    const { data, error } = await query;

                    if (error) {
                        // Check if the error is about missing created_at column
                        if (error.message && error.message.includes("column") &&
                            error.message.includes("created_at") && error.message.includes("does not exist")) {
                            // Try again with updated_at instead
                            const fallbackQuery = supabase.from(config.table)
                                .select('*')
                                .order('updated_at', { ascending: false })
                                .limit(10);

                            const fallbackResult = await fallbackQuery;

                            if (fallbackResult.error) {
                                // Both created_at and updated_at failed, just fetch without ordering
                                const basicQuery = await supabase.from(config.table)
                                    .select('*')
                                    .limit(10);

                                if (basicQuery.error) {
                                    handleError(basicQuery.error, `polling ${config.table}`);
                                    return;
                                }

                                successCallback(basicQuery.data, previousData);
                                return;
                            }

                            successCallback(fallbackResult.data, previousData);
                            return;
                        } else {
                            // Other kind of error
                            consecutiveErrors++;
                            if (consecutiveErrors % 5 === 1) {
                                handleError(error, `polling ${config.table}`);
                            }
                            return;
                        }
                    }

                    successCallback(data, previousData);
                } catch (orderError) {
                    // If ordering fails, try a simple query without ordering
                    const simpleQuery = await supabase.from(config.table)
                        .select('*')
                        .limit(10);

                    if (simpleQuery.error) {
                        handleError(simpleQuery.error, `polling ${config.table}`);
                        return;
                    }

                    successCallback(simpleQuery.data, previousData);
                }
            } catch (error) {
                handleError(error, `polling ${config.table}`);
            }
        };

        // Helper function to handle successful data fetching
        const successCallback = (data: any[], previousData: any[]) => {
            if (!data || data.length === 0) {
                return; // No data to process
            }

            // Store the current data for future comparison
            lastPollingData = [...data];

            // Check if data has actually changed
            if (previousData.length === 0) {
                // First poll, always trigger callback
                triggerCallback(data);
                return;
            }

            // Compare data to see if there are actual changes
            const hasChanges = detectChanges(data, previousData);

            // Only trigger callback if data has changed
            if (hasChanges) {
                triggerCallback(data);
            }

            consecutiveErrors = 0;
            lastPollingError = null;
        };

        // Function to detect changes in data
        const detectChanges = (newData: any[], oldData: any[]): boolean => {
            // If array lengths don't match, data has changed
            if (newData.length !== oldData.length) {
                return true;
            }

            // Check for ID changes (different records)
            const newIds = newData.map(item => item.id).sort().join(',');
            const oldIds = oldData.map(item => item.id).sort().join(',');

            if (newIds !== oldIds) {
                return true;
            }

            // Check for content changes in common items
            for (const newItem of newData) {
                const oldItem = oldData.find(old => old.id === newItem.id);

                if (oldItem) {
                    // Simple check - compare JSON representation
                    // This is not perfect but works for most cases
                    const newJSON = JSON.stringify(newItem);
                    const oldJSON = JSON.stringify(oldItem);

                    if (newJSON !== oldJSON) {
                        return true;
                    }
                }
            }

            return false;
        };

        // Function to trigger callback with payload
        const triggerCallback = (data: any[]) => {
            const mockPayload: RealtimePostgresChangesPayload<T> = {
                schema: config.schema,
                table: config.table,
                commit_timestamp: new Date().toISOString(),
                eventType: 'UPDATE',
                new: data[0] as T, // Use the actual data instead of empty object
                old: {} as T,
                errors: []
            };

            // Trigger callback to refresh data
            callback(mockPayload);
        };

        // Initial poll
        pollTable();

        // Set up interval
        pollingTimer = setInterval(pollTable, pollingInterval);
    };

    // Try to set up realtime subscription first
    try {
        // Create new subscription
        channel = supabase
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
                    try {
                        callback(payload);
                    } catch (error) {
                        handleError(error, `processing ${config.table} payload`);
                    }
                }
            )
            .on('system', { event: 'error' }, (error: any) => {
                // Handle CHANNEL_ERROR specifically - treat as warning, not error
                if (error && (
                    (typeof error === 'string' && error.includes('CHANNEL_ERROR')) ||
                    (typeof error === 'object' && JSON.stringify(error).includes('CHANNEL_ERROR'))
                )) {
                    const message = `Channel error for ${config.table} - falling back to polling`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table,
                        channelName,
                        fallbackMethod: 'polling',
                        errorType: 'CHANNEL_ERROR'
                    };
                    logWarning(message, context, data);

                    // Immediately setup polling for CHANNEL_ERROR
                    if (!isUsingPolling) {
                        setupPolling();
                    }
                    return;
                }

                // Handle error that might be a plain object rather than an Error instance
                if (!error) {
                    handleError(new Error('Unknown channel error'), 'channel error event');
                } else if (error instanceof Error) {
                    // Filter out common "info" messages incorrectly sent as errors
                    if (error.message &&
                        !(error.message.includes("Subscribed to PostgreSQL") &&
                            (error as any).status === "ok") &&
                        !(error.message.includes("postgres_changes") &&
                            (error as any).status === "ok")) {
                        handleError(error, 'channel error event');
                    }
                } else if (typeof error === 'object') {
                    try {
                        const errorMsg = JSON.stringify(error);
                        // Filter out common "info" messages incorrectly sent as errors
                        if (!(errorMsg.includes("Subscribed to PostgreSQL") &&
                            (error as any).status === "ok") &&
                            !(errorMsg.includes("postgres_changes") &&
                                (error as any).status === "ok")) {
                            handleError(new Error(`Channel error: ${errorMsg}`), 'channel error event');

                            // Check for "Unable to subscribe to changes" error and set up polling
                            if (errorMsg.includes("Unable to subscribe to changes") &&
                                errorMsg.includes("Please check Realtime is enabled")) {
                                setupPolling();
                            }
                        }
                    } catch (e) {
                        handleError(new Error('Non-serializable channel error object'), 'channel error event');
                    }
                } else {
                    handleError(new Error(`Channel error: ${String(error)}`), 'channel error event');
                }
            })
            .on('system', { event: 'disconnect' }, (reason: { message?: string; code?: number }) => {
                const message = `Disconnected from ${config.table} subscription`;
                const context = 'supabaseSubscription';
                const data = {
                    reason: reason?.message || 'unknown',
                    code: reason?.code,
                    table: config.table,
                    channelName
                };
                logWarning(message, context, data);

                // If disconnected, maybe realtime is not working, try polling
                if (!isUsingPolling) {
                    setupPolling();
                }
            })
            .on('system', { event: 'reconnect' }, () => {
                const message = `Reconnected to ${config.table} subscription`;
                const context = 'supabaseSubscription';
                const data = {
                    table: config.table,
                    channelName
                };
                logInfo(message, context, data);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    const message = `Successfully subscribed to ${config.table} changes`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table
                    };
                    logDebug(message, context, data);
                } else if (status === 'CLOSED') {
                    const message = `Subscription to ${config.table} closed`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table
                    };
                    logDebug(message, context, data);

                    // If closed, maybe we need polling
                    if (!isUsingPolling) {
                        setupPolling();
                    }
                } else if (status === 'TIMED_OUT') {
                    // Handle timeout as warning, not error - this is expected in dev environments
                    const message = `Real-time subscription timed out for ${config.table}, falling back to polling`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table,
                        channelName,
                        fallbackMethod: 'polling'
                    };
                    logWarning(message, context, data);

                    // Immediately fall back to polling on timeout
                    if (!isUsingPolling) {
                        setupPolling();
                    }
                } else if (
                    status === 'CHANNEL_ERROR' ||
                    // Handle additional error states with type assertion
                    status === ('SUBSCRIBED_ERROR' as any) ||
                    status === ('SUBSCRIBE_ERROR' as any)
                ) {
                    // Treat CHANNEL_ERROR as warning, not error - this is expected in dev environments
                    const message = `Channel error for ${config.table}: ${status} - falling back to polling`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table,
                        channelName,
                        status,
                        fallbackMethod: 'polling'
                    };
                    logWarning(message, context, data);

                    // Immediately fall back to polling on channel error
                    if (!isUsingPolling) {
                        setupPolling();
                    }
                } else {
                    const message = `Subscription status changed to ${status}`;
                    const context = 'supabaseSubscription';
                    const data = {
                        table: config.table,
                        status
                    };
                    logDebug(message, context, data);
                }
            });
    } catch (error) {
        handleError(error, `setting up ${config.table} subscription`);

        // If subscription setup fails, fall back to polling
        setupPolling();

        return {
            unsubscribe: () => {
                if (pollingTimer) {
                    clearInterval(pollingTimer);
                    pollingTimer = null;
                }
                return Promise.resolve();
            }
        };
    }

    // Return unsubscribe function
    return {
        unsubscribe: async () => {
            // Clean up both subscription types
            if (channel) {
                try {
                    await supabase.removeChannel(channel);
                    channel = null;
                } catch (error) {
                    handleError(error, `manually unsubscribing from ${config.table}`);
                }
            }

            if (pollingTimer) {
                clearInterval(pollingTimer);
                pollingTimer = null;
            }
        }
    };
} 