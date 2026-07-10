"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { passwordWithConfirmSchema } from "@/lib/auth/password-schema";

type ResetPasswordValues = {
    password: string;
    confirmPassword: string;
};

export default function ResetPasswordPage() {
    const [supabaseReady, setSupabaseReady] = useState(false);
    const supabase = useMemo(() => (supabaseReady ? createClient() : null), [supabaseReady]);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    useEffect(() => {
        setSupabaseReady(true);
    }, []);

    useEffect(() => {
        if (!supabase) return;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
                setSessionReady(true);
                setSessionError(null);
            }
        });

        void supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
                setSessionError(error.message);
                return;
            }
            if (data.session) {
                setSessionReady(true);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(passwordWithConfirmSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const onSubmit = async (values: ResetPasswordValues) => {
        setIsLoading(true);

        try {
            if (!supabase) {
                throw new Error("Auth is not ready. Reload the page and open the email link again.");
            }

            const { error } = await supabase.auth.updateUser({ password: values.password });
            if (error) throw error;

            toast({
                title: "Password updated",
                description: "Your password has been changed. Sign in with your new credentials.",
            });

            await supabase.auth.signOut();
            window.location.href = "/login";
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update password";
            toast({ title: "Could not update password", description: message, variant: "destructive" });
            setIsLoading(false);
        }
    };

    return (
        <AuthShell backHref="/login" backLabel="Back to sign in">
            <AuthCard
                title="Choose a new password"
                description="Use a strong password you have not used elsewhere"
                footer={
                    <>
                        Ready to continue?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </>
                }
            >
                {!sessionReady ? (
                    <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        <p>Preparing your secure reset session…</p>
                        <p>
                            If this page does not load the form, open the reset link from your email again. Links
                            expire after a short time.
                        </p>
                        {sessionError ? <p className="text-destructive">{sessionError}</p> : null}
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <PasswordField
                                        id="reset-password"
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        label="New password"
                                        showChecklist
                                    />
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <PasswordField
                                        id="reset-confirm-password"
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        label="Confirm new password"
                                        placeholder="Re-enter your password"
                                        showChecklist={false}
                                    />
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating…
                                    </>
                                ) : (
                                    "Update password"
                                )}
                            </Button>
                        </form>
                    </Form>
                )}
            </AuthCard>
        </AuthShell>
    );
}
