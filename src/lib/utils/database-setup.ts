import { createClient } from '../supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Database tables that should be verified during setup
 */
export const REQUIRED_TABLES = [
    'gears',
    'gear_requests',
    'gear_checkouts',
    'gear_maintenance',
    'gear_activity_log',
    'profiles',
    'notifications'
];

/**
 * Checks if all required database tables exist
 * @returns Object with missing tables and boolean indicating if setup is complete
 */
export async function verifyDatabaseSetup() {
    try {
        const supabase = createClient();
        const missingTables: string[] = [];

        // Check each required table
        for (const tableName of REQUIRED_TABLES) {
            const { data, error } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .eq('table_name', tableName)
                .single();

            if (error || !data) {
                missingTables.push(tableName);
            }
        }

        return {
            isComplete: missingTables.length === 0,
            missingTables
        };
    } catch (error) {
        console.error('Error verifying database setup:', error);
        return {
            isComplete: false,
            missingTables: [],
            error
        };
    }
}

/**
 * Handles database errors by checking if they're related to missing tables
 * and providing appropriate guidance
 * @param error The error to handle
 * @param tableName The name of the table that was being accessed
 */
export function handleDatabaseError(error: unknown, tableName: string) {
    // Check if the error is because the table doesn't exist
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' &&
        error.message.includes('relation') && error.message.includes('does not exist')) {
        toast({
            title: 'Database Setup Required',
            description: `The ${tableName} table is missing. Please run the database migrations.`,
            variant: 'destructive',
        });

        return {
            isMissingTable: true,
            tableName
        };
    }

    // Regular error
    toast({
        title: 'Database Error',
        description: error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'An unknown database error occurred',
        variant: 'destructive',
    });

    return {
        isMissingTable: false
    };
}

/**
 * Opens the admin database setup page
 */
export function openDatabaseSetupPage() {
    window.location.href = '/admin/settings/database';
} 