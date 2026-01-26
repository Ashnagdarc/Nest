"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, User, Lock, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client'; // Import Supabase client
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { apiGet } from '@/lib/apiClient';
import { isFileList, isFile } from '@/lib/utils/browser-safe';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// --- Schemas ---
const phoneRegex = new RegExp(
    /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/
);

const profileSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
    email: z.string().email(), // Display only
    phone: z.string().regex(phoneRegex, { message: 'Invalid phone number format.' }).optional().or(z.literal('')),
    department: z.string().optional(),
    profilePicture: z.any().optional(),
});

const passwordSchema = z.object({
    // currentPassword field removed for Supabase update flow
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
    confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// Define custom types for database entities
type Profile = {
    id: string;
    email?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    department?: string | null;
    role?: string;
    updated_at?: string;
    [key: string]: any; // Allow for additional properties
};

type ProfileUpdate = {
    full_name?: string | null;
    phone?: string | null;
    department?: string | null;
    avatar_url?: string | null;
    updated_at?: string;
    [key: string]: any; // Allow for additional update properties
};

// Add at the top:
const PROFILE_FORM_DRAFT_KEY = "user-profile-form-draft";

// --- Component ---
export default function UserSettingsPage() {
    const { toast } = useToast();
    const supabase = createClient();
    const { refreshProfile } = useUserProfile();
    const { showSuccessFeedback, showErrorFeedback, loading, setLoading } = useSuccessFeedback();

    // --- State ---
    const [currentUserData, setCurrentUserData] = useState<Profile | null>(null);
    const [notificationSettings, setNotificationSettings] = useState<Record<string, any>>(
        {
            in_app: {},
            email: {},
            push: {},
        }
    );
    const { enable: enablePush, isSupported: isPushSupported, permission: pushPermission, subscription: pushSubscription, checkSubscription } = usePushNotifications();
    const [isTestingPush, setIsTestingPush] = useState(false);
    const [isSyncingPush, setIsSyncingPush] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [showCropper, setShowCropper] = useState(false);
    const [rawImage, setRawImage] = useState<string | null>(null);
    // Removed unused croppedFile, setCroppedFile

    // --- Forms ---
    const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: { fullName: '', email: '', phone: '', department: '', profilePicture: undefined } });
    const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { newPassword: '', confirmNewPassword: '' } });

    // Restore draft from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem(PROFILE_FORM_DRAFT_KEY);
        if (draft) {
            try {
                const values = JSON.parse(draft);
                profileForm.reset({ ...profileForm.getValues(), ...values });
            } catch { }
        }
    }, [profileForm]);

    // Save form state to localStorage on change
    useEffect(() => {
        const subscription = profileForm.watch((values) => {
            // Don't persist File objects (profilePicture)
            const { profilePicture, ...rest } = values;
            localStorage.setItem(PROFILE_FORM_DRAFT_KEY, JSON.stringify(rest));
        });
        return () => subscription.unsubscribe();
    }, [profileForm]);

    // Clear draft on submit
    const clearProfileDraft = () => localStorage.removeItem(PROFILE_FORM_DRAFT_KEY);

    // Verify push sync on mount
    useEffect(() => {
        if (pushPermission === 'granted') {
            setIsSyncingPush(true);
            checkSubscription().finally(() => setIsSyncingPush(false));
        }
    }, [pushPermission, checkSubscription]);

    // Load notification preferences from database
    useEffect(() => {
        if (!currentUserData?.id) return;

        const loadNotificationPreferences = async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('notification_preferences')
                    .eq('id', currentUserData.id)
                    .single();

                if (error) throw error;

                const prefs = data?.notification_preferences || {};

                // Initialize default structure if empty
                if (Object.keys(prefs).length === 0) {
                    const defaultPrefs = {
                        in_app: {
                            gear_requests: true,
                            gear_approvals: true,
                            gear_rejections: true,
                            gear_checkins: true,
                            gear_checkouts: true,
                            overdue_reminders: true,
                            maintenance_alerts: true,
                            system_notifications: true,
                        },
                        email: {
                            gear_requests: true,
                            gear_approvals: true,
                            gear_rejections: true,
                            gear_checkins: true,
                            gear_checkouts: true,
                            overdue_reminders: true,
                            maintenance_alerts: true,
                            system_notifications: true,
                        },
                        push: {
                            gear_requests: true,
                            gear_approvals: true,
                            gear_rejections: true,
                            gear_checkins: true,
                            gear_checkouts: true,
                            overdue_reminders: true,
                            maintenance_alerts: true,
                            system_notifications: true,
                        },
                    };
                    setNotificationSettings(defaultPrefs);
                } else {
                    setNotificationSettings(prefs);
                }
            } catch (err) {
                console.error('Failed to load notification preferences:', err);
            }
        };

        loadNotificationPreferences();
    }, [currentUserData?.id]);

    // --- Effects ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingUser(true);
            console.log("UserSettings: Fetching profile from API");
            const { data: profileData, error: profileError } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/profile`);
            let fallbackEmail = '';
            try {
                const { data: userData } = await supabase.auth.getUser();
                fallbackEmail = userData?.user?.email || '';
            } catch { }
            if (profileError) {
                console.error("UserSettings: Error fetching profile:", profileError);
                toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
                setCurrentUserData(null);
            } else if (profileData) {
                console.log("UserSettings: Profile loaded:", profileData);
                setCurrentUserData(profileData);
                profileForm.reset({
                    fullName: profileData.full_name || '',
                    email: profileData.email || fallbackEmail,
                    phone: profileData.phone || '',
                    department: profileData.department || '',
                    profilePicture: undefined,
                });
            } else {
                console.error("UserSettings: Profile not found");
                toast({ title: "Error", description: "Your profile data could not be found.", variant: "destructive" });
                setCurrentUserData(null);
            }
            setIsLoadingUser(false);
        };
        fetchData();
        // Listen for Auth changes to refresh profile
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string) => {
            if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                fetchData();
            } else if (event === 'SIGNED_OUT') {
                setCurrentUserData(null);
            }
        });
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase, toast, profileForm]);

    // --- Handlers ---
    const onProfileSubmit = async (data: ProfileFormValues) => {
        setLoading(true);
        console.log("UserSettings: Attempting profile update...");

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("No authenticated user found");
            }

            // Handle avatar upload if there's a new file
            let newAvatarUrl = currentUserData?.avatar_url;
            let file: File | undefined = undefined;
            if (data.profilePicture) {
                if (isFileList(data.profilePicture)) {
                    file = data.profilePicture[0];
                } else if (isFile(data.profilePicture)) {
                    file = data.profilePicture;
                }
            }
            if (file) {
                console.log("UserSettings: Uploading new avatar file", file);
                const fileExt = file.name.split('.').pop();
                const filePath = `${user.id}/avatar.${fileExt}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) {
                    console.error("Error uploading avatar to Storage:", uploadError);
                    throw new Error("Could not upload profile picture.");
                } else {
                    console.log("New avatar uploaded, getting public URL...");
                    const { data: urlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(uploadData.path);
                    newAvatarUrl = urlData?.publicUrl || newAvatarUrl;
                    console.log("New avatar URL:", newAvatarUrl);
                }
            }

            // Update Supabase Auth User Metadata
            const { error: updateAuthError } = await supabase.auth.updateUser({
                data: {
                    full_name: data.fullName,
                    avatar_url: newAvatarUrl,
                }
            });

            if (updateAuthError) {
                console.error("Error updating Supabase Auth user metadata:", updateAuthError);
                throw new Error("Could not update Supabase Auth user metadata.");
            }

            // Update Supabase Profile Table
            const profileUpdateData: ProfileUpdate = {
                full_name: data.fullName,
                phone: data.phone || null,
                department: data.department || null,
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('profiles')
                .update(profileUpdateData)
                .eq('id', user.id);

            if (updateError) {
                throw new Error(`Failed to update profile: ${updateError.message}`);
            }

            // Update local state so UI reflects new avatar immediately
            setCurrentUserData((prev) => prev ? { ...prev, ...profileUpdateData } : null);

            // Create notification for the user
            // await createProfileNotification(user.id, 'update'); // This line was removed as per the edit hint

            showSuccessFeedback({
                toast: { title: "Profile Updated", description: "Your profile has been updated successfully." },
                onSuccess: () => {
                    profileForm.reset({ ...data, profilePicture: undefined });
                    clearProfileDraft();
                },
            });
            await refreshProfile();

        } catch (error: unknown) {
            console.error("Profile update error:", error);
            showErrorFeedback({
                toast: {
                    title: "Update Failed",
                    description: (error as Error).message || "Could not update profile.",
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setLoading(true);
        console.log("UserSettings: Attempting password change...");

        const { error } = await supabase.auth.updateUser({
            password: data.newPassword
        });

        if (error) {
            console.error("Supabase password update error:", error);
            if (typeof (error as Error).message === 'string' && (error as Error).message.includes("Password should be stronger")) {
                passwordForm.setError("newPassword", { message: "Password is too weak." });
                throw new Error("Password is too weak.");
            } else if (typeof (error as Error).message === 'string' && (error as Error).message.includes("requires recent login")) {
                throw new Error("Please log out and log back in to change password.");
            } else {
                throw new Error((typeof (error as Error).message === 'string' && (error as Error).message) || "An error occurred.");
            }
        }

        showSuccessFeedback({
            toast: { title: "Password Changed", description: "Password updated successfully." },
            onSuccess: () => passwordForm.reset(),
        });
    };

    const handleNotificationChange = (channel: string, event: string, value: boolean) => {
        setNotificationSettings(prev => {
            const newSettings = { ...prev };
            if (!newSettings[channel]) newSettings[channel] = {};
            newSettings[channel][event] = value;
            handleSaveNotificationSettings(newSettings);
            return newSettings;
        });
    };

    const handleSaveNotificationSettings = async (settingsToSave: Record<string, any>) => {
        if (!currentUserData) return;
        console.log("UserSettings: Saving notification settings:", settingsToSave);
        const { error } = await supabase
            .from('profiles')
            .update({ notification_preferences: settingsToSave, updated_at: new Date().toISOString() } as unknown as ProfileUpdate)
            .eq('id', currentUserData.id);

        if (error) {
            console.error("Error saving notification settings:", error);
            toast({ title: "Save Failed", description: "Could not save notification preferences.", variant: "destructive" });
        } else {
            toast({ title: "Notification Settings Saved" });
        }
    };

    const handleEnablePush = async () => {
        try {
            setLoading(true);
            const result = await enablePush();
            if (result.success) {
                toast({ title: "Push Notifications Enabled", description: "You will now receive high-priority alerts on this device." });
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            console.error('Failed to enable push notifications:', err);
            toast({ title: "Push Activation Failed", description: err.message || "Please check your browser settings.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleTestPush = async () => {
        try {
            setIsTestingPush(true);
            const res = await fetch('/api/notifications/test-push', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                toast({ title: "Test Sent!", description: "You should receive a notification on this device shortly." });
            } else {
                throw new Error(data.error || "Failed to send test push.");
            }
        } catch (err: any) {
            console.error('Test push error:', err);
            toast({ title: "Test Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsTestingPush(false);
        }
    };
    const handleResetPush = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/notifications/reset-tokens', { method: 'POST' });
            if (res.ok) {
                // Now unregister service worker
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }
                toast({ title: "Local Data Cleared", description: "Old registrations removed. You can now enable push again." });
                window.location.reload();
            }
        } catch (err: any) {
            toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }, }), };

    if (isLoadingUser) return <div className="flex justify-center items-center h-64">Loading your settings...</div>;
    if (!currentUserData) return <div className="text-destructive text-center mt-10">Could not load user data. Please try logging in again.</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 max-w-full"
        >
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Settings</h1>

            {/* Profile Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={0}>
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <User className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate">Profile Information</span>
                        </CardTitle>
                        <CardDescription className="text-sm">Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                                    <Avatar className="h-16 w-16 flex-shrink-0">
                                        <AvatarImage key={currentUserData.avatar_url} src={currentUserData.avatar_url || 'https://picsum.photos/seed/usersettings/100/100'} alt={currentUserData.full_name || ''} data-ai-hint="user avatar settings" />
                                        <AvatarFallback>{getInitials(currentUserData.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <FormField
                                        control={profileForm.control}
                                        name="profilePicture"
                                        render={({ field: { value, onChange, ...fieldProps } }) => (
                                            <FormItem className="flex-grow w-full">
                                                <FormLabel className="text-sm">Update Profile Picture</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...fieldProps}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (event) => {
                                                            const file = event.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => {
                                                                    setRawImage(ev.target?.result as string);
                                                                    setShowCropper(true);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="text-xs w-full"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {showCropper && (
                                    <ImageCropperModal
                                        open={showCropper}
                                        imageSrc={rawImage}
                                        onClose={() => setShowCropper(false)}
                                        onCropComplete={async (croppedBlob) => {
                                            const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
                                            profileForm.setValue('profilePicture', croppedFile);
                                            setShowCropper(false);
                                        }}
                                        aspect={1}
                                    />
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Full Name</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={profileForm.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Email</FormLabel>
                                            <FormControl><Input {...field} disabled /></FormControl>
                                            <FormDescription className="text-xs">Email cannot be changed.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                                            <FormControl><Input type="tel" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={profileForm.control} name="department" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Department/Team <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" loading={loading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Save Profile</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Password Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={1}>
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <Lock className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate">Change Password</span>
                        </CardTitle>
                        <CardDescription className="text-sm">Update your account password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="Min. 8 characters" {...field} />
                                                </FormControl>
                                                <FormDescription className="text-xs">
                                                    For your security, use a strong, unique password.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel className="text-sm">Confirm New Password</FormLabel>
                                            <FormControl><Input type="password" placeholder="Retype new password" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" loading={loading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Update Password</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Notification Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={2}>
                <Card className="overflow-hidden">
                    <CardHeader className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                            <Bell className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate">Notification Preferences</span>
                        </CardTitle>
                        <CardDescription className="text-sm">Manage how you receive notifications across all channels.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Email Notifications */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">📧 Email Notifications</h3>
                            <div className="space-y-2 pl-2">
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="email-gear-requests" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Gear Requests</span>
                                        <span className="font-normal text-muted-foreground text-xs">Notifications about gear requests</span>
                                    </Label>
                                    <Switch id="email-gear-requests" checked={notificationSettings.email?.gear_requests ?? true} onCheckedChange={(checked) => handleNotificationChange('email', 'gear_requests', checked)} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="email-approvals" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Request Approvals</span>
                                        <span className="font-normal text-muted-foreground text-xs">When your request is approved</span>
                                    </Label>
                                    <Switch id="email-approvals" checked={notificationSettings.email?.gear_approvals ?? true} onCheckedChange={(checked) => handleNotificationChange('email', 'gear_approvals', checked)} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="email-rejections" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Request Rejections</span>
                                        <span className="font-normal text-muted-foreground text-xs">When your request is rejected</span>
                                    </Label>
                                    <Switch id="email-rejections" checked={notificationSettings.email?.gear_rejections ?? true} onCheckedChange={(checked) => handleNotificationChange('email', 'gear_rejections', checked)} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="email-reminders" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Overdue Reminders</span>
                                        <span className="font-normal text-muted-foreground text-xs">Reminders before gear is due</span>
                                    </Label>
                                    <Switch id="email-reminders" checked={notificationSettings.email?.overdue_reminders ?? true} onCheckedChange={(checked) => handleNotificationChange('email', 'overdue_reminders', checked)} />
                                </div>
                            </div>
                        </div>

                        {/* In-App Notifications */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">🔔 In-App Notifications</h3>
                            <div className="space-y-2 pl-2">
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="inapp-gear-requests" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Gear Requests</span>
                                        <span className="font-normal text-muted-foreground text-xs">Notifications about gear requests</span>
                                    </Label>
                                    <Switch id="inapp-gear-requests" checked={notificationSettings.in_app?.gear_requests ?? true} onCheckedChange={(checked) => handleNotificationChange('in_app', 'gear_requests', checked)} />
                                </div>
                                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                    <Label htmlFor="inapp-approvals" className="flex flex-col space-y-1 cursor-pointer">
                                        <span className="text-sm font-medium">Request Approvals</span>
                                        <span className="font-normal text-muted-foreground text-xs">When your request is approved</span>
                                    </Label>
                                    <Switch id="inapp-approvals" checked={notificationSettings.in_app?.gear_approvals ?? true} onCheckedChange={(checked) => handleNotificationChange('in_app', 'gear_approvals', checked)} />
                                </div>
                            </div>
                        </div>

                        {/* Push Notifications */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">📱 Push Notifications</h3>
                            {isPushSupported ? (
                                <div className="space-y-2 pl-2">
                                    {isSyncingPush ? (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 mb-4 transition-all">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
                                            <span>Verifying push registration with server...</span>
                                        </div>
                                    ) : pushPermission === 'granted' && pushSubscription ? (
                                        <div className="space-y-4 mb-4">
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-600">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span>Active: This device is registered to receive notifications.</span>
                                            </div>
                                            <Button
                                                onClick={handleTestPush}
                                                variant="outline"
                                                className="w-full text-xs h-9 border-dashed border-primary/30 hover:bg-primary/5 gap-2"
                                                loading={isTestingPush}
                                            >
                                                <Bell className="h-3.5 w-3.5" />
                                                Send Test Notification
                                            </Button>
                                        </div>
                                    ) : pushPermission === 'granted' && !pushSubscription ? (
                                        <div className="space-y-4 mb-4">
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                <span>Permission is granted, but subscription is missing.</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                                <Button onClick={handleEnablePush} variant="outline" className="flex-1 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all gap-2 h-11 rounded-xl">
                                                    <Bell className="h-4 w-4" />
                                                    Re-register Device
                                                </Button>
                                                <Button onClick={handleResetPush} variant="ghost" className="flex-1 text-xs text-muted-foreground hover:text-destructive">
                                                    Reset All Push Data
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button onClick={handleEnablePush} variant="outline" className="w-full mb-4 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all gap-2 h-11 rounded-xl">
                                            <Bell className="h-4 w-4" />
                                            Enable Push Notifications
                                        </Button>
                                    )}
                                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                        <Label htmlFor="push-gear-requests" className="flex flex-col space-y-1 cursor-pointer">
                                            <span className="text-sm font-medium">Gear Requests</span>
                                            <span className="font-normal text-muted-foreground text-xs">Push notifications for gear requests</span>
                                        </Label>
                                        <Switch id="push-gear-requests" checked={notificationSettings.push?.gear_requests ?? true} onCheckedChange={(checked) => handleNotificationChange('push', 'gear_requests', checked)} disabled={pushPermission !== 'granted' || !pushSubscription} />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                                        <Label htmlFor="push-approvals" className="flex flex-col space-y-1 cursor-pointer">
                                            <span className="text-sm font-medium">Request Approvals</span>
                                            <span className="font-normal text-muted-foreground text-xs">When your request is approved</span>
                                        </Label>
                                        <Switch id="push-approvals" checked={notificationSettings.push?.gear_approvals ?? true} onCheckedChange={(checked) => handleNotificationChange('push', 'gear_approvals', checked)} disabled={pushPermission !== 'granted' || !pushSubscription} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 border rounded-md bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Push notifications are not supported on your device or browser.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
