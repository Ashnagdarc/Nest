import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mergeNotificationPreferences } from "@/components/settings/types";

const PROFILE_FIELDS =
  "id, email, full_name, avatar_url, phone, department, role, status, notification_preferences, created_at, updated_at";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { data: null, error: profileError.message || "Failed to fetch profile" },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json({ data: null, error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...profile,
        email: profile.email || user.email || null,
        notification_preferences: mergeNotificationPreferences(profile.notification_preferences),
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.full_name === "string") update.full_name = body.full_name.trim();
    if (body.phone === null || typeof body.phone === "string") {
      update.phone = body.phone?.trim() || null;
    }
    if (body.department === null || typeof body.department === "string") {
      update.department = body.department?.trim() || null;
    }
    if (body.avatar_url === null || typeof body.avatar_url === "string") {
      update.avatar_url = body.avatar_url;
    }
    if (body.notification_preferences && typeof body.notification_preferences === "object") {
      update.notification_preferences = body.notification_preferences;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select(PROFILE_FIELDS)
      .single();

    if (profileError) {
      return NextResponse.json(
        { data: null, error: profileError.message || "Failed to update profile" },
        { status: 500 },
      );
    }

    if (typeof body.full_name === "string" || body.avatar_url !== undefined) {
      await supabase.auth.updateUser({
        data: {
          ...(typeof body.full_name === "string" ? { full_name: body.full_name.trim() } : {}),
          ...(body.avatar_url !== undefined ? { avatar_url: body.avatar_url } : {}),
        },
      });
    }

    return NextResponse.json({
      data: {
        ...profile,
        email: profile.email || user.email || null,
        notification_preferences: mergeNotificationPreferences(profile.notification_preferences),
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
