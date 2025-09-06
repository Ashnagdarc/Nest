// Login page for user authentication. Handles login form, validation, and redirects based on user role.
"use client";

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ThemeLogo } from '@/components/ui/theme-logo';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  // Removed unused router
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = useMemo(() => createClient(), []);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
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
      setIsLoading(false);
      setShowSuccessAnimation(false);

      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";

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
        <Card className="shadow-lg rounded-lg border-border/50">
          {showSuccessAnimation ? SuccessAnimationComponent : (
            <>
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-between items-start">
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                  </Link>
                  <div className="flex-1"></div>
                </div>
                <div className="flex justify-center">
                  <ThemeLogo
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold text-primary">Welcome Back!</CardTitle>
                  <CardDescription>Enter your credentials to access your dashboard</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
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
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type={showPassword ? 'text' : 'password'} placeholder="********" {...field} />
                              <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword((s) => !s)}
                              >
                                {showPassword ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Logging in...' : 'Login'}
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
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
