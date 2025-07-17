"use client";

import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import React from 'react';

const EVENT_TYPES = [
    { key: 'gear_requests', label: 'Gear Requests' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'profile_update', label: 'Profile Updates' },
];
const CHANNELS = [
    { key: 'in_app', label: 'In-App', icon: Bell },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'push', label: 'Push', icon: Smartphone },
];

export default function NotificationSettings() {
    const [preferences, setPreferences] = useState<unknown>({});
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        // Fetch current user preferences
        async function fetchPrefs() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('notification_preferences').eq('id', user.id).single();
                setPreferences(profile?.notification_preferences || {});
            }
            setLoading(false);
        }
        fetchPrefs();
    }, [supabase]);

    const handleToggle = (channel: string, event: string, value: boolean) => {
        setPreferences((prev: unknown) => ({
            ...(prev as any),
            [channel]: {
                ...((prev as any)[channel] || {}),
                [event]: value,
            },
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').update({ notification_preferences: preferences }).eq('id', user.id);
            toast({ title: 'Preferences Saved', description: 'Your notification preferences have been updated.' });
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6 mt-4">
            <h3 className="text-lg font-semibold mb-2">Notification Preferences</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                    <thead>
                        <tr>
                            <th className="p-2 text-left">Event</th>
                            {CHANNELS.map(channel => (
                                <th key={channel.key} className="p-2 text-center">
                                    <span className="flex items-center justify-center gap-1">
                                        {React.createElement(channel.icon, { className: "h-4 w-4" })} {channel.label}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {EVENT_TYPES.map(event => (
                            <tr key={event.key} className="border-t">
                                <td className="p-2 font-medium">{event.label}</td>
                                {CHANNELS.map(channel => (
                                    <td key={channel.key} className="p-2 text-center">
                                        <Switch
                                            checked={!!(preferences as any)?.[channel.key]?.[event.key]}
                                            onCheckedChange={val => handleToggle(channel.key, event.key, val)}
                                            disabled={loading}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button onClick={handleSave} disabled={loading} className="mt-4">
                Save Preferences
            </Button>
        </div>
    );
} 