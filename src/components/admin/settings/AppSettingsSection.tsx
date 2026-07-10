"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Database, Save, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const appSettingsSchema = z.object({
    autoApproveRequests: z.boolean(),
    maxCheckoutDuration: z.number().min(1, "Must be at least 1 day"),
    requireAdminApproval: z.boolean(),
});

type AppSettingsValues = z.infer<typeof appSettingsSchema>;

type AppSettingRow = {
    key: string;
    value: string | null;
};

async function saveSetting(supabase: ReturnType<typeof createClient>, key: string, value: string | number | boolean) {
    const { error } = await supabase
        .from("app_settings")
        .upsert(
            { key, value: String(value), updated_at: new Date().toISOString() },
            { onConflict: "key" },
        );

    if (error) throw new Error(error.message);
}

export function AppSettingsSection() {
    const { toast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<AppSettingsValues>({
        resolver: zodResolver(appSettingsSchema),
        defaultValues: {
            autoApproveRequests: false,
            maxCheckoutDuration: 7,
            requireAdminApproval: true,
        },
    });

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from("app_settings").select("key, value");
            if (error) throw new Error(error.message);

            const settings: Partial<AppSettingsValues> = {};
            (data as AppSettingRow[] | null)?.forEach((row) => {
                if (row.key === "auto_approve_requests") settings.autoApproveRequests = row.value === "true";
                if (row.key === "max_request_duration_days") {
                    settings.maxCheckoutDuration = parseInt(row.value || "7", 10);
                }
                if (row.key === "require_admin_approval") settings.requireAdminApproval = row.value === "true";
            });

            form.reset({
                autoApproveRequests: settings.autoApproveRequests ?? false,
                maxCheckoutDuration: settings.maxCheckoutDuration ?? 7,
                requireAdminApproval: settings.requireAdminApproval ?? true,
            });
        } catch (error) {
            toast({
                title: "Could not load app settings",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [form, supabase, toast]);

    useEffect(() => {
        void loadSettings();
    }, [loadSettings]);

    const onSubmit = form.handleSubmit(async (values) => {
        setSaving(true);
        try {
            await Promise.all([
                saveSetting(supabase, "auto_approve_requests", values.autoApproveRequests),
                saveSetting(supabase, "max_request_duration_days", values.maxCheckoutDuration),
                saveSetting(supabase, "require_admin_approval", values.requireAdminApproval),
            ]);

            toast({
                title: "App settings saved",
                description: "Gear request rules have been updated.",
            });
        } catch (error) {
            toast({
                title: "Save failed",
                description: error instanceof Error ? error.message : "Could not save settings.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    });

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-primary" />
                        Gear requests
                    </CardTitle>
                    <CardDescription>Control how equipment requests are approved and how long gear can stay out.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading settings…</p>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
                                <FormField
                                    control={form.control}
                                    name="requireAdminApproval"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5 pr-4">
                                                <FormLabel>Require admin approval</FormLabel>
                                                <FormDescription>Every gear request must be reviewed by an admin.</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="autoApproveRequests"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5 pr-4">
                                                <FormLabel>Auto-approve requests</FormLabel>
                                                <FormDescription>Skip manual approval when a request is submitted.</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="maxCheckoutDuration"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Maximum checkout duration (days)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    className="max-w-[120px]"
                                                    value={field.value}
                                                    onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 1)}
                                                />
                                            </FormControl>
                                            <FormDescription>Default limit for how long gear can be checked out.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={saving} className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {saving ? "Saving…" : "Save app settings"}
                                </Button>
                            </form>
                        </Form>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Database tools
                    </CardTitle>
                    <CardDescription>Validate and repair check-in data inconsistencies.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/admin/settings/database">Open database tools</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
