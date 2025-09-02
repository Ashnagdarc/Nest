"use client";

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeLogo } from '@/components/ui/theme-logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const schema = z
    .object({
        password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
        confirmPassword: z.string().min(8, { message: 'Please confirm your password.' }),
    })
    .refine((v) => v.password === v.confirmPassword, {
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
    });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
    const [supabaseReady, setSupabaseReady] = useState(false);
    const supabase = useMemo(() => (supabaseReady ? createClient() : null), [supabaseReady]);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        // Clear any potentially corrupted Supabase auth storage before creating client
        try {
            const keys = Object.keys(window.localStorage);
            for (const k of keys) {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                    window.localStorage.removeItem(k);
                }
            }
        } catch { }
        setSupabaseReady(true);
    }, []);

    useEffect(() => {
        if (!supabase) return;
        // When arriving from the email link, supabase-js will initialize a recovery session.
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setSessionReady(true);
            }
        });
        // Also attempt to fetch session once on mount in case it is already present
        supabase.auth.getSession().then(() => setSessionReady(true)).catch(() => setSessionReady(false));
        return () => { sub.subscription.unsubscribe(); };
    }, [supabase]);

    const form = useForm<Values>({
        resolver: zodResolver(schema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    const onSubmit = async (values: Values) => {
        setIsLoading(true);
        try {
            if (!supabase) throw new Error('Auth not ready. Please reload the page.');
            const { error } = await supabase.auth.updateUser({ password: values.password });
            if (error) throw error;

            toast({
                title: 'Password updated',
                description: 'Your password has been changed successfully. Please log in.',
                variant: 'success',
            });
            // Sign out recovery session and send to login
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update password';
            toast({ title: 'Error', description: message, variant: 'destructive' });
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center">
                        <ThemeLogo size={56} />
                    </div>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>Enter a new password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!sessionReady ? (
                        <div className="text-sm text-muted-foreground">
                            Preparing secure session... If this takes more than a few seconds, open the reset link from your email again.
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
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
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showConfirm ? 'text' : 'password'} placeholder="********" {...field} />
                                                    <button
                                                        type="button"
                                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setShowConfirm((s) => !s)}
                                                    >
                                                        {showConfirm ? 'Hide' : 'Show'}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </form>
                        </Form>
                    )}
                    <div className="mt-6 text-center text-sm">
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


