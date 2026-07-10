export type NotificationChannel = "email" | "in_app" | "push";

export type NotificationEventKey =
  | "gear_requests"
  | "gear_approvals"
  | "gear_rejections"
  | "gear_checkins"
  | "gear_checkouts"
  | "overdue_reminders"
  | "maintenance_alerts"
  | "system_notifications";

export type NotificationPreferences = Record<
  NotificationChannel,
  Partial<Record<NotificationEventKey, boolean>>
>;

export const NOTIFICATION_EVENTS: Array<{
  key: NotificationEventKey;
  label: string;
  description: string;
}> = [
  { key: "gear_requests", label: "Gear requests", description: "Updates when you request equipment" },
  { key: "gear_approvals", label: "Request approvals", description: "When a request is approved" },
  { key: "gear_rejections", label: "Request rejections", description: "When a request is rejected" },
  { key: "gear_checkins", label: "Check-ins", description: "Return and check-in activity" },
  { key: "gear_checkouts", label: "Check-outs", description: "When gear is checked out to you" },
  { key: "overdue_reminders", label: "Overdue reminders", description: "Reminders before gear is due" },
  { key: "maintenance_alerts", label: "Maintenance alerts", description: "Equipment maintenance notices" },
  { key: "system_notifications", label: "System alerts", description: "Security and system messages" },
];

export function defaultNotificationPreferences(): NotificationPreferences {
  const channelDefaults = NOTIFICATION_EVENTS.reduce(
    (acc, event) => {
      acc[event.key] = true;
      return acc;
    },
    {} as Partial<Record<NotificationEventKey, boolean>>,
  );

  return {
    email: { ...channelDefaults },
    in_app: { ...channelDefaults },
    push: { ...channelDefaults },
  };
}

export function mergeNotificationPreferences(
  raw: Partial<NotificationPreferences> | null | undefined,
): NotificationPreferences {
  const defaults = defaultNotificationPreferences();
  return {
    email: { ...defaults.email, ...(raw?.email ?? {}) },
    in_app: { ...defaults.in_app, ...(raw?.in_app ?? {}) },
    push: { ...defaults.push, ...(raw?.push ?? {}) },
  };
}

export type UserProfileSettings = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  department: string | null;
  role: string | null;
  status: string | null;
  notification_preferences: NotificationPreferences | null;
  created_at?: string | null;
  updated_at?: string | null;
};
