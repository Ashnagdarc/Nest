import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ success: false, error: 'Missing request_id' }, { status: 400 });
    }

    const userClient = await createSupabaseServerClient();
    const { data: auth } = await userClient.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await createSupabaseServerClient(true);

    const { data: reqRow, error: reqErr } = await admin
      .from('gear_requests')
      .select('id, user_id, status')
      .eq('id', request_id)
      .single();

    if (reqErr || !reqRow) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    if (reqRow.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if ((reqRow.status || '').toLowerCase() !== 'pending') {
      return NextResponse.json({ success: false, error: 'Only pending requests can be cancelled' }, { status: 409 });
    }

    const { error: updErr } = await admin
      .from('gear_requests')
      .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
      .eq('id', request_id)
      .eq('user_id', user.id);

    if (updErr) {
      return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
