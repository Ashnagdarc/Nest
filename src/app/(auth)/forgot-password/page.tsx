"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthShell } from "@/components/auth/AuthShell";

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const supabase = createClient();

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (data: ForgotPasswordFormValues) => {
        setIsLoading(true);

        try {
            const email = data.email.trim().toLowerCase();
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            setEmailSent(true);
            toast({
                title: "Check your email",
                description:
                    "If an account exists for this address, you will receive password reset instructions shortly.",
                duration: 7000,
            });
            form.reset();
        } catch (error: unknown) {
            toast({
                variant: "destructive",
                title: "Could not send reset email",
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell backHref="/login" backLabel="Back to sign in">
            <AuthCard
                title="Reset your password"
                description="We will email you a secure link to choose a new password"
                footer={
                    <>
                        Remembered your password?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </>
                }
            >
                {emailSent ? (
                    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <MailCheck className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">Reset link sent</p>
                            <p className="text-sm text-muted-foreground">
                                Check your inbox and spam folder. The link expires after a short time.
                            </p>
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                            Send another link
                        </Button>
                    </div>
                ) : (
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
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending…
                                    </>
                                ) : (
                                    "Send reset link"
                                )}
                            </Button>
                        </form>
                    </Form>
                )}
            </AuthCard>
        </AuthShell>
    );
}
