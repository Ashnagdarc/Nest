import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const supabase = await createSupabaseServerClient();
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
        const userId = searchParams.get('userId');

        const offset = (page - 1) * limit;

        const query = supabase
            .from('announcements')
            .select('*, profiles(full_name, avatar_url)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // If userId is provided, filter for read status
        if (userId) {
            // Create a different query for read announcements
            const { data, error, count } = await supabase
                .from('announcements')
                .select(`
          *, 
          profiles(full_name, avatar_url),
          read_announcements!inner(id, user_id, announcement_id)
        `, { count: 'exact' })
                .eq('read_announcements.user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error fetching read announcements:', error);
                return NextResponse.json(
                    { error: 'Failed to fetch announcements' },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                announcements: data || [],
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: count ? Math.ceil(count / limit) : 0
                }
            });
        }

        // Original query for all announcements
        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching announcements:', error);
            return NextResponse.json(
                { error: 'Failed to fetch announcements' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            announcements: data || [],
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error('Unexpected error fetching announcements:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { title, content, author_id } = await request.json();

        if (!title || !content || !author_id) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('announcements')
            .insert([{ title, content, author_id }])
            .select();

        if (error) {
            console.error('Error creating announcement:', error);
            return NextResponse.json(
                { error: 'Failed to create announcement' },
                { status: 500 }
            );
        }

        return NextResponse.json({ announcement: data[0] });
    } catch (error) {
        console.error('Unexpected error creating announcement:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
} 