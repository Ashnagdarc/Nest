"use client";

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { createClient } from '@/lib/supabase/client'; // Import Supabase client creation function
import dynamic from 'next/dynamic';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

// Dynamically import Lottie
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const supabase = createClient(); // Create Supabase client instance

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Check if user is already logged in using Supabase session
  useEffect(() => {
    const checkUser = async () => {
      console.log("LoginPage: Checking for existing Supabase session...");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("LoginPage: Error fetching session:", error);
          return; // Continue to show login page on session fetch error
        }

        if (session?.user) {
          console.log("LoginPage: Active Supabase session found for user:", session.user.id);
          // If already logged in, redirect based on role (fetched from Supabase profiles table)
          redirectToDashboard(session.user.id);
        } else {
          console.log("LoginPage: No active Supabase user session.");
        }
      } catch (e) {
        console.error("LoginPage: Unexpected error during session check:", e);
      }
    };
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed dependencies causing potential loops, check session only once

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

      // Fetch profile as the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Could not fetch user profile.');
      }

      setIsLoading(false);
      setShowSuccessAnimation(true);
      toast({
        title: `Login Successful, ${profile.full_name || 'User'}!`,
        description: `Redirecting to ${profile.role} Dashboard...`,
        variant: 'success',
      });
      await new Promise(resolve => setTimeout(resolve, 1800));
      redirectToDashboard(authData.user.id);
    } catch (error: unknown) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      form.reset({ email: form.getValues('email'), password: '' });
      form.setError('password', { type: 'manual', message: ' ' });
    }
  };

  // --- Helper function for redirection (using Supabase profiles) ---
  const redirectToDashboard = async (userId: string) => {
    console.log("[Redirect Check] redirectToDashboard called for user ID:", userId);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, status') // Only select necessary fields
        .eq('id', userId)
        .single(); // Use single() as profile should exist if user is logged in

      if (error || !profile) {
        console.warn("[Redirect Check Failed] Profile not found or error during redirect check for user ID:", userId, "Error:", error?.message, " Signing out.");
        toast({ title: "Profile Missing", description: "Your user profile could not be found during redirection. Please log in again or contact support.", variant: "destructive" });
        await supabase.auth.signOut().catch(signOutError => console.error("Error signing out:", signOutError));
        router.push('/login');
        return;
      }

      // Check status again during redirect
      if (profile.status !== 'Active') {
        console.warn("[Redirect Check Aborted] Profile inactive during redirect check for user ID:", userId, "Status:", profile.status, " Signing out.");
        await supabase.auth.signOut().catch(signOutError => console.error("Error signing out:", signOutError));
        router.push('/login');
        toast({ title: "Account Inactive", description: `Your account status is ${profile.status}. Please contact support.`, variant: "destructive" });
        return;
      }
      console.log("[Redirect Check] User status verified as Active.");

      console.log("[Redirect Check] Redirecting existing session to", profile.role === 'Admin' ? '/admin/dashboard' : '/user/dashboard');
      if (profile.role === 'Admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/user/dashboard');
      }
    } catch (e: any) {
      console.error("[Redirect Check Failed] Unexpected error during redirection:", e);
      toast({ title: "Error", description: `An unexpected error occurred during redirection: ${e.message}`, variant: "destructive" });
      await supabase.auth.signOut().catch(signOutError => console.error("Error signing out during redirect error:", signOutError));
      router.push('/login');
    }
  };

  // Memoize the DotLottieReact animation component
  const SuccessAnimationComponent = useMemo(() => {
    return showSuccessAnimation ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-10"
        style={{ minHeight: '300px' }}
      >
        <DotLottieReact
          src="https://lottie.host/7b3dbab2-79c3-4502-ad70-d2ac4f2019fd/w0NcTSsIly.lottie"
          loop
          autoplay
          style={{ width: 150, height: 150 }}
        />
        <p className="mt-4 text-lg font-semibold text-primary">Login Successful!</p>
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </motion.div>
    ) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccessAnimation]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg rounded-lg border-border/50">
          {showSuccessAnimation ? SuccessAnimationComponent : (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold text-primary">Welcome Back!</CardTitle>
                <CardDescription>Enter your credentials to access GearFlow</CardDescription>
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
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormMessage />
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
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Button>
                    </motion.div>
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
