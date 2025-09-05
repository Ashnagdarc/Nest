"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, Bell, Lock, User, Settings, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client'; // Import Supabase client
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile'; // Add this import for responsive handling
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { ImageCropperModal } from '@/components/ui/ImageCropperModal';
import { apiGet } from '@/lib/apiClient';
import { isFileList, isFile } from '@/lib/utils/browser-safe';
import QuantityFixPanel from '@/components/admin/QuantityFixPanel';
import SystemOverview from '@/components/admin/SystemOverview';

// --- Schemas ---
const phoneRegex = new RegExp(
    /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/
);

const profileSchema = z.object({
    fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
    email: z.string().email(), // Display only
    phone: z.string().regex(phoneRegex, { message: 'Invalid phone number format.' }).optional().or(z.literal('')),
    department: z.string().optional(),
    profilePicture: z.any().optional(), // Use z.any() for file inputs
});

const passwordSchema = z.object({
    // currentPassword field removed as Supabase re-authentication is not typically needed for password update if user is already logged in
    newPassword: z.string().min(8, { message: 'New password must be at least 8 characters.' }),
    confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
});

const brandingSchema = z.object({
    logo: z.any().optional(),
});

// Enhanced app settings schema with comprehensive options
const appSettingsSchema = z.object({
    // Existing settings
    emailNotifications: z.boolean(),
    autoApproveRequests: z.boolean(),
    maxCheckoutDuration: z.number().min(1, "Must be at least 1 day"),

    // New enhanced settings
    maintenanceMode: z.boolean(),
    requireAdminApproval: z.boolean(),
    sessionTimeout: z.number().min(5, "Must be at least 5 minutes").max(480, "Must be at most 8 hours"),
    enableTwoFactor: z.boolean(),
    passwordMinLength: z.number().min(6, "Must be at least 6 characters").max(32, "Must be at most 32 characters"),
    enableAuditLogs: z.boolean(),
    backupFrequency: z.enum(['daily', 'weekly', 'monthly']),
    maxFileSize: z.number().min(1, "Must be at least 1MB").max(100, "Must be at most 100MB"),
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;
type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

// Define simple types rather than relying on generated Database types
type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    department: string | null;
    role: string;
    updated_at: string;
    [key: string]: any; // Allow for additional properties
};

type AppSetting = {
    key: string;
    value: string | null;
    updated_at: string;
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
const ADMIN_PROFILE_FORM_DRAFT_KEY = "admin-profile-form-draft";

// --- Component ---
export default function AdminSettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const supabase = createClient();
    const isMobile = useIsMobile();
    const { refreshProfile } = useUserProfile();

    // --- State ---
    const [adminUser, setAdminUser] = useState<Profile | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>(undefined);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [isBrandingLoading, setIsBrandingLoading] = useState(false);
    const [isAppSettingsLoading, setIsAppSettingsLoading] = useState(false);
    const [showCropper, setShowCropper] = useState(false);
    const [rawImage, setRawImage] = useState<string | null>(null);
    const [croppedFile, setCroppedFile] = useState<File | null>(null);

    // --- Forms ---
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { fullName: '', email: '', phone: '', department: '', profilePicture: undefined },
    });

    // Restore draft from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem(ADMIN_PROFILE_FORM_DRAFT_KEY);
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
            localStorage.setItem(ADMIN_PROFILE_FORM_DRAFT_KEY, JSON.stringify(rest));
        });
        return () => subscription.unsubscribe();
    }, [profileForm]);

    // Clear draft on submit
    const clearAdminProfileDraft = () => localStorage.removeItem(ADMIN_PROFILE_FORM_DRAFT_KEY);

    const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { newPassword: '', confirmNewPassword: '' } });
    const brandingForm = useForm<BrandingFormValues>({ resolver: zodResolver(brandingSchema), defaultValues: { logo: undefined } });
    const appSettingsForm = useForm<AppSettingsFormValues>({
        resolver: zodResolver(appSettingsSchema),
        defaultValues: {
            emailNotifications: true,
            autoApproveRequests: false,
            maxCheckoutDuration: 7,
            maintenanceMode: false,
            requireAdminApproval: true,
            sessionTimeout: 120,
            enableTwoFactor: false,
            passwordMinLength: 8,
            enableAuditLogs: true,
            backupFrequency: 'weekly',
            maxFileSize: 10
        },
    });


    // --- Effects ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingUser(true);
            console.log("AdminSettings: Fetching initial data...");

            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.error("AdminSettings: Auth error or no user found.", authError);
                toast({ title: "Error", description: "Not authenticated or session expired.", variant: "destructive" });
                setIsLoadingUser(false);
                router.push('/login');
                return;
            }

            // Get avatar URL from user metadata
            console.log("AdminSettings: User authenticated, getting metadata for ID:", user.id);
            const avatarUrlFromMetadata = user.user_metadata?.avatar_url || null;
            setAvatarUrl(avatarUrlFromMetadata);
            console.log("AdminSettings: Avatar URL from metadata:", avatarUrlFromMetadata);

            // Fetch admin profile from API
            const { data: profileData, error: profileError } = await apiGet<{ data: Profile | null; error: string | null }>(`/api/users/profile`);

            if (profileError) {
                console.error("AdminSettings: Error fetching admin profile:", profileError);
                toast({ title: "Error", description: "Could not load admin profile data.", variant: "destructive" });
                setAdminUser(null); // Indicate profile fetch failed
            } else if (profileData) {
                console.log("AdminSettings: Profile fetched:", profileData);
                setAdminUser(profileData);
                profileForm.reset({
                    fullName: profileData.full_name || '',
                    email: profileData.email || user.email || '',
                    phone: profileData.phone || '',
                    department: profileData.department || '',
                    profilePicture: undefined,
                });

                // Check admin role
                if (profileData.role !== 'Admin') {
                    console.warn("AdminSettings: User does not have Admin role. Redirecting.");
                    toast({ title: "Unauthorized", description: "You do not have permission to view admin settings.", variant: "destructive" });
                    router.push('/user/dashboard'); // Redirect non-admins
                    setIsLoadingUser(false);
                    return; // Stop further execution for non-admins
                }
            } else {
                console.error("AdminSettings: Admin profile document not found");
                toast({ title: "Error", description: "Admin profile not found.", variant: "destructive" });
                setAdminUser(null);
            }

            // Fetch app settings from Supabase 'app_settings' table
            try {
                console.log("AdminSettings: Fetching app settings...");
                // Assuming settings are stored as key-value pairs
                const { data: settingsData, error: settingsError } = await supabase
                    .from('app_settings')
                    .select('*');

                if (settingsError) {
                    console.error("AdminSettings: Error fetching app settings:", settingsError.message);
                    throw new Error("Could not load app settings.");
                }

                if (settingsData) {
                    console.log("AdminSettings: Settings data fetched:", settingsData);
                    const settings: Partial<AppSettingsFormValues & { logoUrl?: string }> = {};
                    settingsData.forEach((setting: AppSetting) => {
                        if (setting.key === 'logoUrl') settings.logoUrl = setting.value ?? undefined;
                        if (setting.key === 'emailNotifications') settings.emailNotifications = setting.value === 'true';
                        if (setting.key === 'auto_approve_requests') settings.autoApproveRequests = setting.value === 'true';
                        if (setting.key === 'max_request_duration_days') settings.maxCheckoutDuration = parseInt(setting.value || '7', 10);
                        if (setting.key === 'maintenance_mode') settings.maintenanceMode = setting.value === 'true';
                        if (setting.key === 'require_admin_approval') settings.requireAdminApproval = setting.value === 'true';
                        if (setting.key === 'session_timeout') settings.sessionTimeout = parseInt(setting.value || '120', 10);
                        if (setting.key === 'enable_two_factor') settings.enableTwoFactor = setting.value === 'true';
                        if (setting.key === 'password_min_length') settings.passwordMinLength = parseInt(setting.value || '8', 10);
                        if (setting.key === 'enable_audit_logs') settings.enableAuditLogs = setting.value === 'true';
                        if (setting.key === 'backup_frequency') settings.backupFrequency = setting.value as 'daily' | 'weekly' | 'monthly';
                        if (setting.key === 'max_file_size') settings.maxFileSize = parseInt(setting.value || '10', 10);
                    });

                    setCurrentLogoUrl(settings.logoUrl);
                    appSettingsForm.reset({
                        emailNotifications: settings.emailNotifications ?? true,
                        autoApproveRequests: settings.autoApproveRequests ?? false,
                        maxCheckoutDuration: settings.maxCheckoutDuration ?? 7,
                        maintenanceMode: settings.maintenanceMode ?? false,
                        requireAdminApproval: settings.requireAdminApproval ?? true,
                        sessionTimeout: settings.sessionTimeout ?? 120,
                        enableTwoFactor: settings.enableTwoFactor ?? false,
                        passwordMinLength: settings.passwordMinLength ?? 8,
                        enableAuditLogs: settings.enableAuditLogs ?? true,
                        backupFrequency: settings.backupFrequency ?? 'weekly',
                        maxFileSize: settings.maxFileSize ?? 10,
                    });
                    console.log("AdminSettings: App settings form reset with fetched values.");
                } else {
                    console.warn("AdminSettings: No app settings data found. Using defaults.");
                    setCurrentLogoUrl(undefined);
                }
            } catch (settingsError) {
                console.error("AdminSettings: Error processing app settings:", settingsError);
            }
            setIsLoadingUser(false);
        };
        fetchData();
    }, []);

    // --- Handlers ---

    // Helper to save individual app settings (key-value)
    const saveSetting = async (key: string, value: string | number | boolean | null) => {
        console.log(`AdminSettings: Saving setting - Key: ${key}, Value: ${value}`);
        const { error } = await supabase
            .from('app_settings')
            .upsert(
                { key: key, value: String(value), updated_at: new Date().toISOString() },
                { onConflict: 'key' } // Update if key exists, insert otherwise
            );

        if (error) {
            console.error(`Error saving setting ${key}:`, error.message);
            toast({ title: "Error", description: `Could not save setting: ${key}.`, variant: "destructive" });
            return false;
        }
        console.log(`AdminSettings: Setting ${key} saved successfully.`);
        return true;
    };


    const onProfileSubmit = async (data: ProfileFormValues) => {
        if (!adminUser) {
            toast({ title: "Error", description: "User data not loaded.", variant: "destructive" });
            return;
        }
        setIsProfileLoading(true);
        console.log("AdminSettings: Submitting profile update...");

        let newAvatarUrl: string | null = avatarUrl; // Start with current URL from state

        // --- Handle Profile Picture Upload (Supabase Storage) ---
        let file: File | undefined = undefined;
        if (data.profilePicture) {
            if (isFileList(data.profilePicture)) {
                file = data.profilePicture[0];
            } else if (isFile(data.profilePicture)) {
                file = data.profilePicture;
            }
        }
        if (file) {
            const storagePath = `avatars/${adminUser.id}/${Date.now()}_${file.name}`;
            console.log("AdminSettings: Uploading new avatar file", file, "to", storagePath);

            // --- Delete old avatar if exists ---
            if (avatarUrl) {
                try {
                    const urlParts = new URL(avatarUrl);
                    const pathSegments = urlParts.pathname.split('/');
                    const bucketIndex = pathSegments.findIndex(segment => segment === 'avatars');
                    if (bucketIndex !== -1) {
                        const oldStoragePath = pathSegments.slice(bucketIndex + 1).join('/');
                        console.log("AdminSettings: Attempting to remove old avatar at path:", oldStoragePath);
                        const { error: removeError } = await supabase.storage
                            .from('avatars')
                            .remove([oldStoragePath]);
                        if (removeError) {
                            console.error("Error removing old avatar:", removeError.message);
                        } else {
                            console.log("Old avatar removed from Storage.");
                        }
                    } else {
                        console.warn("Could not determine old avatar path from URL:", avatarUrl);
                    }
                } catch (urlParseError) {
                    console.error("Error parsing old avatar URL:", urlParseError);
                }
            }

            // --- Upload new avatar ---
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(storagePath, file);

            if (uploadError) {
                console.error("Error uploading avatar to Storage:", uploadError);
                toast({ title: "Upload Failed", description: "Could not upload profile picture.", variant: "destructive" });
            } else {
                console.log("New avatar uploaded, getting public URL...");
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(uploadData.path);
                newAvatarUrl = urlData?.publicUrl || newAvatarUrl;
                console.log("New avatar URL:", newAvatarUrl);
                setAvatarUrl(newAvatarUrl);
            }
        }

        // --- Update Supabase Auth User Metadata (Optional but good practice) ---
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            console.log("AdminSettings: Updating Supabase Auth metadata...");
            const { error: updateAuthError } = await supabase.auth.updateUser({
                data: {
                    full_name: data.fullName,
                    avatar_url: newAvatarUrl,
                }
            });
            if (updateAuthError) {
                console.error("Error updating Supabase Auth user metadata:", updateAuthError);
            } else {
                console.log("Supabase Auth metadata updated.");
            }
        }

        // --- Update Supabase Profile Table ---
        console.log("AdminSettings: Updating profile table...");
        const profileUpdateData: ProfileUpdate = {
            full_name: data.fullName,
            phone: data.phone || null,
            department: data.department || null,
            avatar_url: newAvatarUrl,
            updated_at: new Date().toISOString(),
        };

        // Log for debugging
        console.log("AdminSettings: Profile update data:", profileUpdateData);

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', adminUser.id);

        if (profileUpdateError) {
            console.error("Error updating Supabase profile:", profileUpdateError.message);
            toast({ title: "Update Failed", description: "Could not save profile changes.", variant: "destructive" });
        } else {
            console.log("AdminSettings: Profile table updated successfully.");
            // Optimistically update local state
            setAdminUser((prev: Profile | null) => prev ? { ...prev, ...profileUpdateData } : null);
            profileForm.reset({
                ...profileForm.getValues(),
                fullName: data.fullName,
                phone: data.phone || '',
                department: data.department || '',
                profilePicture: undefined,
            });
            toast({ title: "Profile Updated", description: "Your profile information has been saved." });
            await refreshProfile();
        }

        setIsProfileLoading(false);
        clearAdminProfileDraft();
    };

    const onPasswordSubmit = async (data: PasswordFormValues) => {
        setIsPasswordLoading(true);
        console.log("AdminSettings: Attempting to change password...");

        const { error } = await supabase.auth.updateUser({
            password: data.newPassword
        });

        if (error) {
            console.error("Supabase password update error:", error);
            // Provide more specific feedback
            if (error.message.includes("Password should be stronger")) {
                passwordForm.setError("newPassword", { message: "Password is too weak. Please choose a stronger one." });
                toast({ title: "Password Change Failed", description: "New password is too weak.", variant: "destructive" });
            } else if (error.message.includes("requires recent login")) {
                toast({ title: "Re-authentication Required", description: "Please log out and log back in to change your password.", variant: "destructive", duration: 7000 });
            }
            else {
                toast({ title: "Password Change Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
            }
        } else {
            toast({ title: "Password Changed", description: "Your password has been updated successfully." });
            passwordForm.reset();
        }

        setIsPasswordLoading(false);
    };

    const onBrandingSubmit = async (data: BrandingFormValues) => {
        setIsBrandingLoading(true);
        console.log("AdminSettings: Submitting branding update...");
        let newLogoUrl: string | undefined = currentLogoUrl; // Start with current

        if (data.logo && data.logo.length > 0) {
            const file = data.logo[0] as File;
            const storagePath = `branding/logo_${Date.now()}.${file.name.split('.').pop()}`;
            console.log("AdminSettings: Uploading new logo to", storagePath);

            // --- Delete old logo if exists ---
            if (currentLogoUrl) {
                try {
                    const urlParts = new URL(currentLogoUrl);
                    const pathSegments = urlParts.pathname.split('/');
                    // Find the bucket name index, assuming 'branding' or similar
                    const bucketIndex = pathSegments.findIndex(segment => segment === 'branding'); // Adjust bucket name if needed
                    if (bucketIndex !== -1) {
                        const oldStoragePath = pathSegments.slice(bucketIndex + 1).join('/');
                        console.log("AdminSettings: Attempting to remove old logo at path:", oldStoragePath);
                        const { error: removeError } = await supabase.storage
                            .from('branding') // *** Ensure 'branding' bucket exists ***
                            .remove([oldStoragePath]);
                        if (removeError) {
                            console.error("Error removing old logo:", removeError.message);
                        } else {
                            console.log("Old logo removed from Storage.");
                        }
                    } else {
                        console.warn("Could not determine old logo path from URL:", currentLogoUrl);
                    }
                } catch (e) { console.error(e) }
            }

            // --- Upload new logo ---
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('branding') // *** Ensure 'branding' bucket exists ***
                .upload(storagePath, file);

            if (uploadError) {
                console.error("Error uploading logo to Storage:", uploadError);
                toast({ title: "Upload Failed", description: "Could not upload new logo.", variant: "destructive" });
            } else {
                console.log("New logo uploaded, getting public URL...");
                const { data: urlData } = supabase.storage
                    .from('branding')
                    .getPublicUrl(uploadData.path);
                newLogoUrl = urlData?.publicUrl || undefined;
                console.log("New logo URL:", newLogoUrl);

                // Save the new URL to Supabase app_settings
                const saved = await saveSetting('logoUrl', newLogoUrl || ''); // Save empty string if null/undefined
                if (saved) {
                    setCurrentLogoUrl(newLogoUrl); // Update state
                    toast({ title: "Branding Updated", description: "Application logo has been updated." });
                } else {
                    // Revert potentially optimistic UI updates if save failed
                }
            }
        } else {
            toast({ title: "No Logo Submitted", description: "Please select a logo file to upload.", variant: "default" });
        }

        brandingForm.reset({ logo: undefined }); // Clear file input
        setIsBrandingLoading(false);
    };

    // Handler for saving general app settings
    const onAppSettingsSubmit = async (data: AppSettingsFormValues) => {
        setIsAppSettingsLoading(true);
        console.log("AdminSettings: Saving app settings:", data);

        // Use Promise.all to save multiple settings concurrently
        const savePromises = [
            saveSetting('emailNotifications', data.emailNotifications),
            saveSetting('auto_approve_requests', data.autoApproveRequests),
            saveSetting('max_request_duration_days', data.maxCheckoutDuration),
            saveSetting('maintenance_mode', data.maintenanceMode),
            saveSetting('require_admin_approval', data.requireAdminApproval),
            saveSetting('session_timeout', data.sessionTimeout),
            saveSetting('enable_two_factor', data.enableTwoFactor),
            saveSetting('password_min_length', data.passwordMinLength),
            saveSetting('enable_audit_logs', data.enableAuditLogs),
            saveSetting('backup_frequency', data.backupFrequency),
            saveSetting('max_file_size', data.maxFileSize),
        ];

        try {
            const results = await Promise.all(savePromises);
            if (results.every(Boolean)) { // Check if all saves were successful
                toast({ title: "App Settings Saved", description: "Application settings have been updated." });
            } else {
                toast({ title: "Partial Error", description: "Some settings could not be saved. Check logs.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error saving app settings batch:", error);
            toast({ title: "Error", description: "Failed to save application settings.", variant: "destructive" });
        } finally {
            setIsAppSettingsLoading(false);
        }
    };

    const getInitials = (name: string | null = "") => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';

    // --- Variants ---
    const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }, }), };

    // --- Render Loading/Error States ---
    if (isLoadingUser) return <div className="flex justify-center items-center h-64">Loading admin settings...</div>;
    if (!adminUser) return <div className="text-destructive text-center mt-10">Could not load admin data. Please ensure you are logged in as an Admin.</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8 max-w-full"
        >
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Settings</h1>

            {/* System Overview */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={0}>
                <SystemOverview />
            </motion.div>

            {/* Admin Profile Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={1}>
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><User className="h-5 w-5 text-primary flex-shrink-0" /> Admin Profile</CardTitle>
                        <CardDescription className="text-sm">Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                                    <Avatar className="h-16 w-16 flex-shrink-0">
                                        <AvatarImage key={avatarUrl} src={avatarUrl || 'https://picsum.photos/seed/adminsettings/100/100'} alt={adminUser.full_name || ''} data-ai-hint="admin avatar settings" />
                                        <AvatarFallback>{getInitials(adminUser.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <FormField
                                        control={profileForm.control}
                                        name="profilePicture"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow w-full">
                                                <FormLabel>Update Profile Picture</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            console.log('File input onChange fired. File:', file);
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => {
                                                                    console.log('FileReader loaded. DataURL:', ev.target?.result);
                                                                    setRawImage(ev.target?.result as string);
                                                                    setShowCropper(true);
                                                                    console.log('setRawImage and setShowCropper(true) called.');
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                        className="text-xs w-full"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={profileForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormDescription className="text-xs">Email cannot be changed here.</FormDescription><FormMessage /></FormItem>)} />
                                    <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={profileForm.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department/Team <span className="text-muted-foreground text-xs">(Optional)</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isProfileLoading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{isProfileLoading ? 'Saving Profile...' : 'Save Profile'}</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Admin Password Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={2}>
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><Lock className="h-5 w-5 text-primary flex-shrink-0" /> Change Password</CardTitle>
                        <CardDescription className="text-sm">Update your account password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                {/* Removed current password field as Supabase doesn't require it for logged-in user update */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">New Password</FormLabel>
                                            <FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Confirm New Password</FormLabel>
                                            <FormControl><Input type="password" placeholder="Retype new password" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isPasswordLoading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{isPasswordLoading ? 'Updating Password...' : 'Update Password'}</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Branding Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={3}>
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><ImageIcon className="h-5 w-5 text-primary flex-shrink-0" /> Branding</CardTitle>
                        <CardDescription className="text-sm">Customize the application's appearance. Ensure 'branding' bucket exists in Supabase Storage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...brandingForm}>
                            <form onSubmit={brandingForm.handleSubmit(onBrandingSubmit)} className="space-y-4">
                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                    <p className="font-medium text-sm">Current Logo:</p>
                                    {currentLogoUrl ? (
                                        <Image
                                            key={currentLogoUrl}
                                            src={currentLogoUrl}
                                            alt="Current Nest by Eden Oasis Logo"
                                            width={40}
                                            height={40}
                                            className="rounded-md border p-1 bg-white"
                                            data-ai-hint="app logo preview"
                                            unoptimized // Often needed for Supabase Storage URLs
                                        />
                                    ) : (
                                        <span className="text-muted-foreground text-sm">No logo set</span>
                                    )}
                                </div>
                                <FormField
                                    control={brandingForm.control}
                                    name="logo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Upload New Logo</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => field.onChange(e.target.files)}
                                                    onBlur={field.onBlur}
                                                    name={field.name}
                                                    className="w-full text-sm"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-xs">Recommended size: 80x80 pixels. Supports JPG, PNG, SVG.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isBrandingLoading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{isBrandingLoading ? 'Saving Logo...' : 'Save Logo'}</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>


            {/* App Settings (General, Notifications, Security, System) */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={4}>
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg md:text-xl"><Settings className="h-5 w-5 text-primary flex-shrink-0" /> Application Settings</CardTitle>
                        <CardDescription className="text-sm">Configure general application behavior, security, and system settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...appSettingsForm}>
                            <form onSubmit={appSettingsForm.handleSubmit(onAppSettingsSubmit)} className="space-y-6">
                                <div className="space-y-4 p-3 sm:p-4 border rounded-md">
                                    <h3 className="font-medium text-base md:text-lg">General</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="autoApproveRequests"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Auto-Approve Requests</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Automatically approve gear requests upon submission.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="requireAdminApproval"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Require Admin Approval</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Require admin approval for all gear requests.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="maxCheckoutDuration"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">Maximum Checkout Duration (Days)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="max-w-[120px] sm:max-w-[150px]" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                </FormControl>
                                                <FormDescription className="text-xs sm:text-sm">
                                                    Set the default maximum number of days a gear item can be checked out.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 p-3 sm:p-4 border rounded-md">
                                    <h3 className="font-medium text-base md:text-lg flex items-center gap-2"><Bell className="h-4 w-4 flex-shrink-0" /> Notifications</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="emailNotifications"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Enable Admin Email Notifications</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Receive email alerts for important events (new requests, etc.).
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 p-3 sm:p-4 border rounded-md">
                                    <h3 className="font-medium text-base md:text-lg flex items-center gap-2"><Lock className="h-4 w-4 flex-shrink-0" /> Security</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="enableTwoFactor"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Enable Two-Factor Authentication</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Require 2FA for all admin accounts.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="passwordMinLength"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">Minimum Password Length</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="max-w-[120px] sm:max-w-[150px]" min="6" max="32" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 8)} />
                                                </FormControl>
                                                <FormDescription className="text-xs sm:text-sm">
                                                    Minimum number of characters required for passwords.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="sessionTimeout"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">Session Timeout (Minutes)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="max-w-[120px] sm:max-w-[150px]" min="5" max="480" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 120)} />
                                                </FormControl>
                                                <FormDescription className="text-xs sm:text-sm">
                                                    How long users stay logged in before requiring re-authentication.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="enableAuditLogs"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Enable Audit Logs</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Log all admin actions for security and compliance.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 p-3 sm:p-4 border rounded-md">
                                    <h3 className="font-medium text-base md:text-lg flex items-center gap-2"><Settings className="h-4 w-4 flex-shrink-0" /> System</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="maintenanceMode"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 sm:p-3 shadow-sm">
                                                <div className="space-y-0.5 pr-2">
                                                    <FormLabel className="text-sm">Maintenance Mode</FormLabel>
                                                    <FormDescription className="text-xs sm:text-sm">
                                                        Temporarily disable the application for maintenance.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="backupFrequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">Backup Frequency</FormLabel>
                                                <FormControl>
                                                    <select
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        {...field}
                                                    >
                                                        <option value="daily">Daily</option>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                    </select>
                                                </FormControl>
                                                <FormDescription className="text-xs sm:text-sm">
                                                    How often to create automated backups.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="maxFileSize"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-sm">Maximum File Upload Size (MB)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="max-w-[120px] sm:max-w-[150px]" min="1" max="100" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 10)} />
                                                </FormControl>
                                                <FormDescription className="text-xs sm:text-sm">
                                                    Maximum size for file uploads (images, documents, etc.).
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={isAppSettingsLoading}>
                                        <Save className="mr-2 h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">{isAppSettingsLoading ? "Saving App Settings..." : "Save App Settings"}</span>
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Database Maintenance */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={5}>
                <QuantityFixPanel />
            </motion.div>

            {showCropper && (
                (() => { console.log('Rendering ImageCropperModal. showCropper:', showCropper, 'rawImage:', rawImage); return null; })(),
                <ImageCropperModal
                    open={showCropper}
                    imageSrc={rawImage}
                    onClose={() => setShowCropper(false)}
                    onCropComplete={async (croppedBlob) => {
                        const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
                        setCroppedFile(croppedFile);
                        profileForm.setValue('profilePicture', croppedFile);
                        setShowCropper(false);
                    }}
                    aspect={1}
                />
            )}

        </motion.div>
    );
}
