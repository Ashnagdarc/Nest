'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

interface EmailPreferences {
    gear_requests: boolean;
    gear_approvals: boolean;
    gear_rejections: boolean;
    gear_checkins: boolean;
    gear_checkouts: boolean;
    overdue_reminders: boolean;
    maintenance_alerts: boolean;
    system_notifications: boolean;
}

interface NotificationSettingsProps {
    userId: string;
}

export default function EmailNotificationSettings({ userId }: NotificationSettingsProps) {
    const [preferences, setPreferences] = useState<EmailPreferences>({
        gear_requests: true,
        gear_approvals: true,
        gear_rejections: true,
        gear_checkins: true,
        gear_checkouts: true,
        overdue_reminders: true,
        maintenance_alerts: true,
        system_notifications: true,
    });
    const savedPreferences = useRef<EmailPreferences>(preferences);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => {
        loadPreferences();
    }, [userId]);

    const loadPreferences = async () => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', userId)
                .single();

            const prefs = profile?.notification_preferences as
                | { email?: Partial<EmailPreferences> }
                | null
                | undefined;

            if (prefs?.email) {
                const next = {
                    gear_requests: prefs.email.gear_requests ?? true,
                    gear_approvals: prefs.email.gear_approvals ?? true,
                    gear_rejections: prefs.email.gear_rejections ?? true,
                    gear_checkins: prefs.email.gear_checkins ?? true,
                    gear_checkouts: prefs.email.gear_checkouts ?? true,
                    overdue_reminders: prefs.email.overdue_reminders ?? true,
                    maintenance_alerts: prefs.email.maintenance_alerts ?? true,
                    system_notifications: prefs.email.system_notifications ?? true,
                };
                savedPreferences.current = next;
                setPreferences(next);
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePreferenceChange = (key: keyof EmailPreferences, value: boolean) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value,
        }));
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            // First, fetch current preferences to preserve other channels (in_app, push)
            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', userId)
                .single();

            const currentPrefs =
                (currentProfile?.notification_preferences as Record<string, unknown> | null) || {};

            // Merge: preserve in_app and push channels, update only email
            const updatedPreferences = {
                ...currentPrefs,
                email: preferences,
            };

            const { error } = await supabase
                .from('profiles')
                .update({
                    notification_preferences: updatedPreferences as unknown as Json,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId);

            if (error) throw error;

            savedPreferences.current = preferences;
            toast({
                title: 'Settings Saved',
                description: 'Your email notification preferences have been updated.',
                variant: 'default',
            });
        } catch (error) {
            console.error('Error saving preferences:', error);
            setPreferences(savedPreferences.current);
            toast({
                title: 'Error',
                description: 'Failed to save notification preferences. The switches were restored.',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const resetToDefaults = () => {
        setPreferences({
            gear_requests: true,
            gear_approvals: true,
            gear_rejections: true,
            gear_checkins: true,
            gear_checkouts: true,
            overdue_reminders: true,
            maintenance_alerts: true,
            system_notifications: true,
        });
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const notificationTypes = [
        {
            key: 'gear_requests' as keyof EmailPreferences,
            title: 'Gear Request Confirmations',
            description: 'Get notified when your equipment requests are received',
            icon: Package,
            category: 'Requests',
        },
        {
            key: 'gear_approvals' as keyof EmailPreferences,
            title: 'Request Approvals',
            description: 'Receive notifications when your requests are approved',
            icon: CheckCircle,
            category: 'Requests',
        },
        {
            key: 'gear_rejections' as keyof EmailPreferences,
            title: 'Request Rejections',
            description: 'Get notified when your requests are rejected with reasons',
            icon: XCircle,
            category: 'Requests',
        },
        {
            key: 'gear_checkins' as keyof EmailPreferences,
            title: 'Check-in Updates',
            description: 'Receive notifications about your equipment check-ins',
            icon: CheckCircle,
            category: 'Returns',
        },
        {
            key: 'gear_checkouts' as keyof EmailPreferences,
            title: 'Check-out Confirmations',
            description: 'Get notified when equipment is successfully checked out',
            icon: Package,
            category: 'Returns',
        },
        {
            key: 'overdue_reminders' as keyof EmailPreferences,
            title: 'Overdue Reminders',
            description: 'Receive urgent reminders for overdue equipment',
            icon: AlertTriangle,
            category: 'Alerts',
        },
        {
            key: 'maintenance_alerts' as keyof EmailPreferences,
            title: 'Maintenance Alerts',
            description: 'Get notified about equipment maintenance and repairs',
            icon: AlertTriangle,
            category: 'Alerts',
        },
        {
            key: 'system_notifications' as keyof EmailPreferences,
            title: 'System Notifications',
            description: 'Receive important system updates and announcements',
            icon: Bell,
            category: 'System',
        },
    ];

    const groupedNotifications = notificationTypes.reduce((acc, notification) => {
        if (!acc[notification.category]) {
            acc[notification.category] = [];
        }
        acc[notification.category].push(notification);
        return acc;
    }, {} as Record<string, typeof notificationTypes>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Email Notifications</h2>
                    <p className="text-muted-foreground">
                        Control which email notifications you receive from Nest
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetToDefaults}>
                        Reset to Defaults
                    </Button>
                    <Button onClick={savePreferences} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {Object.entries(groupedNotifications).map(([category, notifications]) => (
                    <Card key={category}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {category === 'Requests' && <Package className="h-5 w-5" />}
                                {category === 'Returns' && <CheckCircle className="h-5 w-5" />}
                                {category === 'Alerts' && <AlertTriangle className="h-5 w-5" />}
                                {category === 'System' && <Bell className="h-5 w-5" />}
                                {category}
                                <Badge variant="secondary">{notifications.length}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Manage {category.toLowerCase()} related email notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {notifications.map((notification) => {
                                const Icon = notification.icon;
                                return (
                                    <div key={notification.key} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-muted rounded-md">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor={notification.key} className="text-sm font-medium">
                                                    {notification.title}
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    {notification.description}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            id={notification.key}
                                            checked={notification.key === 'overdue_reminders' ? true : preferences[notification.key]}
                                            disabled={notification.key === 'overdue_reminders'}
                                            onCheckedChange={(checked) => handlePreferenceChange(notification.key, checked)}
                                            aria-label={`${notification.title}, ${notification.key === 'overdue_reminders' || preferences[notification.key] ? "on" : "off"}`}
                                        />
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-2">
                            <h3 className="font-medium">Email Delivery</h3>
                            <p className="text-sm text-muted-foreground">
                                All email notifications are sent to your registered email address.
                                You can change your email address in your profile settings.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <strong>Note:</strong> Overdue reminders and critical alerts cannot be disabled
                                for safety and compliance reasons.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
