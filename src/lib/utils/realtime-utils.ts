import { createClient } from '../supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import logger from '../logger';

// Configuration
const POLL_INTERVAL_MS = 1200000; // Extended from 30s to 20min (1200 seconds) to dramatically reduce refresh frequency
const MAX_RETRY_ATTEMPTS = 3;
const STATUS_DEBOUNCE_MS = 500; // Debounce time for status change handling

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            func(...args);
            timeout = null;
        }, wait);
    };
}

export interface RealtimeSubscription {
    channel: RealtimeChannel;
    tableName: string;
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    pollingFallback?: {
        intervalId: NodeJS.Timeout;
        lastFetchedAt: string | null;
    };
    isActive: boolean;
}

// Track all active subscriptions
let activeSubscriptions: RealtimeSubscription[] = [];

// Interfaces for the various payload types
interface RealtimeRecord {
    id?: string;
    [key: string]: any;
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(tableName: string): Promise<boolean> {
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .single();

        if (error) {
            logger.error(error, `Failed to check if table ${tableName} exists`);
            return false;
        }

        return !!data;
    } catch (error) {
        logger.error(error, `Error checking if table ${tableName} exists`);
        return false;
    }
}

/**
 * Check if a column exists in a table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .eq('column_name', columnName)
            .single();

        if (error) {
            logger.error(error, `Failed to check if column ${columnName} in table ${tableName} exists`);
            return false;
        }

        return !!data;
    } catch (error) {
        logger.error(error, `Error checking if column ${columnName} in table ${tableName} exists`);
        return false;
    }
}

/**
 * Get the appropriate timestamp column for a table
 */
