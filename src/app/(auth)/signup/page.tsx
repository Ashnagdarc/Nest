// Signup page for user registration. Handles form validation, account creation, and redirects based on user role.
"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { createClient } from '@/lib/supabase/client';
import { isFileList, isFile } from '@/lib/utils/browser-safe';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordField } from '@/components/auth/PasswordField';
import { formatPhone } from '@/lib/utils/phone';
import { trackAuthEvent } from '@/lib/analytics';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/
);

const signupSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().regex(phoneRegex, { message: 'Invalid phone number format.' }).optional().or(z.literal('')),
  department: z.string().optional(),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter.' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character.' }),
  confirmPassword: z.string(),
  profilePicture: z.any().optional(),
  terms: z.boolean().refine(val => val === true, { message: 'You must accept the terms and conditions.' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  // Auto-redirect if already authenticated
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.location.href = '/user/dashboard';
      }
    })();
  }, [supabase]);

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
    trackAuthEvent('signup_success', { email: data.email, method: 'password' });
    setIsLoading(true);
    setShowSuccessModal(false);
    console.log("[Signup Attempt] Starting for email:", data.email);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
          phone: data.phone,
          department: data.department,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }

      // If a profile photo was provided, upload it and update avatar_url
      if (data.profilePicture && (isFileList(data.profilePicture) ? data.profilePicture[0] : data.profilePicture)) {
        let file: File | undefined = undefined;
        if (isFileList(data.profilePicture)) {
          file = data.profilePicture[0];
        } else if (isFile(data.profilePicture)) {
          file = data.profilePicture;
        }
        if (file) {
          // Get the user id from the backend (if returned), or fetch the user
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;
            const { error: uploadError, data: uploadData } = await supabase.storage
              .from('avatars')
              .upload(filePath, file, { upsert: true });
            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(uploadData.path);
              const avatarUrl = urlData?.publicUrl;
              if (avatarUrl) {
                // Update the user's profile with the avatar_url
                await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
              }
            }
          }
        }
      }

      setShowSuccessModal(true);
      setIsLoading(false);

      toast({
        title: "Signup Successful!",
        description: "Your account has been created. Please check your email to verify your account before logging in.",
        variant: 'success',
        duration: 7000,
      });

      setTimeout(async () => {
        setShowSuccessModal(false);

        // Get user session and profile to determine redirect
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Fetch user profile to determine role
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

            // Redirect based on role
            const targetPath = profile?.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard';
            router.push(targetPath);
          } else {
            // Fallback to user dashboard if no profile found
            router.push('/user/dashboard');
          }
        } catch (error) {
          console.error('Error determining redirect path:', error);
          // Fallback to user dashboard
          router.push('/user/dashboard');
        }
      }, 3000);

    } catch (error) {
      setIsLoading(false);
      console.error("[Signup Attempt Failed]:", error);
      const message = error instanceof Error ? error.message : 'signup_failed';
      trackAuthEvent('signup_failure', { method: 'password', error: message });

      const errorMessage = error instanceof Error ? error.message : "Could not create account. Please try again.";

      if (errorMessage.includes("email address is already registered")) {
        form.setError('email', { type: 'manual', message: errorMessage });
      } else if (errorMessage.includes("Password")) {
        form.setError('password', { type: 'manual', message: errorMessage });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('profilePicture', file);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Success Modal */}
      <Dialog open={showSuccessModal}>
        <DialogContent className="flex flex-col items-center justify-center gap-4">
          <DotLottieReact
            src="https://lottie.host/0572b41a-7744-422d-be6a-5b33e5bf060c/JtagAl0ppy.lottie"
            loop
            autoplay
            style={{ width: 180, height: 180 }}
          />
          <h3 className="mt-2 text-xl font-semibold text-primary">Account Created!</h3>
          <p className="text-center text-muted-foreground">
            Welcome to Nest. Redirecting to your dashboard...
          </p>
        </DialogContent>
      </Dialog>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthCard title="Create an Account" description="Enter your information to get started">
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
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(555) 555-5555"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(formatPhone(e.target.value))}
                          onBlur={(e) => field.onChange(formatPhone(e.target.value))}
                        />
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
                      <FormLabel>Department (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Marketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <PasswordField
                    id="signup-password"
                    value={field.value || ''}
                    onChange={field.onChange}
                    label="Password"
                    placeholder="********"
                    showChecklist
                  />
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="********" {...field} />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirmPassword((s) => !s)}
                        >
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I accept the terms and conditions</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Profile Photo (Optional)</FormLabel>
                <Input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating…' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </AuthCard>
      </motion.div>
    </div>
  );
}
