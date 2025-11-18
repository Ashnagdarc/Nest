import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Use anon client (respects session cookie and RLS policies)
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { token, client_info } = body || {};

    if (!token) return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });

    // Upsert the token for the authenticated user. Use token as unique key.
    const record = {
      user_id: user.id,
      token,
      client_info: client_info || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[register-push] upsert record:', { user_id: record.user_id, token_preview: token?.slice?.(0,8) });

    // Upsert: if token exists, update it; otherwise insert
    // Supabase JS SDK requires onConflict array to specify which column triggers the conflict
    const { data, error } = await supabase
      .from('user_push_tokens')
      .upsert(record, { onConflict: 'token' });
    if (error) {
      console.error('[register-push] upsert error', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'DB error',
        ...(process.env.NODE_ENV === 'development' && { details: error })
      }, { status: 500 });
    }

    console.log('[register-push] token registered successfully:', { user_id: record.user_id, token_preview: token?.slice?.(0,8) });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[register-push] error', err);
    const body: any = { success: false, error: err.message || 'Unknown error' };
    if (process.env.NODE_ENV === 'development') body.stack = err.stack;
    return NextResponse.json(body, { status: 500 });
  }
}
