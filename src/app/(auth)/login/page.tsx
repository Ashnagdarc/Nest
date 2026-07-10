"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { AccountBlockedDialog } from "@/components/auth/AccountBlockedDialog";
import { trackAuthEvent } from "@/lib/analytics";
import {
    isAccountActive,
    normalizeAccountStatus,
    parseBlockedAccountFromSearchParams,
    type BlockedAccountStatus,
} from "@/lib/auth/account-status";
import { getDashboardPathForProfile } from "@/lib/auth/role-routing";

const loginSchema = z.object({
    email: z.string().email({ message: "Enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    return (
        <Suspense fallback={<AuthShell><AuthCard title="Welcome back" description="Loading sign in…" /></AuthShell>}>
            <LoginPageContent />
        </Suspense>
    );
}

function LoginPageContent() {
    const searchParams = useSearchParams();
    const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
    const [blockedAccount, setBlockedAccount] = useState<{
        status: BlockedAccountStatus;
        fullName?: string;
    } | null>(null);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const blockedFromUrl = parseBlockedAccountFromSearchParams(searchParams);
        if (blockedFromUrl) {
            setBlockedAccount(blockedFromUrl);
            return;
        }

        void supabase.auth.getUser().then(async ({ data }) => {
            if (!data.user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, status, full_name")
                .eq("id", data.user.id)
                .maybeSingle();

            if (profile && !isAccountActive(profile.status)) {
                await supabase.auth.signOut();
                const blockedStatus = normalizeAccountStatus(profile.status);
                if (blockedStatus) {
                    setBlockedAccount({
                        status: blockedStatus,
                        fullName: profile.full_name || undefined,
                    });
                }
                return;
            }

            if (!profile) return;

            window.location.href = getDashboardPathForProfile(profile);
        });
    }, [searchParams, supabase]);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const showBlockedDialog = (status: string | null | undefined, fullName?: string | null) => {
        const blockedStatus = normalizeAccountStatus(status);
        if (!blockedStatus) return false;

        setBlockedAccount({
            status: blockedStatus,
            fullName: fullName || undefined,
        });
        return true;
    };

    const onSubmit = async (data: LoginFormValues) => {
        if (cooldownUntil && Date.now() < cooldownUntil) {
            toast({
                title: "Please wait",
                description: "Too many attempts. Try again shortly.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const cleanedEmail = data.email.trim().toLowerCase();
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: cleanedEmail,
                password: data.password,
            });

            if (authError) {
                if (authError.message.includes("Invalid login credentials")) {
                    throw new Error("Invalid email or password.");
                }
                if (authError.message.includes("Email not confirmed")) {
                    throw new Error("Verify your email before signing in.");
                }
                throw new Error(authError.message);
            }

            if (!authData.user) {
                throw new Error("Login succeeded but user data is missing.");
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, status, full_name")
                .eq("id", authData.user.id)
                .single();

            if (profileError || !profile) {
                await supabase.auth.signOut();
                throw new Error("Could not load your profile. Contact support if this continues.");
            }

            if (!isAccountActive(profile.status)) {
                await supabase.auth.signOut();
                showBlockedDialog(profile.status, profile.full_name);
                trackAuthEvent("login_failure", {
                    method: "password",
                    error: `account_${normalizeAccountStatus(profile.status)}`,
                });
                form.reset({ email: form.getValues("email"), password: "" });
                return;
            }

            if (authData.session?.access_token) {
                void fetch("/api/notifications/login", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${authData.session.access_token}` },
                }).catch((error) => {
                    console.error("Failed to send login notification:", error);
                });
            }

            trackAuthEvent("login_success", { email: cleanedEmail, method: "password" });

            toast({
                title: `Welcome back${profile.full_name ? `, ${profile.full_name}` : ""}`,
                description: "Redirecting to your dashboard…",
            });

            window.location.href = getDashboardPathForProfile(profile);
        } catch (error: unknown) {
            setCooldownUntil(Date.now() + 5000);
            const errorMessage =
                error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";

            trackAuthEvent("login_failure", { method: "password", error: errorMessage });

            toast({
                title: "Sign in failed",
                description: errorMessage,
                variant: "destructive",
            });

            form.reset({ email: form.getValues("email"), password: "" });
        } finally {
            setIsLoading(false);
        }
    };

    const isCoolingDown = Boolean(cooldownUntil && Date.now() < cooldownUntil);

    return (
        <AuthShell>
            <AuthCard
                title="Welcome back"
                description="Sign in to access your Nest dashboard"
                footer={
                    <>
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-medium text-primary hover:underline">
                            Create one
                        </Link>
                    </>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@edenoasisrealty.com"
                                            {...field}
                                        />
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
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    label="Password"
                                    placeholder="Enter your password"
                                    showChecklist={false}
                                />
                            )}
                        />
                        <div className="flex justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-muted-foreground transition-colors hover:text-primary"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || isCoolingDown}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in…
                                </>
                            ) : isCoolingDown ? (
                                "Please wait…"
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>
                </Form>
            </AuthCard>

            <AccountBlockedDialog
                open={Boolean(blockedAccount)}
                status={blockedAccount?.status ?? 'suspended'}
                fullName={blockedAccount?.fullName}
                onClose={() => setBlockedAccount(null)}
            />
        </AuthShell>
    );
}
