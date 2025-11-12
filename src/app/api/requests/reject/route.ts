import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendGearRequestRejectionEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export async function POST(req: Request) {
    try {
        const { requestId, reason } = await req.json();
        if (!requestId || typeof requestId !== 'string') {
            return NextResponse.json({ success: false, error: 'Missing requestId' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // Fetch request details first for email
        const { data: requestData } = await supabase
            .from('gear_requests')
            .select('user_id, reason, destination')
            .eq('id', requestId)
            .single();

        const { error } = await supabase
            .from('gear_requests')
            .update({
                status: 'Rejected',
                admin_notes: reason ?? null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        // Send rejection email to user
        try {
            if (requestData?.user_id) {
                // Get user profile
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('email, full_name')
                    .eq('id', requestData.user_id)
                    .single();

                if (userProfile?.email) {
                    // Get admin client to fetch gear details
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
                    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
                    const adminSupabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
                        auth: { autoRefreshToken: false, persistSession: false }
                    });

                    // Fetch gear names from junction table
                    const { data: gearRequestGears } = await adminSupabase
                        .from('gear_request_gears')
                        .select('gear_id, quantity')
                        .eq('gear_request_id', requestId);

                    const gearListFormatted: Array<{ name: string; quantity: number }> = [];
                    if (gearRequestGears) {
                        for (const grg of gearRequestGears) {
                            const { data: gear } = await adminSupabase
                                .from('gears')
                                .select('name')
                                .eq('id', grg.gear_id)
                                .single();
                            if (gear) {
                                gearListFormatted.push({ 
                                    name: gear.name, 
                                    quantity: Math.max(1, Number(grg.quantity ?? 1))
                                });
                            }
                        }
                    }

                    await sendGearRequestRejectionEmail({
                        to: userProfile.email,
                        userName: userProfile.full_name || 'User',
                        gearList: gearListFormatted,
                        reason: reason || undefined,
                        requestReason: requestData.reason || undefined,
                        destination: requestData.destination || undefined,
                    });
                }
            }
        } catch (emailError) {
            console.warn('Failed to send gear rejection email:', emailError);
            // Don't fail the request if email fails
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
