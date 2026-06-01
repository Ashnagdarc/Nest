import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const isBearerAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.has('x-vercel-cron');

  if (!isBearerAuthorized && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createSupabaseServerClient(true);
    const retentionDays = Math.max(1, Number(process.env.NOTIFICATION_READ_RETENTION_DAYS || 30));
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('updated_at', cutoffIso)
      .select('id');

    if (error) {
      console.error('[Notification Cleanup] Delete failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;

    await (supabase as any).from('audit_logs').insert({
      actor_id: null,
      entity_type: 'worker',
      entity_id: 'notifications_cleanup',
      action: 'cleanup_read_notifications',
      metadata: {
        route: '/api/notifications/cleanup-read',
        retention_days: retentionDays,
        cutoff_iso: cutoffIso,
        deleted_count: deletedCount,
        ran_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, retentionDays, cutoffIso, deletedCount });
  } catch (error: any) {
    console.error('[Notification Cleanup] Function error:', error);
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
