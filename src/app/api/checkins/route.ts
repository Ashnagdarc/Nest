import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = await createSupabaseServerClient();
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');

        const offset = (page - 1) * limit;

        let query = supabase
            .from('checkins')
            .select(`
                *,
                profiles (
                    id,
                    full_name,
                    avatar_url
                ),
                gears!inner (
                    id,
                    name,
                    category,
                    condition,
                    quantity,
                    gear_states!inner (
                        status,
                        available_quantity,
                        checked_out_to,
                        due_date
                    )
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
                { error: 'Failed to fetch check-ins' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            checkins: data || [],
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
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { user_id, gear_id, condition, notes } = await request.json();

        if (!user_id || !gear_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if a pending check-in already exists for this gear+user combo
        // This prevents duplicate submissions and racing condition issues
        const { data: existingCheckin, error: checkError } = await supabase
            .from('checkins')
            .select('id')
            .eq('gear_id', gear_id)
            .eq('user_id', user_id)
            .eq('status', 'Pending Admin Approval')
            .single();

        // If we got a record (not a 404 error), this gear is already being checked in
        if (existingCheckin && !checkError) {
            return NextResponse.json(
                { 
                    error: 'This gear is already pending check-in approval',
                    code: 'DUPLICATE_PENDING_CHECKIN',
                    checkinId: existingCheckin.id
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
                action: 'Check In',
                condition: condition || 'Good',
                notes,
                status: 'Pending Admin Approval'
            }])
            .select();

        if (error) {
            // Handle unique constraint violation from the database
            if (error.code === '23505' || error.message?.includes('idx_unique_pending_checkin_per_gear')) {
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
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/trigger`, {
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