// Login page for user authentication. Handles login form, validation, and redirects based on user role.
"use client";

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordField } from '@/components/auth/PasswordField';
import { trackAuthEvent } from '@/lib/analytics';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  // Removed unused router
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Auto-redirect if already authenticated
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        window.location.href = '/user/dashboard';
      }
    })();
  }, [supabase]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    // Cooldown check
    if (cooldownUntil && Date.now() < cooldownUntil) {
      toast({ title: 'Please wait a moment', description: 'Too many attempts. Try again shortly.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setShowSuccessAnimation(false);

    try {
      // Sanitize email to prevent copy/paste whitespace and case issues
      const cleanedEmail = data.email.trim().toLowerCase();

      // Validate email format
      if (!cleanedEmail || !cleanedEmail.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }

      // Validate password
      if (!data.password || data.password.length < 1) {
        throw new Error('Password is required.');
      }

      // Direct client-side login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password: data.password,
      });

      if (authError) {
        // Handle specific error cases
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in.');
        } else if (authError.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a moment and try again.');
        }
        throw new Error(authError.message || 'Login failed. Please try again.');
      }

      if (!authData.user) {
        throw new Error('Login succeeded but user data missing. Please try again.');
      }

      // Fetch profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Could not fetch user profile. Please try again.');
      }

      if (!profile) {
        throw new Error('User profile not found. Please contact support.');
      }

      if (profile.status !== 'Active') {
        await supabase.auth.signOut();
        throw new Error(`Account status is ${profile.status}. Please contact support to activate your account.`);
      }

      // Log successful login
      console.log('🔍 Login successful:', { id: authData.user.id, role: profile.role });

      // Analytics (non‑PII)
      trackAuthEvent('login_success', { email: cleanedEmail, method: 'password' });

      // Show success message
      toast({
        title: `Welcome back, ${profile.full_name || 'User'}!`,
        description: `Redirecting to ${profile.role} Dashboard...`,
        variant: 'default',
      });

      setIsLoading(false);
      setShowSuccessAnimation(true);

      // Show pending notifications after user data is set and a delay, then redirect
      setTimeout(async () => {
        console.log('🔍 Attempting to show pending notifications toast...');
        console.log('🔍 User data:', { id: authData.user.id, role: profile.role });

        // Fetch notifications directly for this user
        try {
          const { data: userNotifications, error: notificationsError } = await supabase
            .from('notifications')
            .select('id, is_read')
            .eq('user_id', authData.user.id)
            .eq('is_read', false);

          if (notificationsError) {
            console.error('Error fetching notifications:', notificationsError);
          } else {
            const unreadCount = userNotifications?.length || 0;
            console.log('🔍 Direct notification fetch result:', { unreadCount, notifications: userNotifications?.length });

            // Show toast if there are unread notifications
            if (unreadCount > 0) {
              console.log('📢 Showing toast for unread notifications:', unreadCount);
              toast({
                title: `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`,
                description: "Check your notifications for updates on your requests and system alerts.",
                variant: 'default',
                duration: 5000,
              });
            } else {
              console.log('✅ No unread notifications found');
            }
          }
        } catch (error) {
          console.error('Error in notification toast logic:', error);
        }

        // Redirect after showing the toast
        setTimeout(() => {
          const targetPath = profile.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard';
          console.log('Redirecting to:', targetPath);
          window.location.href = targetPath;
        }, 2000); // Give more time for toast to show
      }, 1500); // Show toast after 1.5 seconds

    } catch (error: unknown) {
      // Simple cooldown after failure: 5s
      setCooldownUntil(Date.now() + 5000);
      setIsLoading(false);
      setShowSuccessAnimation(false);

      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";

      // Analytics (non‑PII)
      trackAuthEvent('login_failure', { method: 'password', error: errorMessage });

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });

      form.reset({ email: form.getValues('email'), password: '' });
    }
  };

  // Simplified success animation
  const SuccessAnimationComponent = useMemo(() => {
    return showSuccessAnimation ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-10"
        style={{ minHeight: '300px' }}
      >
        <div className="w-24 h-24 border-4 border-green-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <p className="mt-4 text-lg font-semibold text-primary">Login Successful!</p>
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </motion.div>
    ) : null;
  }, [showSuccessAnimation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {showSuccessAnimation ? (
          <Card className="shadow-lg rounded-lg border-border/50">{SuccessAnimationComponent}</Card>
        ) : (
          <AuthCard title="Welcome Back!" description="Enter your credentials to access your dashboard">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <PasswordField
                      id="login-password"
                      value={field.value || ''}
                      onChange={field.onChange}
                      label="Password"
                      placeholder="********"
                    />
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading || (cooldownUntil && Date.now() < cooldownUntil) as boolean}>
                  {isLoading ? 'Logging in...' : (cooldownUntil && Date.now() < cooldownUntil ? 'Please wait…' : 'Login')}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="underline text-muted-foreground hover:text-primary">
                Forgot Password?
              </Link>
            </div>
            <div className="mt-6 text-center text-sm">
              <p>Don&apos;t have an account?</p>
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </div>
          </AuthCard>
        )}
      </motion.div>
    </div>
  );
}
