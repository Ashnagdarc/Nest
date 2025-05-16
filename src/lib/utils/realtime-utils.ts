import { createClient } from '../supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscription {
    channel: RealtimeChannel;
    tableName: string;
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

let activeSubscriptions: RealtimeSubscription[] = [];

/**
 * Sets up a real-time subscription for a table
 */
export function subscribeToTable(
    tableName: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
    callback: (payload: any) => void
): RealtimeSubscription | null {
    const supabase = createClient();

    try {
        const channel = supabase
            .channel(`public:${tableName}`)
            .on(
                'postgres_changes',
                { event, schema: 'public', table: tableName },
                (payload) => {
                    console.log(`Received ${event} on ${tableName}:`, payload);
                    callback(payload);
                }
            )
            .subscribe((status) => {
                console.log(`Subscription status for ${tableName}:`, status);
            });

        const subscription = { channel, tableName, event };
        activeSubscriptions.push(subscription);
        return subscription;
    } catch (error) {
        console.error(`Error subscribing to ${tableName}:`, error);
        return null;
    }
}

/**
 * Unsubscribe from a specific table subscription
 */
export function unsubscribeFromTable(subscription: RealtimeSubscription): void {
    try {
        subscription.channel.unsubscribe();
        activeSubscriptions = activeSubscriptions.filter(
            (sub) => sub.channel !== subscription.channel
        );
    } catch (error) {
        console.error(`Error unsubscribing from ${subscription.tableName}:`, error);
    }
}

/**
 * Clean up all active subscriptions
 */
export function cleanupAllSubscriptions(): void {
    activeSubscriptions.forEach((subscription) => {
        try {
            subscription.channel.unsubscribe();
        } catch (error) {
            console.error(
                `Error cleaning up subscription for ${subscription.tableName}:`,
                error
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

  // Return cleanup function
  return () => {
    subscriptions.forEach(unsubscribeFromTable);
  };
}
