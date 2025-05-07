"use client";

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client'; // Import Supabase client creation function
import dynamic from 'next/dynamic';

// Dynamically import Lottie
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

// Import actual Lottie animation JSON
import successAnimation from "@/../public/animations/success.json";

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/
);

const signupSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().regex(phoneRegex, { message: 'Invalid phone number format.' }).optional().or(z.literal('')), // Allow empty string
  department: z.string().optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
  profilePicture: z.any().optional(), // Use any to avoid SSR FileList error
  terms: z.boolean().refine(val => val === true, { message: 'You must accept the terms and conditions.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;
type ProfileInsert = any; // Temporary type until Database type is defined

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const supabase = createClient(); // Create Supabase client instance

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      department: '',
      password: '',
      confirmPassword: '',
      terms: false,
      profilePicture: undefined,
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setShowSuccessAnimation(false);
    console.log("[Signup Attempt] Starting for email:", data.email);

    try {
      // 1. Sign up user with Supabase Auth
      console.log("[Signup Attempt] Calling Supabase signUp...");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // Include additional metadata if needed, accessible in triggers/functions
          data: {
            full_name: data.fullName, // Pass full name for the trigger
          },
          // Email confirmation is handled by Supabase automatically
          emailRedirectTo: `${window.location.origin}/login`, // Redirect after email confirm
        },
      });

      if (authError) {
        console.error("[Signup Attempt Failed] Supabase Auth Error:", authError);
        // Handle specific errors
        if (authError.message.includes("User already registered")) {
          throw new Error("This email address is already registered.");
        } else if (authError.message.includes("Password should be at least 6 characters")) {
          throw new Error("Password is too weak. It must be at least 6 characters long.");
        }
        throw new Error(authError.message || "Could not create account. Please try again.");
      }

      if (!authData.user) {
        console.error("[Signup Attempt Failed] Supabase signup successful but user data not returned.");
        // Although Supabase usually returns user data, handle this edge case
        throw new Error('Signup might have succeeded, but user data was not immediately available. Please try logging in or contact support.');
      }

      console.log("[Signup Attempt] Supabase Auth user created:", authData.user.id);

      // 2. Upload profile picture to Supabase Storage (if provided)
      let profilePictureUrl: string | null = null;
      if (data.profilePicture && data.profilePicture.length > 0) {
        const file = data.profilePicture[0] as File;
        // Use user ID for path organization, ensure 'avatars' bucket exists and has policies
        const filePath = `avatars/${authData.user.id}/${Date.now()}_${file.name}`;
        console.log("[Signup Attempt] Uploading profile picture to Supabase Storage:", filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars') // Make sure 'avatars' bucket exists in Supabase Storage
          .upload(filePath, file);

        if (uploadError) {
          console.error('[Signup Attempt Warning] Supabase Storage Error:', uploadError);
          // Decide how to handle: proceed without avatar or fail?
          toast({ title: "Warning", description: "Could not upload profile picture.", variant: "default" });
          // Continue signup without the avatar
        } else {
          console.log("[Signup Attempt] Upload successful, getting public URL...");
          // Get public URL (ensure RLS allows public reads or user-specific reads)
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);
          profilePictureUrl = urlData?.publicUrl || null;
          console.log("[Signup Attempt] Uploaded profile picture URL:", profilePictureUrl);
        }
      }

      // 3. Update Supabase Auth User Metadata (Optional, profile table is primary)
      // Supabase Auth user metadata updates are less common than profile table updates
      // const { error: updateError } = await supabase.auth.updateUser({
      //   data: { full_name: data.fullName, avatar_url: profilePictureUrl }
      // })
      // if (updateError) console.error("Error updating auth user metadata:", updateError);


      // 4. Create/Update user profile in Supabase 'profiles' table
      // The `handle_new_user` trigger should have already created a basic profile.
      // We UPDATE it here with additional details like avatar, phone, department.
      console.log("[Signup Attempt] Updating profile in Supabase table...");
      const profileData: ProfileInsert = {
        id: authData.user.id, // Ensure the ID matches the Auth user
        full_name: data.fullName,
        email: data.email.toLowerCase(), // Store consistently
        phone: data.phone || null,
        department: data.department || null,
        avatar_url: profilePictureUrl,
        // Role and Status default to 'User' and 'Active' via table definition
        updated_at: new Date().toISOString(), // Use ISO string for Supabase timestamp
      };

      // Use upsert to handle cases where the trigger might have been slow or failed
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (profileError) {
        console.error("[Signup Attempt Failed] Error updating Supabase profile:", profileError);
        // Decide how critical this is. Maybe the trigger worked?
        // If the update fails, the trigger might still have inserted basic info.
        // For robustness, you could try an insert if the update failed specifically due to not found.
        toast({ title: "Profile Update Failed", description: "Could not save all profile details. Please update them later in settings.", variant: "destructive" });
        // Continue the process, as the core signup worked.
      } else {
        console.log("[Signup Attempt] Supabase profile updated successfully.");
      }


      // Success sequence
      setShowSuccessAnimation(true);
      setIsLoading(false);

      toast({
        title: "Signup Successful!",
        description: "Your account has been created. Please check your email to verify your account before logging in.",
        variant: 'success',
        duration: 7000,
      });

      // Redirect after delay
      await new Promise(resolve => setTimeout(resolve, 2500));
      router.push('/login');

    } catch (error: unknown) {
      console.error("[Signup Attempt Failed] Overall signup process failed:", error instanceof Error ? error.message : 'Unknown error');

      const errorMessage = error instanceof Error ? error.message : "Could not create account. Please try again.";

      // Set form errors based on specific error messages
      if (errorMessage.includes("email address is already registered")) {
        form.setError('email', { type: 'manual', message: errorMessage });
      } else if (errorMessage.includes("Password is too weak")) {
        form.setError('password', { type: 'manual', message: errorMessage });
      }

      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  // Memoize the Lottie component
  const SuccessAnimationComponent = useMemo(() => {
    return showSuccessAnimation ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-10"
        style={{ minHeight: '500px' }}
      >
        <Lottie
          animationData={successAnimation}
          loop={false}
          style={{ width: 150, height: 150 }}
          aria-label="Signup successful animation"
        />
        <p className="mt-4 text-lg font-semibold text-primary">Account Created!</p>
        <p className="text-muted-foreground text-sm text-center">Please check your email to verify your account. Redirecting to login...</p>
      </motion.div>
    ) : null;
  }, [showSuccessAnimation]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-lg rounded-lg border-border/50">
          {showSuccessAnimation ? SuccessAnimationComponent : (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold text-primary">Create an Account</CardTitle>
                <CardDescription>Join GearFlow to manage your equipment</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number <span className="text-muted-foreground">(Optional)</span></FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="123-456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department/Team <span className="text-muted-foreground">(Optional)</span></FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Marketing, IT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter a strong password" {...field} />
                          </FormControl>
                          <FormDescription>
                            For your security, use a strong, unique password. We recommend using a password manager like <a href="https://1password.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">1Password</a>, <a href="https://bitwarden.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Bitwarden</a>, or <a href="https://www.lastpass.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">LastPass</a> to generate and store secure passwords.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="profilePicture"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <FormLabel>Profile Picture <span className="text-muted-foreground">(Optional)</span></FormLabel>
                          <FormControl>
                            <Input
                              {...fieldProps}
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                onChange(event.target.files);
                              }}
                            />
                          </FormControl>
                          <FormDescription>Upload a square image (e.g., JPG, PNG).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              Accept terms and conditions
                            </FormLabel>
                            <FormDescription>
                              You agree to our <Link href="/terms" className="underline hover:text-primary" target="_blank">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-primary" target="_blank">Privacy Policy</Link>.
                            </FormDescription>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                      </Button>
                    </motion.div>
                  </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Login
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
