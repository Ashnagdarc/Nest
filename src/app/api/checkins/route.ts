import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

type CheckinRow = {
    user_id: string;
};

type ProfileRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        // Use admin client to bypass RLS for this admin-facing endpoint
        const supabase = await createSupabaseAdminClient();
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');

        const offset = (page - 1) * limit;

        // Avoid embedding `profiles` directly because there may be multiple
        // foreign-key relationships between `checkins` and `profiles` which
        // causes Supabase to error when trying to auto-embed. Fetch checkins
        // (including gear details) first, then fetch profiles separately.
        let query = supabase
            .from('checkins')
            .select(`
                *,
                gears!inner (
                    id,
                    name,
                    category,
                    condition,
                    quantity,
                    available_quantity,
                    checked_out_to,
                    current_request_id,
                    due_date
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters if provided
        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching check-ins:', error);
            return NextResponse.json(
                { error: 'Failed to fetch check-ins', details: process.env.NODE_ENV === 'production' ? undefined : (error?.message || String(error)) },
                { status: 500 }
            );
        }

        const checkins = data || [];

        // Collect unique user ids and fetch their profiles
        const userIds = [...new Set((checkins as CheckinRow[]).map((c) => c.user_id).filter(Boolean))];
        let profilesById: Record<string, ProfileRow> = {};
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds);

            if (profilesError) {
                console.error('Error fetching profiles for checkins:', profilesError);
                return NextResponse.json(
                    { error: 'Failed to fetch related profiles', details: process.env.NODE_ENV === 'production' ? undefined : (profilesError?.message || String(profilesError)) },
                    { status: 500 }
                );
            }

            profilesById = (profilesData as ProfileRow[] || []).reduce((acc: Record<string, ProfileRow>, p) => {
                acc[p.id] = p;
                return acc;
            }, {} as Record<string, ProfileRow>);
        }

        // Attach a single profile object onto each checkin as `profiles` (compat with previous embed shape)
        const enriched = (checkins as Array<Record<string, unknown> & CheckinRow>).map((c) => ({
            ...c,
            profiles: profilesById[c.user_id] || null
        }));

        return NextResponse.json({
            checkins: enriched,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching check-ins:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: process.env.NODE_ENV === 'production' ? undefined : (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { user_id, gear_id, request_id, quantity, condition, notes } = await request.json();

        if (!user_id || !gear_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const sanitizedQuantity = Math.max(1, Number(quantity ?? 1));
        if (!Number.isFinite(sanitizedQuantity)) {
            return NextResponse.json(
                { error: 'Invalid quantity' },
                { status: 400 }
            );
        }

        // Check if a pending check-in already exists for this request+gear+user combo
        // This prevents duplicate submissions and racing condition issues
        let duplicateQuery = supabase
            .from('checkins')
            .select('id')
            .eq('gear_id', gear_id)
            .eq('user_id', user_id)
            .eq('status', 'Pending Admin Approval');

        duplicateQuery = request_id
            ? duplicateQuery.eq('request_id', request_id)
            : duplicateQuery.is('request_id', null);

        const { data: existingPendingCheckins, error: checkError } = await duplicateQuery.limit(1);

        // If we got a record (not a 404 error), this gear is already being checked in
        if (!checkError && existingPendingCheckins && existingPendingCheckins.length > 0) {
            return NextResponse.json(
                { 
                    error: 'This gear is already pending check-in approval',
                    code: 'DUPLICATE_PENDING_CHECKIN',
                    checkinId: existingPendingCheckins[0].id
                },
                { status: 409 } // 409 Conflict
            );
        }

        // Create the check-in record with status 'Pending Admin Approval'
        // The database trigger will update available_quantity automatically
        const { data, error } = await supabase
            .from('checkins')
            .insert([{
                user_id,
                gear_id,
                request_id: request_id || null,
                action: 'Check In',
                quantity: sanitizedQuantity,
                condition: condition || 'Good',
                notes,
                status: 'Pending Admin Approval'
            }])
            .select();

        if (error) {
            // Handle unique constraint violation from the database
            if (
                error.code === '23505' ||
                error.message?.includes('idx_unique_pending_checkin_per_request_gear_user') ||
                error.message?.includes('idx_unique_pending_checkin_per_gear')
            ) {
                return NextResponse.json(
                    { 
                        error: 'This gear is already pending check-in approval from you',
                        code: 'DUPLICATE_PENDING_CHECKIN'
                    },
                    { status: 409 }
                );
            }

            console.error('Error creating check-in:', error);
            return NextResponse.json(
                { error: 'Failed to create check-in', details: error.message },
                { status: 500 }
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: 'Check-in created but no data returned' },
                { status: 500 }
            );
        }

        // Notify admins asynchronously — don't block on this
        const baseOrigin = new URL(request.url).origin;
        fetch(`${baseOrigin}/api/notifications/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'INSERT',
                table: 'checkins',
                record: data[0],
            }),
        }).catch(err => console.error('Failed to send checkin notification:', err));

        return NextResponse.json({ checkin: data[0] }, { status: 201 });
    } catch (error) {
        console.error('Unexpected error creating check-in:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred', details: String(error) },
            { status: 500 }
        );
    }
} 
