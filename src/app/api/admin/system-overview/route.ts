import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        // Use server client with proper auth handling
        const supabase = await createSupabaseServerClient(true);

        // Verify admin access
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'Admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        // Fetch all system statistics in parallel
        const [
            gearsResult,
            usersResult,
            requestsResult,
            checkinsResult,
            storageResult
        ] = await Promise.allSettled([
            // Gear statistics
            supabase
                .from('gears')
                .select('id, available_quantity, status')
                .then(result => {
                    if (result.error) throw result.error;
                    const gears = result.data || [];
                    return {
                        total: gears.length,
                        available: gears.filter(g => g.available_quantity > 0).length,
                        unavailable: gears.filter(g => g.available_quantity === 0).length
                    };
                }),

            // User statistics
            supabase
                .from('profiles')
                .select('id, role')
                .then(result => {
                    if (result.error) throw result.error;
                    const users = result.data || [];
                    return {
                        total: users.length,
                        admins: users.filter(u => u.role === 'Admin').length,
                        regular: users.filter(u => u.role === 'User').length
                    };
                }),

            // Request statistics
            supabase
                .from('gear_requests')
                .select('id, status')
                .then(result => {
                    if (result.error) throw result.error;
                    const requests = result.data || [];
                    return {
                        pending: requests.filter(r => r.status === 'Pending').length,
                        approved: requests.filter(r => r.status === 'Approved').length,
                        rejected: requests.filter(r => r.status === 'Rejected').length
                    };
                }),

            // Active sessions (approximate)
            supabase
                .from('profiles')
                .select('id, updated_at')
                .gte('updated_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
                .then(result => {
                    if (result.error) throw result.error;
                    return result.data?.length || 0;
                }),

            // Storage usage (approximate)
            supabase.storage
                .from('gear_images')
                .list('', { limit: 1000 })
                .then(result => {
                    if (result.error) throw result.error;
                    // Rough estimate: assume average 2MB per image
                    return (result.data?.length || 0) * 2;
                })
        ]);

        // Extract results safely
        const gears = gearsResult.status === 'fulfilled' ? gearsResult.value : { total: 0, available: 0, unavailable: 0 };
        const users = usersResult.status === 'fulfilled' ? usersResult.value : { total: 0, admins: 0, regular: 0 };
        const requests = requestsResult.status === 'fulfilled' ? requestsResult.value : { pending: 0, approved: 0, rejected: 0 };
        const activeSessions = checkinsResult.status === 'fulfilled' ? checkinsResult.value : 0;
        const storageUsed = storageResult.status === 'fulfilled' ? storageResult.value : 0;

        // Determine system health
        let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (gears.unavailable > gears.total * 0.1) { // More than 10% unavailable
            systemHealth = 'warning';
        }
        if (gears.unavailable > gears.total * 0.2 || requests.pending > 20) { // More than 20% unavailable or many pending requests
            systemHealth = 'critical';
        }

        // Get last backup info (if available)
        const { data: backupSettings } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'last_backup')
            .single();

        const systemStats = {
            totalGears: gears.total,
            availableGears: gears.available,
            unavailableGears: gears.unavailable,
            totalUsers: users.total,
            adminUsers: users.admins,
            regularUsers: users.regular,
            pendingRequests: requests.pending,
            approvedRequests: requests.approved,
            rejectedRequests: requests.rejected,
            systemHealth,
            lastBackup: backupSettings?.value || null,
            storageUsed,
            activeSessions
        };

        return NextResponse.json({
            success: true,
            data: systemStats
        });

    } catch (error) {
        console.error('Error fetching system overview:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}
