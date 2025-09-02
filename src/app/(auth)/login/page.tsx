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
      // Direct client-side login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        throw new Error(authError.message || 'Login failed.');
      }

      if (!authData.user) {
        throw new Error('Login succeeded but user data missing.');
      }

      // Fetch profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Could not fetch user profile.');
      }

      if (profile.status !== 'Active') {
        await supabase.auth.signOut();
        throw new Error(`Account status is ${profile.status}. Please contact support.`);
      }

      // Show success message
      toast({
        title: `Welcome back, ${profile.full_name || 'User'}!`,
        description: `Redirecting to ${profile.role} Dashboard...`,
        variant: 'default',
      });

      setIsLoading(false);
      setShowSuccessAnimation(true);

      // Direct redirect using window.location
      setTimeout(() => {
        const targetPath = profile.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard';
        console.log('Redirecting to:', targetPath);
        window.location.href = targetPath;
      }, 1500);

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
