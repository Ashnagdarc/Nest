import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type QueueOptions = {
  requestUrl?: string;
  triggerWorker?: boolean;
  context?: string;
};

const DEFAULT_TRIGGER_TIMEOUT_MS = 2500;

const resolveBaseUrl = (requestUrl?: string): string | null => {
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // ignore
    }
  }

  const explicitBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    null;

  if (explicitBase) {
    return explicitBase.replace(/\/+$/, '');
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
};

export async function triggerPushWorker(options: { requestUrl?: string; context?: string } = {}) {
  const baseUrl = resolveBaseUrl(options.requestUrl);
  if (!baseUrl) {
    return;
  }

  const headers: Record<string, string> = {};
  if (process.env.CRON_SECRET) {
    headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TRIGGER_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/push/worker`, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 401) {
      console.warn(`[${options.context || 'Push Queue'}] Worker trigger failed with status ${response.status}`);
    }
  } catch (error) {
    console.warn(`[${options.context || 'Push Queue'}] Worker trigger error:`, error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function enqueuePushNotification(
  supabase: SupabaseClient<Database>,
  payload: PushPayload,
  options: QueueOptions = {}
) {
  const { userId, title, body, data } = payload;
  const context = options.context || 'Push Queue';

  if (!userId || !title || !body) {
    return { success: false, error: 'Missing required push payload fields' as const };
  }

  const { error } = await supabase.from('push_notification_queue').insert({
    user_id: userId,
    title,
    body,
    data: data || {},
    status: 'pending',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (options.triggerWorker !== false) {
    void triggerPushWorker({ requestUrl: options.requestUrl, context });
  }

  return { success: true as const };
}
