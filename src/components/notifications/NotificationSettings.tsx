"use client";

import { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from 'lucide-react';
import { toggleSounds, areSoundsEnabled, loadSoundPreferences } from '@/lib/soundUtils';
import { Button } from '@/components/ui/button';

export default function NotificationSettings() {
    const [soundsEnabled, setSoundsEnabled] = useState(true);

    // Load preferences on mount
    useEffect(() => {
        loadSoundPreferences();
        setSoundsEnabled(areSoundsEnabled());
    }, []);

    const handleToggleSound = (enabled: boolean) => {
        setSoundsEnabled(enabled);
        toggleSounds(enabled);
    };

    return (
        <div className="flex items-center space-x-2 mt-2">
            <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-4">
                    <Switch
                        id="notification-sounds"
                        checked={soundsEnabled}
                        onCheckedChange={handleToggleSound}
                    />
                    <Label htmlFor="notification-sounds" className="flex items-center gap-2">
                        {soundsEnabled ? (
                            <>
                                <Bell className="h-4 w-4" />
                                <span>Notification Sounds Enabled</span>
                            </>
                        ) : (
                            <>
                                <BellOff className="h-4 w-4" />
                                <span>Notification Sounds Disabled</span>
                            </>
                        )}
                    </Label>
                </div>

                <div className="text-xs text-muted-foreground ml-12">
                    {soundsEnabled
                        ? "You'll hear a sound when new notifications arrive and when you log in with unread announcements."
                        : "No sounds will be played for notifications. Turn this on to hear notification alerts."}
                </div>

                {/* Test sound button - only visible when sounds are enabled */}
                {soundsEnabled && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-[180px] ml-12"
                        onClick={() => import('@/lib/soundUtils').then(utils => utils.playNotificationSound('bell'))}
                    >
                        <Bell className="h-3 w-3 mr-2" />
                        Test Sound
                    </Button>
                )}
            </div>
        </div>
    );
} 