"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { formatPhone } from "@/lib/utils/phone";
import { strongPasswordSchema } from "@/lib/auth/password-schema";
import { trackAuthEvent } from "@/lib/analytics";

const phoneRegex = /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/;

const signupSchema = z
    .object({
        fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
        email: z.string().email({ message: "Enter a valid email address." }),
        phone: z
            .string()
            .regex(phoneRegex, { message: "Enter a valid phone number." })
            .optional()
            .or(z.literal("")),
        department: z.string().optional(),
        password: strongPasswordSchema,
        confirmPassword: z.string(),
        profilePicture: z.instanceof(File).optional(),
        terms: z.boolean().refine((value) => value === true, {
            message: "You must accept the terms and conditions.",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        void supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                window.location.href = "/user/dashboard";
            }
        });
    }, [supabase]);

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            fullName: "",
            email: "",
            phone: "",
            department: "",
            password: "",
            confirmPassword: "",
            terms: false,
        },
    });

    const onSubmit = async (data: SignupFormValues) => {
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: data.email.trim().toLowerCase(),
                    password: data.password,
                    fullName: data.fullName.trim(),
                    phone: data.phone,
                    department: data.department,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Failed to create account");
            }

            if (data.profilePicture) {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (session?.access_token) {
                    const formData = new FormData();
                    formData.append("file", data.profilePicture);
                    await fetch("/api/users/avatar", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${session.access_token}` },
                        body: formData,
                    }).catch((error) => {
                        console.error("Avatar upload after signup failed:", error);
                    });
                }
            }

            trackAuthEvent("signup_success", { email: data.email, method: "password" });

            toast({
                title: "Account created",
                description: "Check your email to verify your account, then sign in.",
                duration: 8000,
            });

            router.push("/login");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not create account.";
            trackAuthEvent("signup_failure", { method: "password", error: message });

            if (message.toLowerCase().includes("already")) {
                form.setError("email", { type: "manual", message });
            } else if (message.toLowerCase().includes("password")) {
                form.setError("password", { type: "manual", message });
            } else {
                toast({ title: "Signup failed", description: message, variant: "destructive" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell backHref="/login" backLabel="Back to sign in">
            <AuthCard
                title="Create your account"
                description="Join Nest to request gear, book transport, and stay updated"
                footer={
                    <>
                        Already have an account?{" "}
                        <Link href="/login" className="font-medium text-primary hover:underline">
                            Sign in
                        </Link>
                    </>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full name</FormLabel>
                                    <FormControl>
                                        <Input autoComplete="name" placeholder="Jane Doe" {...field} />
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
                                    <FormLabel>Work email</FormLabel>
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

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone (optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="(555) 555-5555"
                                                value={field.value || ""}
                                                onChange={(event) => field.onChange(formatPhone(event.target.value))}
                                                onBlur={(event) => field.onChange(formatPhone(event.target.value))}
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
                                        <FormLabel>Department (optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Production" {...field} />
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
                                    value={field.value || ""}
                                    onChange={field.onChange}
                                    label="Password"
                                    showChecklist
                                />
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                placeholder="Re-enter your password"
                                                className="pr-10"
                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => setShowConfirmPassword((current) => !current)}
                                            >
                                                {showConfirmPassword ? "Hide" : "Show"}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="profilePicture"
                            render={({ field: { onChange, onBlur, name, ref } }) => (
                                <FormItem>
                                    <FormLabel>Profile photo (optional)</FormLabel>
                                    <FormControl>
                                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                                            <Upload className="h-4 w-4" />
                                            <span>Upload an image</span>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                name={name}
                                                ref={ref}
                                                onBlur={onBlur}
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    onChange(file);
                                                }}
                                            />
                                        </label>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="terms"
                            render={({ field }) => (
                                <FormItem className="flex items-start gap-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="text-sm font-normal">
                                            I accept the terms and conditions for internal Eden Oasis use
                                        </FormLabel>
                                        <FormMessage />
                                    </div>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account…
                                </>
                            ) : (
                                "Create account"
                            )}
                        </Button>
                    </form>
                </Form>
            </AuthCard>
        </AuthShell>
    );
}
