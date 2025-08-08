/**
 * Request Status History Utilities
 * 
 * Provides functions to log and manage request status changes for audit trail.
 * This ensures all status changes are tracked with who made the change and when.
 */

import { createClient } from '@/lib/supabase/client';
import { RequestStatusHistoryInsert } from '@/types/supabase';

/**
 * Log a status change to the request_status_history table
 * 
 * @param requestId - The ID of the request being updated
 * @param newStatus - The new status being set
 * @param changedBy - The ID of the user making the change
 * @param note - Optional note about the status change
 * @returns Promise<boolean> - Success status
 */
export async function logRequestStatusChange(
    requestId: string,
    newStatus: string,
    changedBy: string,
    note?: string
): Promise<boolean> {
    try {
        const supabase = createClient();

        const historyEntry: RequestStatusHistoryInsert = {
            request_id: requestId,
            status: newStatus,
            changed_by: changedBy,
            note: note || null,
            changed_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('request_status_history')
            .insert(historyEntry);

        if (error) {
            console.error('Error logging request status change:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Exception logging request status change:', error);
        return false;
    }
}

/**
 * Get the status history for a specific request
 * 
 * @param requestId - The ID of the request
 * @returns Promise<RequestStatusHistory[]> - Array of status history entries
 */
export async function getRequestStatusHistory(requestId: string) {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('request_status_history')
            .select(`
                *,
                changed_by_user:profiles!request_status_history_changed_by_fkey(
                    id,
                    full_name,
                    email
                )
            `)
            .eq('request_id', requestId)
            .order('changed_at', { ascending: true });

        if (error) {
            console.error('Error fetching request status history:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Exception fetching request status history:', error);
        return [];
    }
}

/**
 * Get the latest status change for a request
 * 
 * @param requestId - The ID of the request
 * @returns Promise<RequestStatusHistory | null> - Latest status history entry
 */
export async function getLatestRequestStatusChange(requestId: string) {
    try {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('request_status_history')
            .select(`
                *,
                changed_by_user:profiles!request_status_history_changed_by_fkey(
                    id,
                    full_name,
                    email
                )
            `)
            .eq('request_id', requestId)
            .order('changed_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching latest request status change:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Exception fetching latest request status change:', error);
        return null;
    }
}
