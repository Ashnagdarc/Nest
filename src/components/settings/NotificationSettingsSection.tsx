"use client";

import { useEffect, useState } from "react";
import { Bell, Mail, MonitorSmartphone, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { apiPatch } from "@/lib/apiClient";
import {
  NOTIFICATION_EVENTS,
  type NotificationChannel,
  type NotificationPreferences,
  mergeNotificationPreferences,
} from "./types";

interface NotificationSettingsSectionProps {
  preferences: NotificationPreferences;
  onPreferencesChange: (prefs: NotificationPreferences) => void;
}

const CHANNEL_META: Record<
  NotificationChannel,
  { title: string; description: string; icon: typeof Mail }
> = {
  email: {
    title: "Email",
    description: "Messages sent to your account email.",
    icon: Mail,
  },
  in_app: {
    title: "In-app",
    description: "Alerts inside Nest (notifications page).",
    icon: MonitorSmartphone,
  },
  push: {
    title: "Push",
    description: "Browser notifications on this device.",
    icon: Smartphone,
  },
};

export function NotificationSettingsSection({
  preferences,
  onPreferencesChange,
}: NotificationSettingsSectionProps) {
  const { toast } = useToast();
  const {
    enable: enablePush,
    isSupported: isPushSupported,
    permission: pushPermission,
    subscription: pushSubscription,
    isRegisteredOnServer,
    checkSubscription,
  } = usePushNotifications();

  const [isSyncingPush, setIsSyncingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  useEffect(() => {
    if (pushPermission === "granted") {
      setIsSyncingPush(true);
      checkSubscription().finally(() => setIsSyncingPush(false));
    }
  }, [pushPermission, checkSubscription]);

  const persistPreferences = async (next: NotificationPreferences) => {
    onPreferencesChange(next);
    const { error } = await apiPatch<{ data: unknown; error: string | null }>("/api/users/profile", {
      notification_preferences: next,
    });
    if (error) {
      toast({
        title: "Save failed",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Notification preferences saved" });
    }
  };

  const handleToggle = (channel: NotificationChannel, eventKey: string, checked: boolean) => {
    const next = mergeNotificationPreferences({
      ...preferences,
      [channel]: {
        ...preferences[channel],
        [eventKey]: checked,
      },
    });
    void persistPreferences(next);
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      const result = await enablePush();
      if (!result.success) throw new Error(result.error);
      toast({
        title: "Push enabled",
        description: "This device can now receive push notifications.",
      });
    } catch (error) {
      toast({
        title: "Push activation failed",
        description: error instanceof Error ? error.message : "Check browser notification permissions.",
        variant: "destructive",
      });
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      const res = await fetch("/api/notifications/test-push", { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send test push.");
      toast({ title: "Test sent", description: "You should see a notification shortly." });
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Could not send test notification.",
        variant: "destructive",
      });
    } finally {
      setIsTestingPush(false);
    }
  };

  const pushReady = pushPermission === "granted" && Boolean(pushSubscription) && isRegisteredOnServer;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>Control how Nest reaches you for gear and system events.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {(["email", "in_app", "push"] as NotificationChannel[]).map((channel) => {
          const meta = CHANNEL_META[channel];
          const Icon = meta.icon;
          const isPushChannel = channel === "push";

          return (
            <section key={channel} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold">{meta.title}</h3>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
              </div>

              {isPushChannel && isPushSupported && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                  {isSyncingPush ? (
                    <p className="text-sm text-muted-foreground">Checking device registration…</p>
                  ) : pushReady ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Badge variant="secondary" className="w-fit">
                        Active on this device
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isTestingPush}
                        onClick={() => void handleTestPush()}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {isTestingPush ? "Sending…" : "Send test"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <p className="text-sm text-muted-foreground flex-1">
                        {pushPermission === "granted"
                          ? "Permission granted — finish syncing this device."
                          : "Enable push to get alerts when you are not in the app."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isEnablingPush}
                        onClick={() => void handleEnablePush()}
                      >
                        {isEnablingPush ? "Enabling…" : "Enable push"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isPushChannel && !isPushSupported && (
                <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-3 py-2">
                  Push notifications are not supported in this browser.
                </p>
              )}

              <div className="space-y-2">
                {NOTIFICATION_EVENTS.map((event) => (
                  <div
                    key={`${channel}-${event.key}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <Label htmlFor={`${channel}-${event.key}`} className="cursor-pointer space-y-0.5">
                      <span className="text-sm font-medium">{event.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {event.description}
                      </span>
                    </Label>
                    <Switch
                      id={`${channel}-${event.key}`}
                      checked={preferences[channel]?.[event.key] ?? true}
                      disabled={isPushChannel && (!isPushSupported || !pushReady)}
                      onCheckedChange={(checked) => handleToggle(channel, event.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