export async function getTableTimestampColumn(tableName: string): Promise<string | null> {
    // Common timestamp columns to check in order of preference
    const possibleColumns = [
        'updated_at',
        'created_at',
        'timestamp',
        'date',
        'modified_at',
        'last_modified',
        'updated',
        'created',
        'modification_date',
        'creation_date'
    ];

    // First try the common timestamp column names
    for (const column of possibleColumns) {
        const exists = await columnExists(tableName, column);
        if (exists) {
            return column;
        }
    }

    // If no standard timestamp column exists, try to get any column for sorting
    try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .in('data_type', ['timestamp', 'timestamptz', 'date', 'datetime', 'time'])
            .limit(1);

        if (!error && data && data.length > 0) {
            return data[0].column_name;
        }

        // Try to find any integer/bigint column as an alternative
        const { data: numericData, error: numericError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .in('data_type', ['integer', 'bigint'])
            .limit(1);

        if (!numericError && numericData && numericData.length > 0) {
            // Could be an ID or sequence column which is at least monotonically increasing
            return numericData[0].column_name;
        }

        // If no timestamp column found, try to find an ID column as last resort
        const { data: idData, error: idError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', tableName)
            .eq('column_name', 'id')
            .limit(1);

        if (!idError && idData && idData.length > 0) {
            return 'id'; // Not ideal but better than nothing
        }
    } catch (error) {
        logger.error(error, `Error finding timestamp column for ${tableName}`);
    }

    return null;
}

/**
 * Fallback polling function - this is used when realtime subscriptions fail
 */
async function pollTableChanges(
    tableName: string,
    callback: (payload: any) => void,
    lastFetchedAt: string | null
): Promise<string | null> {
    try {
        const supabase = createClient();

        // Find a suitable column for ordering
        let timestampColumn = await getTableTimestampColumn(tableName);

        if (!timestampColumn) {
            logger.error(
                new Error(`Table ${tableName} has no suitable timestamp column for polling`),
                'Polling fallback error'
            );
            return lastFetchedAt;
        }

        // Query for new records since last fetch
        let query = supabase.from(tableName).select('*');

        if (lastFetchedAt && timestampColumn !== 'id') {
            query = query.gt(timestampColumn, lastFetchedAt);
        }

        // Order by the timestamp column
        query = query.order(timestampColumn, { ascending: false }).limit(50);

        const { data, error } = await query;

        if (error) {
            logger.error(error, `Error polling table ${tableName}`);
            return lastFetchedAt;
        }

        if (data && data.length > 0) {
            // Get the most recent timestamp
            const newLastFetchedAt = timestampColumn !== 'id' ? data[0][timestampColumn] : null;

            // Notify callback with new data (mimicking realtime payload)
            data.forEach((record: RealtimeRecord) => {
                callback({
                    eventType: 'UPDATE', // Assume update as we can't determine exact event
                    new: record,
                    old: {},
                    table: tableName,
                    schema: 'public'
                });
            });

            return newLastFetchedAt;
        }

        return lastFetchedAt;
    } catch (error) {
        logger.error(error, `Error polling table ${tableName}`);
        return lastFetchedAt;
    }
}

/**
 * Setup fallback polling for a subscription
 */
function setupPollingFallback(
    subscription: RealtimeSubscription,
    callback: (payload: any) => void
): void {
    // Don't set up polling if it's already active
    if (subscription.pollingFallback) return;

    logger.info(`Setting up polling fallback for ${subscription.tableName}`, 'Realtime fallback');

    const intervalId = setInterval(async () => {
        // Don't poll if subscription has become active again
        if (subscription.isActive) return;

        try {
            const lastFetchedAt = subscription.pollingFallback?.lastFetchedAt || null;
            const newLastFetchedAt = await pollTableChanges(
                subscription.tableName,
                callback,
                lastFetchedAt
            );

            // Update the last fetched timestamp
            if (subscription.pollingFallback) {
                subscription.pollingFallback.lastFetchedAt = newLastFetchedAt;
            }
        } catch (error) {
            logger.error(error, `Error in polling fallback for ${subscription.tableName}`);
        }
    }, POLL_INTERVAL_MS);

    // Store polling info
    subscription.pollingFallback = {
        intervalId,
        lastFetchedAt: null
    };
}

/**
 * Clean up polling fallback
 */
function cleanupPollingFallback(subscription: RealtimeSubscription): void {
    if (subscription.pollingFallback) {
        clearInterval(subscription.pollingFallback.intervalId);
        subscription.pollingFallback = undefined;
    }
}

/**
 * Sets up a real-time subscription for a table with error handling and fallback
 */
export function subscribeToTable(
    tableName: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
    callback: (payload: any) => void,
    enableFallback: boolean = true
): RealtimeSubscription | null {
    const supabase = createClient();
    let retryCount = 0;
    let subscription: RealtimeSubscription | null = null;

    const setupSubscription = () => {
        try {
            const channelName = `public:${tableName}:${Date.now()}`;
            logger.info(`Setting up realtime subscription for ${tableName}`, 'Realtime');

            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    { event, schema: 'public', table: tableName },
                    (payload: RealtimePostgresChangesPayload<any>) => {
                        const recordId = payload.new?.id || (payload.old as any)?.id;
                        logger.debug(`Received ${event} on ${tableName}`, 'Realtime event', {
                            tableName,
                            event,
                            recordId
                        });
                        callback(payload);
                    }
                )
                .on('system', { event: 'error' }, (error: any) => {
                    // Only log actual errors, not info messages labeled as errors
                    if (error && error.message &&
                        !(error.message.includes("Subscribed to PostgreSQL") && error.status === "ok") &&
                        !(error.message.includes("postgres_changes") && error.status === "ok")) {
                        logger.error(error, `Realtime error for ${tableName}`);

                        if (subscription) {
                            subscription.isActive = false;

                            // Set up polling fallback if enabled
                            if (enableFallback) {
                                setupPollingFallback(subscription, callback);
                            }
                        }
                    }
                })
                .subscribe((status: any) => {
                    logger.info(`Subscription status for ${tableName}: ${status}`, 'Realtime status');

                    // Use debounced handler for status changes to avoid rapid state changes
                    const handleStatusChange = debounce((currentStatus: any) => {
                        if (subscription) {
                            // Only consider actually subscribed if status is SUBSCRIBED
                            const isSuccessful = currentStatus === 'SUBSCRIBED';
                            subscription.isActive = isSuccessful;

                            // If subscription is now active, clean up any polling fallback
                            if (isSuccessful && subscription.pollingFallback) {
                                cleanupPollingFallback(subscription);
                            }
                            // If subscription failed and fallback is enabled, set up polling
                            // Note: CHANNEL_ERROR, CLOSED, TIMED_OUT are genuine error states
                            else if (!isSuccessful && enableFallback &&
                                (currentStatus === 'CHANNEL_ERROR' || currentStatus === 'CLOSED' || currentStatus === 'TIMED_OUT' ||
                                    currentStatus === 'SUBSCRIBED_ERROR' || currentStatus === 'SUBSCRIBE_ERROR')) {
                                setupPollingFallback(subscription, callback);
                            }
                        }
                    }, STATUS_DEBOUNCE_MS);

                    // Call the debounced handler
                    handleStatusChange(status);
                });

            subscription = {
                channel,
                tableName,
                event,
                isActive: false // Will be updated by subscribe callback
            };

            activeSubscriptions.push(subscription);
            return subscription;
        } catch (error) {
            logger.error(error, `Error subscribing to ${tableName}`);

            // Retry with exponential backoff
            if (retryCount < MAX_RETRY_ATTEMPTS) {
                retryCount++;
                const delay = Math.pow(2, retryCount) * 1000;
                logger.info(`Retrying subscription to ${tableName} in ${delay}ms (attempt ${retryCount})`, 'Realtime retry');

                setTimeout(setupSubscription, delay);
                return null;
            } else if (enableFallback) {
                // Create a dummy subscription for fallback polling
                const dummySubscription: RealtimeSubscription = {
                    channel: null as unknown as RealtimeChannel,
                    tableName,
                    event,
                    isActive: false
                };

                activeSubscriptions.push(dummySubscription);
                setupPollingFallback(dummySubscription, callback);
                return dummySubscription;
            }

            return null;
        }
    };

    return setupSubscription();
}

