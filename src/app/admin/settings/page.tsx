"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSettingsSection } from "@/components/admin/settings/AppSettingsSection";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { PasswordSettingsSection } from "@/components/settings/PasswordSettingsSection";
import {
    ProfileSettingsSection,
    type ProfileFormValues,
} from "@/components/settings/ProfileSettingsSection";
import { SettingsSkeleton } from "@/components/settings/SettingsSkeleton";
import {
    mergeNotificationPreferences,
    type NotificationPreferences,
    type UserProfileSettings,
} from "@/components/settings/types";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch } from "@/lib/apiClient";

export default function AdminSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { refreshProfile } = useUserProfile();

    const [profile, setProfile] = useState<UserProfileSettings | null>(null);
    const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
        mergeNotificationPreferences(null),
    );
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await apiGet<{ data: UserProfileSettings | null; error: string | null }>(
                "/api/users/profile",
            );
            if (error) throw new Error(error);
            if (!data) throw new Error("Profile not found");

            if (data.role !== "Admin") {
                toast({
                    title: "Unauthorized",
                    description: "You do not have permission to view admin settings.",
                    variant: "destructive",
                });
                router.replace("/admin/dashboard");
                return;
            }

            setProfile(data);
            setNotificationPreferences(mergeNotificationPreferences(data.notification_preferences));
        } catch (error) {
            console.error("Failed to load admin settings:", error);
            toast({
                title: "Could not load settings",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [router, toast]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const handleProfileSave = async (values: ProfileFormValues, avatarFile?: File) => {
        if (!profile) return;
        setSavingProfile(true);

        try {
            let avatarUrl = profile.avatar_url;

            if (avatarFile) {
                const formData = new FormData();
                formData.append("file", avatarFile);
                const uploadResponse = await fetch("/api/users/avatar", {
                    method: "POST",
                    body: formData,
                });
                if (!uploadResponse.ok) {
                    const payload = await uploadResponse.json().catch(() => ({}));
                    throw new Error(
                        typeof payload.error === "string" ? payload.error : "Could not upload profile picture.",
                    );
                }
                const payload = await uploadResponse.json();
                avatarUrl = payload.url || avatarUrl;
            }

            const { data, error } = await apiPatch<{ data: UserProfileSettings | null; error: string | null }>(
                "/api/users/profile",
                {
                    full_name: values.fullName,
                    phone: values.phone || null,
                    department: values.department || null,
                    avatar_url: avatarUrl,
                },
            );

            if (error) throw new Error(error);
            if (data) {
                setProfile(data);
                setNotificationPreferences(mergeNotificationPreferences(data.notification_preferences));
            }

            toast({
                title: "Profile updated",
                description: "Your changes have been saved.",
            });
            await refreshProfile();
        } catch (error) {
            toast({
                title: "Update failed",
                description: error instanceof Error ? error.message : "Could not update profile.",
                variant: "destructive",
            });
        } finally {
            setSavingProfile(false);
        }
    };

    if (loading) return <SettingsSkeleton />;

    if (!profile) {
        return (
            <div className="mx-auto w-full max-w-5xl rounded-xl border border-dashed border-border px-6 py-16 text-center">
                <p className="text-muted-foreground">Could not load admin settings. Try signing in again.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-5xl space-y-6">
            <header className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Settings className="h-5 w-5" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin settings</h1>
                </div>
                <p className="text-sm text-muted-foreground sm:pl-[52px]">
                    Your account, notifications, and organisation-wide gear rules.
                </p>
            </header>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="app">App</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                    <ProfileSettingsSection
                        profile={profile}
                        saving={savingProfile}
                        onSave={handleProfileSave}
                    />
                </TabsContent>

                <TabsContent value="security">
                    <PasswordSettingsSection saving={savingPassword} onSavingChange={setSavingPassword} />
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationSettingsSection
                        preferences={notificationPreferences}
                        onPreferencesChange={setNotificationPreferences}
                    />
                </TabsContent>

                <TabsContent value="app">
                    <AppSettingsSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}
