import type { Json } from '@/types/supabase'

/** Narrow Json notification preference blobs used across the app. */
export type NotificationPrefsJson = {
  email?: Record<string, boolean | undefined>
  in_app?: Record<string, boolean | undefined>
  push?: Record<string, boolean | undefined>
}

export function asNotificationPrefs(value: Json | null | undefined): NotificationPrefsJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as NotificationPrefsJson
}

export function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}
