import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { requestId } = body as { requestId?: string };
        if (!requestId) {
            return NextResponse.json({ success: false, error: 'requestId is required' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient(true);

        // Load request, requester and gear names
        const { data: req, error } = await supabase
            .from('gear_requests')
            .select('id, user_id, reason, destination, expected_duration, created_at, gear_request_gears(gear_id, quantity)')
            .eq('id', requestId)
            .single();
        if (error || !req) {
            return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
        }

        const { data: user } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', req.user_id)
            .single();

        // Build gear list string
        let gearList = 'equipment';
        if (Array.isArray(req.gear_request_gears) && req.gear_request_gears.length) {
            const ids = req.gear_request_gears.map((g: any) => g.gear_id);
            const { data: gears } = await supabase
                .from('gears')
                .select('id, name')
                .in('id', ids);
            if (gears && gears.length) {
                // Aggregate by name x quantity
                const counts: Record<string, number> = {};
                for (const g of req.gear_request_gears as any[]) {
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

        // User email
        if (user?.email) {
            await sendGearRequestEmail({
                to: user.email,
                subject: '✅ We received your gear request',
                html: `<p>Hi ${user.full_name || 'there'},</p>
                       <p>We received your request for: <strong>${gearList}</strong>.</p>
                       <p>Reason: ${req.reason || '-'} | Destination: ${req.destination || '-'} | Duration: ${req.expected_duration || '-'}</p>
                       <p>We will notify you when it is approved.</p>`
            });
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


