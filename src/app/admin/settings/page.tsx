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
import type { Database } from '@/types/supabase'; // Import Supabase types
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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

// Assuming app settings are stored in a table like 'app_settings' with key-value pairs
// or a single row in a dedicated settings table. Here we use a simplified object schema.
const appSettingsSchema = z.object({
    emailNotifications: z.boolean(),
    autoApproveRequests: z.boolean(),
    maxCheckoutDuration: z.number().min(1, "Must be at least 1 day"),
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type BrandingFormValues = z.infer<typeof brandingSchema>;
type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

// Type aliases from Supabase schema
type Profile = Database['public']['Tables']['profiles']['Row'];
type AppSettings = Database['public']['Tables']['app_settings']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// --- Component ---
export default function AdminSettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const supabase = createClient();

    // --- State ---
    const [adminUser, setAdminUser] = useState<Profile | null>(null);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | undefined>(undefined);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [isBrandingLoading, setIsBrandingLoading] = useState(false);
    const [isAppSettingsLoading, setIsAppSettingsLoading] = useState(false);

    // --- Forms ---
    const profileForm = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { fullName: '', email: '', phone: '', department: '', profilePicture: undefined },
    });
    // Removed currentPassword from defaultValues
    const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema), defaultValues: { newPassword: '', confirmNewPassword: '' } });
    const brandingForm = useForm<BrandingFormValues>({ resolver: zodResolver(brandingSchema), defaultValues: { logo: undefined } });
    const appSettingsForm = useForm<AppSettingsFormValues>({
        resolver: zodResolver(appSettingsSchema),
        defaultValues: { emailNotifications: true, autoApproveRequests: false, maxCheckoutDuration: 7 },
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

            console.log("AdminSettings: User authenticated, fetching profile for ID:", user.id);
            // Fetch admin profile from Supabase
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error("AdminSettings: Error fetching admin profile:", profileError.message);
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
                console.error("AdminSettings: Admin profile document not found for UID:", user.id);
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
                    settingsData.forEach(setting => {
                        if (setting.key === 'logoUrl') settings.logoUrl = setting.value ?? undefined;
                        if (setting.key === 'emailNotifications') settings.emailNotifications = setting.value === 'true';
                        if (setting.key === 'autoApproveRequests') settings.autoApproveRequests = setting.value === 'true';
                        if (setting.key === 'maxCheckoutDuration') settings.maxCheckoutDuration = parseInt(setting.value || '7', 10);
                    });

                    setCurrentLogoUrl(settings.logoUrl);
                    appSettingsForm.reset({
                        emailNotifications: settings.emailNotifications ?? true,
                        autoApproveRequests: settings.autoApproveRequests ?? false,
                        maxCheckoutDuration: settings.maxCheckoutDuration ?? 7,
                    });
                    console.log("AdminSettings: App settings form reset with fetched values.");
                } else {
                    console.warn("AdminSettings: No app settings data found. Using defaults.");
                    setCurrentLogoUrl(undefined);
                }
            } catch (settingsError) {
                console.error("AdminSettings: Error processing app settings:", settingsError);
                toast({ title: "Warning", description: "Could not load all app settings.", variant: "default" });
                setCurrentLogoUrl(undefined);
            }

            brandingForm.reset({ logo: undefined }); // Clear file input
            setIsLoadingUser(false);
            console.log("AdminSettings: Initial data fetch complete.");
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Rerun only on mount

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

        let newAvatarUrl: string | null = adminUser.avatar_url; // Start with current URL

        // --- Handle Profile Picture Upload (Supabase Storage) ---
        if (data.profilePicture && data.profilePicture.length > 0) {
            const file = data.profilePicture[0] as File;
            const storagePath = `avatars/${adminUser.id}/${Date.now()}_${file.name}`;
            console.log("AdminSettings: Uploading new avatar to", storagePath);

            // --- Delete old avatar if exists ---
            if (adminUser.avatar_url) {
                // Extract the file path from the full URL
                try {
                    const urlParts = new URL(adminUser.avatar_url);
                    // Pathname usually starts with /storage/v1/object/public/BUCKET_NAME/
                    const pathSegments = urlParts.pathname.split('/');
                    // Find the bucket name index, the rest is the file path
                    const bucketIndex = pathSegments.findIndex(segment => segment === 'avatars'); // Assuming 'avatars' is your bucket name
                    if (bucketIndex !== -1) {
                        const oldStoragePath = pathSegments.slice(bucketIndex + 1).join('/'); // Get the part after the bucket name
                        console.log("AdminSettings: Attempting to remove old avatar at path:", oldStoragePath);
                        const { error: removeError } = await supabase.storage
                            .from('avatars') // Specify your bucket name
                            .remove([oldStoragePath]);
                        if (removeError) {
                            console.error("Error removing old avatar:", removeError.message);
                            // Don't block the upload for this, maybe log it
                        } else {
                            console.log("Old avatar removed from Storage.");
                        }
                    } else {
                        console.warn("Could not determine old avatar path from URL:", adminUser.avatar_url);
                    }

                } catch (urlParseError) {
                    console.error("Error parsing old avatar URL:", urlParseError);
                }
            }

            // --- Upload new avatar ---
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars') // Ensure bucket name is correct
                .upload(storagePath, file);

            if (uploadError) {
                console.error("Error uploading avatar to Storage:", uploadError);
                toast({ title: "Upload Failed", description: "Could not upload profile picture.", variant: "destructive" });
                // Keep the old URL if upload failed
            } else {
                console.log("New avatar uploaded, getting public URL...");
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(uploadData.path);
                newAvatarUrl = urlData?.publicUrl || newAvatarUrl; // Update URL if public URL retrieved
                console.log("New avatar URL:", newAvatarUrl);
            }
        }

        // --- Update Supabase Auth User Metadata (Optional but good practice) ---
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            console.log("AdminSettings: Updating Supabase Auth metadata...");
            const { error: updateAuthError } = await supabase.auth.updateUser({
                data: { // Use the 'data' field for metadata
                    full_name: data.fullName,
                    avatar_url: newAvatarUrl,
                }
            });
            if (updateAuthError) {
                console.error("Error updating Supabase Auth user metadata:", updateAuthError);
                // Don't block the profile update for this, maybe just log
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

        const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('id', adminUser.id); // Ensure updating the correct profile

        if (profileUpdateError) {
            console.error("Error updating Supabase profile:", profileUpdateError.message);
            toast({ title: "Update Failed", description: "Could not save profile changes.", variant: "destructive" });
        } else {
            console.log("AdminSettings: Profile table updated successfully.");
            // Optimistically update local state
            setAdminUser((prev: Profile | null) => prev ? { ...prev, ...profileUpdateData } : null);
            profileForm.reset({ // Reset form with updated data
                ...profileForm.getValues(), // Keep email
                fullName: data.fullName,
                phone: data.phone || '',
                department: data.department || '',
                profilePicture: undefined, // Clear file input
            });
            toast({ title: "Profile Updated", description: "Your profile information has been saved." });
        }

        setIsProfileLoading(false);
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
            saveSetting('autoApproveRequests', data.autoApproveRequests),
            saveSetting('maxCheckoutDuration', data.maxCheckoutDuration),
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
            className="space-y-8"
        >
            <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>

            {/* Admin Profile Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={0}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Admin Profile</CardTitle>
                        <CardDescription>Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage key={adminUser.avatar_url} src={adminUser.avatar_url || 'https://picsum.photos/seed/adminsettings/100/100'} alt={adminUser.full_name || ''} data-ai-hint="admin avatar settings" />
                                        <AvatarFallback>{getInitials(adminUser.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <FormField
                                        control={profileForm.control}
                                        name="profilePicture"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormLabel>Update Profile Picture</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => field.onChange(e.target.files)}
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                        className="text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField control={profileForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={profileForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormDescription>Email cannot be changed here.</FormDescription><FormMessage /></FormItem>)} />
                                <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={profileForm.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department/Team <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isProfileLoading}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isProfileLoading ? 'Saving Profile...' : 'Save Profile'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Admin Password Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={1}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Change Password</CardTitle>
                        <CardDescription>Update your account password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                {/* Removed current password field as Supabase doesn't require it for logged-in user update */}
                                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="Min. 8 characters" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" placeholder="Retype new password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isPasswordLoading}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isPasswordLoading ? 'Updating Password...' : 'Update Password'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Branding Settings */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={2}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Branding</CardTitle>
                        <CardDescription>Customize the application's appearance. Ensure 'branding' bucket exists in Supabase Storage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...brandingForm}>
                            <form onSubmit={brandingForm.handleSubmit(onBrandingSubmit)} className="space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <p className="font-medium">Current Logo:</p>
                                    {currentLogoUrl ? (
                                        <Image
                                            key={currentLogoUrl}
                                            src={currentLogoUrl}
                                            alt="Current GearFlow Logo"
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
                                            <FormLabel>Upload New Logo</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => field.onChange(e.target.files)}
                                                    onBlur={field.onBlur}
                                                    name={field.name}
                                                />
                                            </FormControl>
                                            <FormDescription>Recommended size: 80x80 pixels. Supports JPG, PNG, SVG.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isBrandingLoading}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isBrandingLoading ? 'Saving Logo...' : 'Save Logo'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>


            {/* App Settings (General, Notifications) */}
            <motion.div initial="hidden" animate="visible" variants={cardVariants} custom={3}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Application Settings</CardTitle>
                        <CardDescription>Configure general application behavior and notifications.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...appSettingsForm}>
                            <form onSubmit={appSettingsForm.handleSubmit(onAppSettingsSubmit)} className="space-y-6">
                                <div className="space-y-4 p-4 border rounded-md">
                                    <h3 className="font-medium text-lg">General</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="autoApproveRequests"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Auto-Approve Requests</FormLabel>
                                                    <FormDescription>
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
                                        name="maxCheckoutDuration"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Maximum Checkout Duration (Days)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" className="max-w-[150px]" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                </FormControl>
                                                <FormDescription>
                                                    Set the default maximum number of days a gear item can be checked out.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-4 p-4 border rounded-md">
                                    <h3 className="font-medium text-lg flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</h3>
                                    <Separator className="my-2" />
                                    <FormField
                                        control={appSettingsForm.control}
                                        name="emailNotifications"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Enable Admin Email Notifications</FormLabel>
                                                    <FormDescription>
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

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={isAppSettingsLoading}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isAppSettingsLoading ? "Saving App Settings..." : "Save App Settings"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </motion.div>

        </motion.div>
    );
}
