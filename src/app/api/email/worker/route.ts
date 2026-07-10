import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_FROM = process.env.RESEND_FROM || 'Nest by Eden Oasis <onboarding@resend.dev>';

export const runtime = 'nodejs';

type EmailLogRow = {
  id: string;
  recipient: string;
  subject: string | null;
  html_body: string | null;
  status: string | null;
  attempt_count: number | null;
  max_retries: number | null;
};

type ClaimedEmailLogRow = {
  id: string;
  attempt_count: number | null;
  max_retries: number | null;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const isBearerAuthorized = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.has('x-vercel-cron');
  // Allow either explicit bearer auth or Vercel cron invocations.
  if (!isBearerAuthorized && !isVercelCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ processed: 0, skipped: true, message: 'RESEND_API_KEY not configured' });
  }

  const supabase = await createSupabaseServerClient(true);
  const runStartedAt = new Date().toISOString();
  const batchSize = Math.max(1, Math.min(100, Number(process.env.EMAIL_WORKER_BATCH_SIZE || 25)));
  const nowIso = new Date().toISOString();

  const { data: dueLogs, error: fetchError } = await supabase
    .from('email_logs')
    .select('id, recipient, subject, html_body, status, attempt_count, max_retries')
    .in('status', ['queued', 'failed'])
    .lte('next_attempt_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    return NextResponse.json({ error: `Failed to fetch email logs: ${fetchError.message}` }, { status: 500 });
  }

  if (!dueLogs || dueLogs.length === 0) {
    await supabase.from('audit_logs').insert({
      actor_id: null,
      entity_type: 'worker',
      entity_id: 'email',
      action: 'run',
      metadata: { route: '/api/email/worker', processed: 0, sent: 0, dead_letter: 0, started_at: runStartedAt },
    });
    return NextResponse.json({ processed: 0, message: 'No due emails' });
  }

  let processed = 0;
  let sent = 0;
  let deadLetter = 0;

  for (const row of (dueLogs || []) as EmailLogRow[]) {
    const claimIso = new Date().toISOString();
    const { data: claimedRows } = await supabase
      .from('email_logs')
      .update({
        status: 'processing',
        attempt_count: Number(row.attempt_count || 0) + 1,
        last_attempt_at: claimIso,
        updated_at: claimIso,
      })
      .eq('id', row.id)
      .in('status', ['queued', 'failed'])
      .select('id, attempt_count, max_retries');

    if (!claimedRows || claimedRows.length === 0) {
      continue;
    }

    const claimed = claimedRows[0] as ClaimedEmailLogRow;
    const attemptsUsed = Number(claimed.attempt_count || 0);
    const maxRetries = Number(claimed.max_retries || 3);

    try {
      if (!row.subject || !row.html_body) {
        throw new Error('Missing subject/html_body for retry email payload');
      }

      const result = await resend.emails.send({
        from: RESEND_FROM,
        to: row.recipient,
        subject: row.subject,
        html: row.html_body,
      });

      const doneIso = new Date().toISOString();
      await supabase.from('email_logs').update({
        status: 'sent',
        provider_message_id: String(result.data?.id || ''),
        error_message: null,
        processed_at: doneIso,
        next_attempt_at: doneIso,
        updated_at: doneIso,
      }).eq('id', row.id);

      sent++;
      processed++;
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : 'Unknown email worker error';
      const doneIso = new Date().toISOString();

      if (attemptsUsed >= maxRetries) {
        await supabase.from('email_logs').update({
          status: 'dead_letter',
          error_message: errMessage,
          processed_at: doneIso,
          updated_at: doneIso,
        }).eq('id', row.id);
        deadLetter++;
      } else {
        const backoffMinutes = Math.min(60, Math.max(1, Math.pow(2, attemptsUsed - 1)));
        const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
        await supabase.from('email_logs').update({
          status: 'failed',
          error_message: errMessage,
          next_attempt_at: nextAttemptAt,
          updated_at: doneIso,
        }).eq('id', row.id);
      }

      processed++;
    }
  }

  await supabase.from('audit_logs').insert({
    actor_id: null,
    entity_type: 'worker',
    entity_id: 'email',
    action: 'run',
    metadata: {
      route: '/api/email/worker',
      processed,
      sent,
      dead_letter: deadLetter,
      started_at: runStartedAt,
      finished_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    processed,
    sent,
    dead_letter: deadLetter,
  });
}
