import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requestId } = body as { requestId?: string };
        if (!requestId) {
            return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
        }

        // Create direct Supabase client with service role key to bypass RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Load request first
        const { data: req, error } = await supabase
            .from('gear_requests')
            .select('id, user_id, reason, destination, expected_duration, created_at')
            .eq('id', requestId)
            .single();
        if (error || !req) {
            return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }

        // Then load gear request gears separately
        const { data: gearRequestGears, error: gearError } = await supabase
            .from('gear_request_gears')
            .select('gear_id, quantity')
            .eq('gear_request_id', requestId);
        if (gearError) {
            return NextResponse.json({ success: false, error: 'Failed to load gear data' }, { status: 500 });
        }

        const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name, notification_preferences')
            .eq('id', req.user_id)
            .single();

        // Build gear list string
        let gearList = 'equipment';
        if (Array.isArray(gearRequestGears) && gearRequestGears.length) {
            const ids = gearRequestGears.map((g: any) => g.gear_id);
            const { data: gears } = await supabase
                .from('gears')
                .select('id, name')
                .in('id', ids);
            if (gears && gears.length) {
                // Aggregate by name x quantity
                const counts: Record<string, number> = {};
                for (const g of gearRequestGears as any[]) {
                    const found = gears.find(x => x.id === g.gear_id);
                    if (!found) continue;
                    const key = found.name;
                    counts[key] = (counts[key] || 0) + Math.max(1, Number(g.quantity ?? 1));
                }
                gearList = Object.entries(counts).map(([name, q]) => `${name} x ${q}`).join(', ');
            }
        }

        // If email service not configured, log and bail gracefully
        if (!process.env.RESEND_API_KEY) {
            console.warn('[Email Service] RESEND_API_KEY not configured - skipping request created emails');
            return NextResponse.json({ success: false, error: 'Email service not configured' });
        }

        // User email - respect notification preferences (default: enabled)
        if (user?.email) {
            // Get user's notification preferences - default to true if not explicitly disabled
            const userPrefs = (user as any).notification_preferences || {};
            const shouldSendEmail = userPrefs.email?.gear_requests !== false; // Default true
            
            if (shouldSendEmail) {
                await sendGearRequestEmail({
                    to: user.email,
                    subject: '✅ We received your gear request',
                    html: `<p>Hi ${user.full_name || 'there'},</p>
                           <p>We received your request for: <strong>${gearList}</strong>.</p>
                           <p>Reason: ${req.reason || '-'} | Destination: ${req.destination || '-'} | Duration: ${req.expected_duration || '-'}</p>
                           <p>We will notify you when it is approved.</p>`
                });
            }
        }

        // Admin email(s): find admins from profiles
        const { data: admins } = await supabase
            .from('profiles')
            .select('email, full_name, role')
            .eq('role', 'Admin');
        if (admins && admins.length) {
            for (const admin of admins) {
                if (!admin.email) continue;
                await sendGearRequestEmail({
                    to: admin.email,
                    subject: '🆕 New gear request submitted',
                    html: `<p>New request #${req.id} submitted by ${user?.full_name || 'User'}.</p>
                           <p>Items: <strong>${gearList}</strong></p>
                           <p>Reason: ${req.reason || '-'} | Destination: ${req.destination || '-'} | Duration: ${req.expected_duration || '-'}</p>`
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Request Created Email] Error:', err);
        return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
}