/**
 * Unsubscribe from a specific table subscription
 */
export function unsubscribeFromTable(subscription: RealtimeSubscription): void {
    try {
        // Clean up polling fallback if present
        cleanupPollingFallback(subscription);

        // Unsubscribe from the channel if it exists
        if (subscription.channel) {
            subscription.channel.unsubscribe();
        }

        activeSubscriptions = activeSubscriptions.filter(
            (sub) => sub !== subscription
        );
    } catch (error) {
        logger.error(error, `Error unsubscribing from ${subscription.tableName}`);
    }
}

/**
 * Clean up all active subscriptions
 */
export function cleanupAllSubscriptions(): void {
    activeSubscriptions.forEach((subscription) => {
        try {
            unsubscribeFromTable(subscription);
        } catch (error) {
            logger.error(
                error,
                `Error cleaning up subscription for ${subscription.tableName}`
            );
        }
    });
    activeSubscriptions = [];
}

interface DashboardCallbacks {
    onGearUpdate?: (payload: any) => void;
    onMaintenanceUpdate?: (payload: any) => void;
    onRequestUpdate?: (payload: any) => void;
    onNotificationUpdate?: (payload: any) => void;
    onActivityLogUpdate?: (payload: any) => void;
}

/**
 * Sets up all necessary real-time subscriptions for the admin dashboard
 */
export function setupAdminDashboardSubscriptions(callbacks: DashboardCallbacks): () => void {
    const subscriptions: RealtimeSubscription[] = [];

    // Subscribe to gear changes
    if (callbacks.onGearUpdate) {
        const sub = subscribeToTable('gears', '*', callbacks.onGearUpdate);
        if (sub) subscriptions.push(sub);
    }

    // Subscribe to maintenance records
    if (callbacks.onMaintenanceUpdate) {
        const sub = subscribeToTable('gear_maintenance', '*', callbacks.onMaintenanceUpdate);
        if (sub) subscriptions.push(sub);
    }

    // Subscribe to gear requests
    if (callbacks.onRequestUpdate) {
        const sub = subscribeToTable('gear_requests', '*', callbacks.onRequestUpdate);
        if (sub) subscriptions.push(sub);
    }

    // Subscribe to notifications
    if (callbacks.onNotificationUpdate) {
        const sub = subscribeToTable('notifications', '*', callbacks.onNotificationUpdate);
        if (sub) subscriptions.push(sub);
    }

    // Subscribe to activity log
    if (callbacks.onActivityLogUpdate) {
        const sub = subscribeToTable('gear_activity_log', '*', callbacks.onActivityLogUpdate);
        if (sub) subscriptions.push(sub);
    }

    // Return cleanup function
    return () => {
        subscriptions.forEach(unsubscribeFromTable);
    };
}

/**
 * Checks if a Supabase table is enabled for realtime
 */
export async function isTableEnabledForRealtime(tableName: string): Promise<boolean> {
    try {
        const supabase = createClient();
        // Create a temporary subscription to test if realtime is enabled
        const channelName = `test-realtime-${tableName}-${Date.now()}`;
        let isEnabled = false;

        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => { })
            .subscribe((status: any) => {
                isEnabled = status === 'SUBSCRIBED';
            });

        // Give it some time to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Unsubscribe from test channel
        await supabase.removeChannel(channel);

        return isEnabled;
    } catch (error) {
        logger.error(error, `Error checking if ${tableName} is enabled for realtime`);
        return false;
    }
}

/**
 * Utility function to create an object with status of all tables
 */
export async function checkRealtimeStatus(): Promise<Record<string, boolean>> {
    const commonTables = [
        'gears',
        'gear_requests',
        'gear_maintenance',
        'gear_activity_log',
        'notifications',
        'profiles'
    ];

    const result: Record<string, boolean> = {};

    for (const table of commonTables) {
        result[table] = await isTableEnabledForRealtime(table);
    }

    return result;
}
