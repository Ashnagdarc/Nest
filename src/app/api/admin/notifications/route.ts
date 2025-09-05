import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Admin Notifications API called');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ data: null, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        console.log('📊 Fetching admin notifications with filters:', { unreadOnly, limit });

        // Build the query - admins see ALL notifications in the system
        let query = supabase
            .from('notifications')
            .select(`
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                link,
                metadata,
                category,
                priority,
                expires_at,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    role
                )
            `);

        // Apply filters
        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        // Apply limit if specified
        if (limit && !isNaN(limit)) {
            query = query.limit(limit);
        }

        // Execute the query with ordering
        const { data, error } = await query.order('created_at', { ascending: false });

        // Handle database query errors
        if (error) {
            console.error('❌ Database error fetching admin notifications:', error);
            return NextResponse.json({ data: null, error: `Database error: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Admin notifications fetched successfully:', {
            totalCount: data?.length || 0,
            unreadCount: data?.filter(n => !n.is_read).length || 0
        });

        // Return successful response
        return NextResponse.json({
            data: data || [],
            error: null,
            meta: {
                total: data?.length || 0,
                unread: data?.filter(n => !n.is_read).length || 0
            }
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in GET /api/admin/notifications:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 Admin Create Notification API called');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ data: null, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const body = await request.json();
        const {
            user_id,
            type,
            title,
            message,
            link,
            metadata,
            category,
            priority = 'Normal',
            expires_at
        } = body;

        // Validate required fields
        if (!user_id || !type || !title || !message) {
            return NextResponse.json({
                data: null,
                error: 'Missing required fields: user_id, type, title, message'
            }, { status: 400 });
        }

        console.log('📝 Creating admin notification:', { user_id, type, title });

        // Create the notification
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id,
                type,
                title,
                message,
                link,
                metadata,
                category,
                priority,
                expires_at,
                is_read: false
            })
            .select(`
                id,
                type,
                title,
                message,
                is_read,
                created_at,
                link,
                metadata,
                category,
                priority,
                expires_at,
                profiles:user_id (
                    id,
                    full_name,
                    email,
                    role
                )
            `)
            .single();

        if (error) {
            console.error('❌ Error creating admin notification:', error);
            return NextResponse.json({ data: null, error: `Failed to create notification: ${error.message}` }, { status: 500 });
        }

        console.log('✅ Admin notification created successfully:', data.id);

        return NextResponse.json({
            data,
            error: null
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Exception in POST /api/admin/notifications:', error);
        return NextResponse.json({ data: null, error: msg }, { status: 500 });
    }
}
