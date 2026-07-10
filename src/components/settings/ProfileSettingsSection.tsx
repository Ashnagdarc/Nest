"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ImageCropperModal } from "@/components/ui/ImageCropperModal";
import { useToast } from "@/hooks/use-toast";
import { isFile, isFileList } from "@/lib/utils/browser-safe";
import type { UserProfileSettings } from "./types";

const phoneRegex = /^([+]?[\s0-9]+)?(\d{3}|[(]\d{3}[)])?([-]?[\s]?)(\d{3})([-]?[\s]?)(\d{4})$/;

const profileSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, { message: "Invalid phone number format." }).optional().or(z.literal("")),
  department: z.string().optional(),
  profilePicture: z.any().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileSettingsSectionProps {
  profile: UserProfileSettings;
  saving: boolean;
  onSave: (values: ProfileFormValues, avatarFile?: File) => Promise<void>;
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ProfileSettingsSection({ profile, saving, onSave }: ProfileSettingsSectionProps) {
  const { toast } = useToast();
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      department: profile.department || "",
      profilePicture: undefined,
    },
  });

  useEffect(() => {
    form.reset({
      fullName: profile.full_name || "",
      email: profile.email || "",
      phone: profile.phone || "",
      department: profile.department || "",
      profilePicture: undefined,
    });
    setPendingAvatarUrl(null);
  }, [profile, form]);

  const avatarPreview = pendingAvatarUrl || profile.avatar_url || undefined;

  const roleLabel = useMemo(() => {
    if (!profile.role) return "User";
    return profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase();
  }, [profile.role]);

  const handleSubmit = form.handleSubmit(async (values) => {
    let file: File | undefined;
    if (values.profilePicture) {
      if (isFileList(values.profilePicture)) file = values.profilePicture[0];
      else if (isFile(values.profilePicture)) file = values.profilePicture;
    }
    await onSave(values, file);
    form.reset({ ...values, profilePicture: undefined });
    setPendingAvatarUrl(null);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name, contact details, and profile photo.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                <AvatarImage src={avatarPreview} alt={profile.full_name || "Profile"} />
                <AvatarFallback className="text-lg">{getInitials(profile.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{profile.full_name || "Unnamed user"}</p>
                  <Badge variant="secondary">{roleLabel}</Badge>
                  {profile.status && (
                    <Badge variant={profile.status === "Active" ? "default" : "outline"}>
                      {profile.status}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({ field: { value: _value, onChange: _onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...fieldProps}
                          type="file"
                          accept="image/*"
                          className="max-w-xs cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Profile photos must be 5MB or smaller.",
                                variant: "destructive",
                              });
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setRawImage(ev.target?.result as string);
                              setShowCropper(true);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </FormControl>
                      <FormDescription>JPG, PNG, or WebP · max 5MB</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {showCropper && (
              <ImageCropperModal
                open={showCropper}
                imageSrc={rawImage}
                onClose={() => setShowCropper(false)}
                onCropComplete={(croppedBlob) => {
                  const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
                  form.setValue("profilePicture", croppedFile);
                  setPendingAvatarUrl(URL.createObjectURL(croppedFile));
                  setShowCropper(false);
                }}
                aspect={1}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormDescription>Contact an admin to change your email.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 555 123 4567" {...field} />
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
                    <FormLabel>Department / team (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Camera, Production" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
