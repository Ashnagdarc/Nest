type ValidNotificationType =
  | 'Request'
  | 'Approval'
  | 'Rejection'
  | 'Reminder'
  | 'System'
  | 'Maintenance'
  | 'Overdue';

type NotificationInsertLike = {
  type?: string | null;
  metadata?: Record<string, unknown> | null;
  category?: string | null;
};

const VALID_NOTIFICATION_TYPES: readonly ValidNotificationType[] = [
  'Request',
  'Approval',
  'Rejection',
  'Reminder',
  'System',
  'Maintenance',
  'Overdue',
] as const;

const CASE_INSENSITIVE_VALID_TYPE_MAP: Record<string, ValidNotificationType> = {
  request: 'Request',
  approval: 'Approval',
  rejection: 'Rejection',
  reminder: 'Reminder',
  system: 'System',
  maintenance: 'Maintenance',
  overdue: 'Overdue',
};

const LEGACY_NOTIFICATION_TYPE_MAP: Record<string, ValidNotificationType> = {
  announcement: 'System',
  'login alert': 'System',
  security: 'System',
  'due soon': 'Reminder',
  'pending alert': 'Request',
  'office closing': 'Reminder',
  cancellation: 'System',
};

export function isValidNotificationType(type: string): type is ValidNotificationType {
  return VALID_NOTIFICATION_TYPES.includes(type as ValidNotificationType);
}

export function normalizeNotificationType(type: string | null | undefined): ValidNotificationType {
  const rawType = typeof type === 'string' ? type.trim() : '';

  if (isValidNotificationType(rawType)) {
    return rawType;
  }

  const normalizedKey = rawType.toLowerCase();

  if (CASE_INSENSITIVE_VALID_TYPE_MAP[normalizedKey]) {
    return CASE_INSENSITIVE_VALID_TYPE_MAP[normalizedKey];
  }

  if (LEGACY_NOTIFICATION_TYPE_MAP[normalizedKey]) {
    return LEGACY_NOTIFICATION_TYPE_MAP[normalizedKey];
  }

  return 'System';
}

export function normalizeNotificationInsert<T extends NotificationInsertLike>(payload: T): T {
  const originalType = typeof payload.type === 'string' ? payload.type.trim() : '';
  const normalizedType = normalizeNotificationType(originalType);

  if (!originalType || originalType === normalizedType) {
    return {
      ...payload,
      type: normalizedType,
    };
  }

  const metadata =
    payload.metadata && !Array.isArray(payload.metadata)
      ? { ...payload.metadata }
      : {};

  metadata.notification_type_original = originalType;
  metadata.notification_type_normalized = normalizedType;

  return {
    ...payload,
    type: normalizedType,
    metadata,
  };
}

