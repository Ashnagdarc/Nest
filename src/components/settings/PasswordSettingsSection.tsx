"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordSettingsSectionProps {
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
}

export function PasswordSettingsSection({ saving, onSavingChange }: PasswordSettingsSectionProps) {
  const { toast } = useToast();
  const supabase = createClient();

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    onSavingChange(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) {
        if (error.message.includes("requires recent login")) {
          throw new Error("Please log out and log back in before changing your password.");
        }
        throw new Error(error.message);
      }

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Password update failed",
        description: error instanceof Error ? error.message : "Could not update password.",
        variant: "destructive",
      });
    } finally {
      onSavingChange(false);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Security
        </CardTitle>
        <CardDescription>Choose a strong password you do not use elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Min. 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="Retype password" {...field} />
                  </FormControl>
                  <FormDescription>Use at least 8 characters with a mix of letters and numbers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
