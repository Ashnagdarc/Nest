import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        const envReport = {
            NODE_ENV: process.env.NODE_ENV,
            NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
            VAPID_PUBLIC_KEY_Status: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Present' : 'Missing',
            VAPID_PRIVATE_KEY_Status: process.env.VAPID_PRIVATE_KEY ? 'Present' : 'Missing',
            SUPABASE_SERVICE_ROLE_KEY_Status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing',
        };

        let tokenReport: any = 'Unauthorized';

        if (user) {
            const { data } = await supabase
                .from('user_push_tokens')
                .select('token, updated_at')
                .eq('user_id', user.id);

            tokenReport = {
                count: data?.length || 0,
                details: data?.map((row: any) => {
                    try {
                        const parsed = typeof row.token === 'string' ? JSON.parse(row.token) : row.token;
                        return {
                            type: 'web-push',
                            endpoint_origin: new URL(parsed.endpoint).origin,
                            updated: row.updated_at
                        };
                    } catch (e) {
                        return { type: 'fcm-legacy', valid: !!row.token };
                    }
                })
            };
        }

        return NextResponse.json({
            status: 'Diagnostic Online',
            environment: envReport,
            user_id: user?.id || 'Not Logged In',
            tokens: tokenReport
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
